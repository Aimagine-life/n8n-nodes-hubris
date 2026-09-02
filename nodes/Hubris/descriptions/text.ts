import type { INodeProperties } from 'n8n-workflow';
import { modelProperty } from './shared';

const show = (operation: string) => ({ show: { resource: ['text'], operation: [operation] } });

export const textOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['text'] } },
	options: [
		{
			name: 'Chat',
			value: 'chat',
			action: 'Send a chat completion request',
			description: 'Chat Completions API (/chat/completions)',
		},
		{
			name: 'Response',
			value: 'responses',
			action: 'Create a response',
			description: 'Responses API (/responses)',
		},
	],
	default: 'chat',
};

const reasoningEffortOption: INodeProperties = {
	displayName: 'Reasoning Effort',
	name: 'reasoningEffort',
	type: 'options',
	default: 'default',
	options: [
		{ name: 'Default', value: 'default' },
		{ name: 'Extra High', value: 'xhigh' },
		{ name: 'High', value: 'high' },
		{ name: 'Low', value: 'low' },
		{ name: 'Max', value: 'max' },
		{ name: 'Medium', value: 'medium' },
		{ name: 'Minimal', value: 'minimal' },
		{ name: 'None', value: 'none' },
	],
	description: 'How much the model should think before answering (reasoning models only)',
};

const timeoutOption: INodeProperties = {
	displayName: 'Timeout (Seconds)',
	name: 'timeout',
	type: 'number',
	default: 300,
	typeOptions: { minValue: 1 },
	description: 'How long to wait for the model before failing',
};

const toolsOption: INodeProperties = {
	displayName: 'Tools (JSON)',
	name: 'toolsJson',
	type: 'json',
	default: '',
	description:
		'Array of tool definitions in OpenAI format. Tool calls are returned as-is, without executing them.',
};

const jsonSchemaOption: INodeProperties = {
	displayName: 'JSON Schema',
	name: 'jsonSchema',
	type: 'json',
	default: '',
	description: 'JSON Schema the answer must follow. The parsed answer is added to the output.',
};

export const textChatFields: INodeProperties[] = [
	modelProperty('searchTextModels', 'anthropic/claude-sonnet-5', show('chat')),
	{
		displayName: 'Prompt Mode',
		name: 'promptMode',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Simple', value: 'simple', description: 'System prompt plus a user prompt' },
			{
				name: 'Messages (JSON)',
				value: 'messages',
				description: 'Full messages array in OpenAI format',
			},
		],
		default: 'simple',
		displayOptions: show('chat'),
	},
	{
		displayName: 'System Prompt',
		name: 'systemPrompt',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		displayOptions: { show: { resource: ['text'], operation: ['chat'], promptMode: ['simple'] } },
	},
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		required: true,
		displayOptions: { show: { resource: ['text'], operation: ['chat'], promptMode: ['simple'] } },
	},
	{
		displayName: 'Messages',
		name: 'messagesJson',
		type: 'json',
		default: '[{"role":"user","content":"Hello"}]',
		description: 'Array of messages in OpenAI Chat Completions format',
		displayOptions: {
			show: { resource: ['text'], operation: ['chat'], promptMode: ['messages'] },
		},
	},
	{
		displayName: 'Simplify Output',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description:
			'Whether to return only the answer text, usage and cost instead of the raw API response',
		displayOptions: show('chat'),
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show('chat'),
		options: [
			{
				displayName: 'Frequency Penalty',
				name: 'frequency_penalty',
				type: 'number',
				default: 0,
				typeOptions: { minValue: -2, maxValue: 2, numberPrecision: 2 },
				description: 'Penalizes tokens by how often they already appeared',
			},
			{
				displayName: 'Image Detail',
				name: 'imageDetail',
				type: 'options',
				default: 'auto',
				options: [
					{ name: 'Auto', value: 'auto' },
					{ name: 'High', value: 'high' },
					{ name: 'Low', value: 'low' },
				],
				description: 'Resolution the model uses to look at the input image',
			},
			{
				displayName: 'Image Input Field',
				name: 'imageBinaryProperty',
				type: 'string',
				default: '',
				description:
					'Name of the input binary field with an image to send along with the prompt (vision models)',
			},
			jsonSchemaOption,
			{
				displayName: 'Max Tokens',
				name: 'max_tokens',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0 },
				description: 'Maximum number of tokens to generate. 0 keeps the model default.',
			},
			{
				displayName: 'Presence Penalty',
				name: 'presence_penalty',
				type: 'number',
				default: 0,
				typeOptions: { minValue: -2, maxValue: 2, numberPrecision: 2 },
				description: 'Penalizes tokens that already appeared at least once',
			},
			reasoningEffortOption,
			{
				displayName: 'Response Format',
				name: 'responseFormat',
				type: 'options',
				default: 'text',
				options: [
					{ name: 'JSON Object', value: 'json_object' },
					{ name: 'JSON Schema', value: 'json_schema' },
					{ name: 'Text', value: 'text' },
				],
				description: 'Format of the answer. JSON answers are parsed and added to the output.',
			},
			{
				displayName: 'Stop Sequences',
				name: 'stop',
				type: 'string',
				default: '',
				description: 'Comma-separated list of sequences where the model stops generating',
			},
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				default: 1,
				typeOptions: { minValue: 0, maxValue: 2, numberPrecision: 2 },
				description: 'Sampling temperature. Sent only when set.',
			},
			timeoutOption,
			toolsOption,
			{
				displayName: 'Top P',
				name: 'top_p',
				type: 'number',
				default: 1,
				typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
				description: 'Nucleus sampling threshold. Sent only when set.',
			},
		],
	},
];

export const textResponsesFields: INodeProperties[] = [
	modelProperty('searchTextModels', 'openai/gpt-5.4-mini', show('responses')),
	{
		displayName: 'Input',
		name: 'input',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		required: true,
		description: 'Plain text, or a JSON array of input items in Responses API format',
		displayOptions: show('responses'),
	},
	{
		displayName: 'Instructions',
		name: 'instructions',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		description: 'System-level instructions for the model',
		displayOptions: show('responses'),
	},
	{
		displayName: 'Simplify Output',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description:
			'Whether to return only the output text, usage and cost instead of the raw API response',
		displayOptions: show('responses'),
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show('responses'),
		options: [
			jsonSchemaOption,
			{
				displayName: 'Max Output Tokens',
				name: 'max_output_tokens',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0 },
				description: 'Maximum number of tokens to generate. 0 keeps the model default.',
			},
			reasoningEffortOption,
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				default: 1,
				typeOptions: { minValue: 0, maxValue: 2, numberPrecision: 2 },
				description: 'Sampling temperature. Sent only when set.',
			},
			timeoutOption,
			toolsOption,
		],
	},
];
