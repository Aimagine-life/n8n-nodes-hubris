import { describe, expect, it } from 'vitest';
import {
	buildChatMessages,
	parseMessagesJson,
	parseModelJson,
	responsesOutputText,
} from '../nodes/Hubris/operations/text';

describe('buildChatMessages', () => {
	it('builds system + user from simple mode', () => {
		expect(buildChatMessages({ systemPrompt: 'Be brief', prompt: 'Hi' })).toEqual([
			{ role: 'system', content: 'Be brief' },
			{ role: 'user', content: 'Hi' },
		]);
	});

	it('omits empty system prompt', () => {
		expect(buildChatMessages({ prompt: 'Hi' })).toEqual([{ role: 'user', content: 'Hi' }]);
	});

	it('attaches an image to the user message', () => {
		const msgs = buildChatMessages({
			prompt: 'What is it?',
			imageDataUrl: 'data:image/png;base64,AA==',
			imageDetail: 'low',
		});
		expect(msgs[0]).toEqual({
			role: 'user',
			content: [
				{ type: 'text', text: 'What is it?' },
				{ type: 'image_url', image_url: { url: 'data:image/png;base64,AA==', detail: 'low' } },
			],
		});
	});

});

describe('parseMessagesJson', () => {
	it('parses messages JSON', () => {
		expect(parseMessagesJson('[{"role":"user","content":"x"}]')).toEqual({
			messages: [{ role: 'user', content: 'x' }],
		});
	});

	it('rejects non-array messages JSON', () => {
		expect(parseMessagesJson('{}').error).toMatch(/array/);
	});

	it('rejects invalid JSON', () => {
		expect(parseMessagesJson('nope').error).toMatch(/valid JSON/);
	});
});

describe('responsesOutputText', () => {
	it('joins output_text parts of message items', () => {
		const output = [
			{ type: 'reasoning', summary: [] },
			{
				type: 'message',
				content: [
					{ type: 'output_text', text: 'Hello, ' },
					{ type: 'output_text', text: 'world' },
				],
			},
		];
		expect(responsesOutputText(output)).toBe('Hello, world');
	});

	it('returns empty string for missing output', () => {
		expect(responsesOutputText(undefined)).toBe('');
	});
});

describe('parseModelJson', () => {
	it('parses plain JSON', () => {
		expect(parseModelJson('{"a":1}')).toEqual({ a: 1 });
	});

	it('strips a json code fence', () => {
		expect(parseModelJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
	});
});
