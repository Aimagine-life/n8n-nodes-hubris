import type { IDataObject } from 'n8n-workflow';
import { hubrisRequest } from '../lib/api';
import type { OperationHandler } from './types';

function rub(value: unknown): number | null {
	return typeof value === 'number' ? value / 100 : null;
}

export const getKey: OperationHandler = async (ctx, i) => {
	const response = await hubrisRequest<{ data: IDataObject }>(ctx, {
		method: 'GET',
		path: '/key',
	});
	const d = response.data ?? {};
	return [
		{
			json: {
				...d,
				balance_rub: rub(d.balance_kopecks),
				limit_rub: rub(d.limit_kopecks),
				spent_period_rub: rub(d.spent_period_kopecks),
			},
			pairedItem: { item: i },
		},
	];
};
