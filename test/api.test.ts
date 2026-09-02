import { describe, expect, it } from 'vitest';
import { NodeApiError } from 'n8n-workflow';
import { toApiError, trimBaseUrl } from '../nodes/Hubris/lib/api';

const node = {
	name: 'Hubris',
	type: 'hubris',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
} as never;

describe('toApiError', () => {
	it('uses server message and code', () => {
		const err = toApiError(node, 402, {
			error: {
				message: 'Insufficient balance',
				type: 'insufficient_balance',
				code: 'insufficient_balance',
			},
		});
		expect(err).toBeInstanceOf(NodeApiError);
		expect(err.message).toBe('Insufficient balance');
		expect(err.httpCode).toBe('402');
	});

	it('falls back to a generic message when body is not an API error', () => {
		const err = toApiError(node, 502, 'bad gateway');
		expect(err.message).toBe('Hubris API request failed (HTTP 502)');
	});
});

describe('trimBaseUrl', () => {
	it('strips trailing slashes', () => {
		expect(trimBaseUrl('https://api.hubris.pw/v1/')).toBe('https://api.hubris.pw/v1');
	});
});
