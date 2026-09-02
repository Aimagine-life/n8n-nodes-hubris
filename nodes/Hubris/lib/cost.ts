import type { IDataObject } from 'n8n-workflow';

/** Hubris returns `usage.cost` in kopecks (integer). Expose rubles for convenience. */
export function withCostRub(json: IDataObject): IDataObject {
	const usage = json.usage as IDataObject | undefined;
	const cost = usage?.cost;
	if (typeof cost === 'number' && Number.isFinite(cost)) {
		return { ...json, cost_rub: cost / 100 };
	}
	return json;
}
