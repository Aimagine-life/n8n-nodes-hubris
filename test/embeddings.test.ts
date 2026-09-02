import { describe, expect, it } from 'vitest';
import { parseEmbeddingInput } from '../nodes/Hubris/operations/embeddings';

describe('parseEmbeddingInput', () => {
	it('returns plain text as-is', () => {
		expect(parseEmbeddingInput('plain text')).toEqual({ input: 'plain text' });
	});

	it('parses a JSON array of strings as a batch', () => {
		expect(parseEmbeddingInput('["a", "b"]')).toEqual({ input: ['a', 'b'] });
	});

	it('rejects arrays with non-string items', () => {
		expect(parseEmbeddingInput('[1, "b"]').error).toMatch(/strings/);
	});

	it('treats text that merely starts with a bracket as plain text', () => {
		expect(parseEmbeddingInput('[not json')).toEqual({ input: '[not json' });
	});
});
