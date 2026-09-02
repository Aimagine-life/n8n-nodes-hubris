import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { hubrisRequest } from '../lib/api';
import { dataUrlFromBinary } from '../lib/binary';
import { withCostRub } from '../lib/cost';
import { getModelId } from '../lib/models';
import type { OperationHandler } from './types';

export type ChatMessage = { role: string; content: unknown };

export interface BuildMessagesParams {
	systemPrompt?: string;
	prompt?: string;
	imageDataUrl?: string;
	imageDetail?: string;
}

/** Validate the "Messages (JSON)" parameter. Returns an error text instead of throwing. */
export function parseMessagesJson(
	raw: string,
): { messages: ChatMessage[]; error?: undefined } | { messages?: undefined; error: string } {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return { error: 'Messages must be valid JSON' };
	}
	if (!Array.isArray(parsed)) return { error: 'Messages must be a JSON array' };
	return { messages: parsed as ChatMessage[] };
}

export function buildChatMessages(p: BuildMessagesParams): ChatMessage[] {
	const messages: ChatMessage[] = [];
	if (p.systemPrompt?.trim()) messages.push({ role: 'system', content: p.systemPrompt });
	if (p.imageDataUrl) {
		messages.push({
			role: 'user',
			content: [
				{ type: 'text', text: p.prompt ?? '' },
				{ type: 'image_url', image_url: { url: p.imageDataUrl, detail: p.imageDetail ?? 'auto' } },
			],
		});
	} else {
		messages.push({ role: 'user', content: p.prompt ?? '' });
	}
	return messages;
}

/** Extract the concatenated text of a Responses API `output` array. */
export function responsesOutputText(output: unknown): string {
	if (!Array.isArray(output)) return '';
	return (output as IDataObject[])
		.filter((o) => o.type === 'message')
		.flatMap((o) => (Array.isArray(o.content) ? (o.content as IDataObject[]) : []))
		.filter((c) => c.type === 'output_text')
		.map((c) => String(c.text ?? ''))
		.join('');
}

/** Parse model output as JSON, tolerating a ```json fence around it. */
export function parseModelJson(text: string): unknown {
	const trimmed = text
		.trim()
		.replace(/^```(?:json)?\s*/i, '')
		.replace(/\s*```$/, '');
	return JSON.parse(trimmed);
}

function parseJsonOption(
	ctx: IExecuteFunctions,
	itemIndex: number,
	raw: unknown,
	label: string,
): unknown {
	if (raw === undefined || raw === null || raw === '') return undefined;
	if (typeof raw !== 'string') return raw;
	try {
		return JSON.parse(raw);
	} catch {
		throw new NodeOperationError(ctx.getNode(), `${label} must be valid JSON`, { itemIndex });
	}
}

function attachParsedJson(
	ctx: IExecuteFunctions,
	itemIndex: number,
	json: IDataObject,
	text: string,
): void {
	try {
		json.json = parseModelJson(text) as IDataObject;
	} catch {
		throw new NodeOperationError(ctx.getNode(), 'Model returned invalid JSON', {
			itemIndex,
			description: text.slice(0, 500),
		});
	}
}

