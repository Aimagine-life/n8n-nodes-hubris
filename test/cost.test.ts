import { describe, expect, it } from 'vitest';
import { withCostRub } from '../nodes/Hubris/lib/cost';

describe('withCostRub', () => {
	it('adds cost_rub from usage.cost kopecks', () => {
		expect(withCostRub({ usage: { cost: 1234 } })).toEqual({
			usage: { cost: 1234 },
			cost_rub: 12.34,
		});
	});

	it('leaves json untouched without usage.cost', () => {
		expect(withCostRub({ usage: { prompt_tokens: 1 } })).toEqual({ usage: { prompt_tokens: 1 } });
	});
});
