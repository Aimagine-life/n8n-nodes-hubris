import { describe, expect, it } from 'vitest';
import { toModelSearchItems } from '../nodes/Hubris/lib/models';

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
