import { describe, expect, it } from 'vitest';
import { matchesModality, toModelSearchItems, voicesToOptions } from '../nodes/Hubris/lib/models';

describe('voicesToOptions', () => {
	it('maps voice ids to options', () => {
		expect(voicesToOptions(['loongjohn', 'longanhuan_v3.6'])).toEqual([
			{ name: 'loongjohn', value: 'loongjohn' },
			{ name: 'longanhuan_v3.6', value: 'longanhuan_v3.6' },
		]);
	});

	it('returns an empty list for models without voices', () => {
		expect(voicesToOptions(undefined)).toEqual([]);
		expect(voicesToOptions([])).toEqual([]);
	});
});

describe('matchesModality', () => {
	it('keeps text models and drops speech and embedding rows from the text list', () => {
		expect(matchesModality({ id: 'a', output_modalities: ['text'] }, 'text')).toBe(true);
		expect(matchesModality({ id: 'b', output_modalities: ['image', 'text'] }, 'text')).toBe(true);
		expect(matchesModality({ id: 'c', output_modalities: ['speech'] }, 'text')).toBe(false);
		expect(matchesModality({ id: 'd', output_modalities: ['embeddings'] }, 'text')).toBe(false);
	});

	it('keeps only image-only rows for the image list', () => {
		expect(matchesModality({ id: 'a', output_modalities: ['image'] }, 'image')).toBe(true);
		expect(matchesModality({ id: 'b', output_modalities: ['image', 'text'] }, 'image')).toBe(false);
	});

	it('describes per-unit pricing', () => {
		const items = toModelSearchItems([
			{
				id: 'x/flux',
				display_name: 'Flux',
				output_modalities: ['image'],
				pricing: { unit: 'image', per_unit: [{ sku: 'output_image', price_rub: 3.8, unit: 'megapixel' }] },
			},
		]);
		expect(items[0].description).toBe('from 3.8 ₽/megapixel');
	});
});

const models = [
	{
		id: 'anthropic/claude-sonnet-5',
		display_name: 'Claude Sonnet 5',
		output_modalities: ['text'],
		pricing: { unit: 'token', input_rub_per_million: 273, output_rub_per_million: 1365 },
	},
	{
		id: 'openai/gpt-4o-mini',
		display_name: 'GPT-4o mini',
		output_modalities: ['text'],
		pricing: { unit: 'token', input_rub_per_million: 13.6, output_rub_per_million: 54.7 },
	},
	{
		id: 'microsoft/mai-voice-2-flash',
		display_name: 'MAI Voice 2 Flash',
		output_modalities: ['speech'],
		pricing: { unit: 'character', input_rub_per_million: 0, output_rub_per_million: 0 },
	},
];

describe('toModelSearchItems', () => {
	it('filters by name or id, case-insensitive', () => {
		const items = toModelSearchItems(models, 'GPT');
		expect(items.map((m) => m.value)).toEqual(['openai/gpt-4o-mini']);
	});

	it('describes token pricing in rubles per million', () => {
		const items = toModelSearchItems(models);
		expect(items[0]).toMatchObject({ name: 'Claude Sonnet 5', value: 'anthropic/claude-sonnet-5' });
		expect(items[0].description).toBe('273 ₽/M in · 1365 ₽/M out');
	});

	it('sorts by display name', () => {
		expect(toModelSearchItems(models).map((m) => m.name)).toEqual([
			'Claude Sonnet 5',
			'GPT-4o mini',
			'MAI Voice 2 Flash',
		]);
	});
});
