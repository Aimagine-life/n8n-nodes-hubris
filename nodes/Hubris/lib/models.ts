import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { hubrisRequest } from './api';

export interface CatalogModel {
	id: string;
	display_name?: string;
	output_modalities?: string[];
	pricing?: { unit?: string; input_rub_per_million?: number; output_rub_per_million?: number };
}

function priceLabel(model: CatalogModel): string | undefined {
	const p = model.pricing;
	if (!p || p.unit !== 'token') return undefined;
	if (!p.input_rub_per_million && !p.output_rub_per_million) return 'free';
	return `${p.input_rub_per_million} ₽/M in · ${p.output_rub_per_million} ₽/M out`;
}

export function toModelSearchItems(models: CatalogModel[], filter?: string): INodeListSearchItems[] {
	const needle = filter?.trim().toLowerCase();
	return models
		.filter(
			(m) =>
				!needle ||
				m.id.toLowerCase().includes(needle) ||
				(m.display_name ?? '').toLowerCase().includes(needle),
		)
		.map((m) => ({ name: m.display_name || m.id, value: m.id, description: priceLabel(m) }))
		.sort((a, b) => a.name.localeCompare(b.name));
}

/** GET /models?output_modalities=<modality>. The text list excludes speech and embedding models. */
export async function searchModels(
	ctx: ILoadOptionsFunctions,
	modality: string,
	filter?: string,
): Promise<INodeListSearchResult> {
	const body = await hubrisRequest<{ data: CatalogModel[] }>(ctx, {
		method: 'GET',
		path: '/models',
		qs: { output_modalities: modality },
	});
	const models = body.data.filter((m) => {
		const out = m.output_modalities ?? ['text'];
		if (modality === 'text') {
			return out.includes('text') && !out.includes('speech') && !out.includes('embeddings');
		}
		return out.includes(modality);
	});
	return { results: toModelSearchItems(models, filter) };
}

export async function searchVideoModels(
	ctx: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const body = await hubrisRequest<{ data: CatalogModel[] }>(ctx, {
		method: 'GET',
		path: '/videos/models',
	});
	return { results: toModelSearchItems(body.data, filter) };
}

export function getModelId(ctx: IExecuteFunctions, itemIndex: number): string {
	const value = ctx.getNodeParameter('model', itemIndex, undefined, { extractValue: true }) as
		| string
		| IDataObject;
	return String(value);
}
