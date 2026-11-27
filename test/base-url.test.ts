import { describe, expect, it } from 'vitest';
import {
	BASE_URL_CURRENT,
	BASE_URL_CUSTOM,
	BASE_URL_LEGACY,
	resolveBaseUrl,
	trimBaseUrl,
} from '../nodes/Hubris/lib/base-url';
import { HubrisApi } from '../credentials/HubrisApi.credentials';

describe('resolveBaseUrl', () => {
	it('defaults to the current endpoint when nothing is saved', () => {
		expect(resolveBaseUrl({})).toBe('https://api.hubris.pro/v1');
	});

	it('keeps the legacy endpoint saved by versions before 0.2.0', () => {
		expect(resolveBaseUrl({ baseUrl: 'https://api.hubris.pw/v1' })).toBe(BASE_URL_LEGACY);
	});

	it('keeps a free-form URL saved by versions before 0.2.0', () => {
		expect(resolveBaseUrl({ baseUrl: 'https://proxy.example.com/v1/' })).toBe(
			'https://proxy.example.com/v1',
		);
	});

	it('uses the custom field when Custom is selected', () => {
		expect(
			resolveBaseUrl({
				baseUrl: BASE_URL_CUSTOM,
				customBaseUrl: ' https://stage.example.com/v1/ ',
			}),
		).toBe('https://stage.example.com/v1');
	});

	it('falls back to the current endpoint when Custom is selected but empty', () => {
		expect(resolveBaseUrl({ baseUrl: BASE_URL_CUSTOM, customBaseUrl: '' })).toBe(BASE_URL_CURRENT);
	});
});

describe('trimBaseUrl', () => {
	it('strips trailing slashes', () => {
		expect(trimBaseUrl('https://api.hubris.pw/v1/')).toBe('https://api.hubris.pw/v1');
	});
});

describe('HubrisApi credential', () => {
	const credential = new HubrisApi();
	const baseUrl = credential.properties.find((p) => p.name === 'baseUrl');

	it('offers the current endpoint first and as default, legacy second', () => {
		expect(baseUrl?.type).toBe('options');
		expect(baseUrl?.default).toBe(BASE_URL_CURRENT);
		const values = (baseUrl?.options as Array<{ value: string }>).map((o) => o.value);
		expect(values).toEqual([BASE_URL_CURRENT, BASE_URL_LEGACY, BASE_URL_CUSTOM]);
	});

	it('shows the custom URL field only for Custom', () => {
		const custom = credential.properties.find((p) => p.name === 'customBaseUrl');
		expect(custom?.displayOptions?.show?.baseUrl).toEqual([BASE_URL_CUSTOM]);
	});

	it('tests the connection against the resolved URL', () => {
		expect(credential.test.request.baseURL).toBe(
			"={{$credentials.baseUrl === 'custom' ? $credentials.customBaseUrl : $credentials.baseUrl}}",
		);
	});
});