export const chat: OperationHandler = async (ctx, i) => {
	const model = getModelId(ctx, i);
	const mode = ctx.getNodeParameter('promptMode', i) as 'simple' | 'messages';
	const simplify = ctx.getNodeParameter('simplify', i) as boolean;
	const options = ctx.getNodeParameter('options', i, {}) as IDataObject;

	let imageDataUrl: string | undefined;
	const imageProp = options.imageBinaryProperty as string | undefined;
	if (imageProp) {
		const binary = ctx.helpers.assertBinaryData(i, imageProp);
		const buffer = await ctx.helpers.getBinaryDataBuffer(i, imageProp);
		imageDataUrl = dataUrlFromBinary(buffer, binary.mimeType || 'image/png');
	}

	let messages: ChatMessage[];
	if (mode === 'messages') {
		const parsed = parseMessagesJson(ctx.getNodeParameter('messagesJson', i, '') as string);
		if (parsed.error) throw new NodeOperationError(ctx.getNode(), parsed.error, { itemIndex: i });
		messages = parsed.messages;
	} else {
		messages = buildChatMessages({
			systemPrompt: ctx.getNodeParameter('systemPrompt', i, '') as string,
			prompt: ctx.getNodeParameter('prompt', i, '') as string,
			imageDataUrl,
			imageDetail: options.imageDetail as string | undefined,
		});
	}

	const body: IDataObject = { model, messages, stream: false };
	for (const key of ['temperature', 'top_p', 'frequency_penalty', 'presence_penalty'] as const) {
		if (typeof options[key] === 'number') body[key] = options[key];
	}
	if (typeof options.max_tokens === 'number' && options.max_tokens > 0) {
		body.max_tokens = options.max_tokens;
	}
	if (options.reasoningEffort && options.reasoningEffort !== 'default') {
		body.reasoning_effort = options.reasoningEffort;
	}
	if (typeof options.stop === 'string' && options.stop.trim()) {
		body.stop = options.stop
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
	}
	const tools = parseJsonOption(ctx, i, options.toolsJson, 'Tools');
	if (tools) body.tools = tools as IDataObject[];
	const responseFormat = (options.responseFormat as string) ?? 'text';
	if (responseFormat === 'json_object') body.response_format = { type: 'json_object' };
	if (responseFormat === 'json_schema') {
		const schema = parseJsonOption(ctx, i, options.jsonSchema, 'JSON Schema');
		if (!schema) {
			throw new NodeOperationError(
				ctx.getNode(),
				'JSON Schema is required for Response Format "JSON Schema"',
				{ itemIndex: i },
			);
		}
		body.response_format = {
			type: 'json_schema',
			json_schema: { name: 'answer', strict: true, schema },
		};
	}

	const timeout = ((options.timeout as number) || 300) * 1000;
	const response = await hubrisRequest(ctx, {
		method: 'POST',
		path: '/chat/completions',
		body,
		timeout,
	});

	const choice = ((response.choices as IDataObject[] | undefined) ?? [])[0] ?? {};
	const message = (choice.message as IDataObject | undefined) ?? {};
	const text = typeof message.content === 'string' ? message.content : '';

	let json: IDataObject;
	if (simplify) {
		json = {
			text,
			finish_reason: choice.finish_reason ?? null,
			model: response.model,
			usage: response.usage,
		};
		if (message.tool_calls) json.tool_calls = message.tool_calls;
		if (message.reasoning) json.reasoning = message.reasoning;
	} else {
		json = { ...response };
	}
	if (responseFormat !== 'text') attachParsedJson(ctx, i, json, text);

	const item: INodeExecutionData = { json: withCostRub(json), pairedItem: { item: i } };
	const images = message.images as Array<{ image_url?: { url?: string } }> | undefined;
	if (Array.isArray(images) && images.length) {
		item.binary = {};
		for (const [idx, img] of images.entries()) {
			const match = /^data:([^;]+);base64,(.+)$/.exec(img.image_url?.url ?? '');
			if (!match) continue;
			item.binary[`image_${idx}`] = await ctx.helpers.prepareBinaryData(
				Buffer.from(match[2], 'base64'),
				`image_${idx}.png`,
				match[1],
			);
		}
	}
	return [item];
};

export const responses: OperationHandler = async (ctx, i) => {
	const model = getModelId(ctx, i);
	const rawInput = ctx.getNodeParameter('input', i) as string;
	const instructions = ctx.getNodeParameter('instructions', i, '') as string;
	const simplify = ctx.getNodeParameter('simplify', i) as boolean;
	const options = ctx.getNodeParameter('options', i, {}) as IDataObject;

	let input: unknown = rawInput;
	const trimmed = rawInput.trim();
	if (trimmed.startsWith('[')) {
		try {
			input = JSON.parse(trimmed);
		} catch {
			// not JSON — send as plain text
		}
	}

	const body: IDataObject = { model, input: input as IDataObject, stream: false };
	if (instructions.trim()) body.instructions = instructions;
	if (typeof options.temperature === 'number') body.temperature = options.temperature;
	if (typeof options.max_output_tokens === 'number' && options.max_output_tokens > 0) {
		body.max_output_tokens = options.max_output_tokens;
	}
	if (options.reasoningEffort && options.reasoningEffort !== 'default') {
		body.reasoning = { effort: options.reasoningEffort };
	}
	const tools = parseJsonOption(ctx, i, options.toolsJson, 'Tools');
	if (tools) body.tools = tools as IDataObject[];
	const schema = parseJsonOption(ctx, i, options.jsonSchema, 'JSON Schema');
	if (schema) {
		body.text = { format: { type: 'json_schema', name: 'answer', strict: true, schema } };
	}

	const timeout = ((options.timeout as number) || 300) * 1000;
	const response = await hubrisRequest(ctx, { method: 'POST', path: '/responses', body, timeout });
	const outputText = responsesOutputText(response.output);

	const json: IDataObject = simplify
		? {
				output_text: outputText,
				id: response.id,
				model: response.model,
				usage: response.usage,
				output: response.output,
			}
		: { ...response, output_text: outputText };
	if (schema) attachParsedJson(ctx, i, json, outputText);
	return [{ json: withCostRub(json), pairedItem: { item: i } }];
};
