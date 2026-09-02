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
	pricing?: {
		unit?: string;
		input_rub_per_million?: number;
		output_rub_per_million?: number;
		per_unit?: Array<{ sku?: string; price_rub?: number; unit?: string }>;
	};
}

function priceLabel(model: CatalogModel): string | undefined {
	const p = model.pricing;
	if (!p) return undefined;
	if (p.unit === 'token') {
		if (!p.input_rub_per_million && !p.output_rub_per_million) return 'free';
		return `${p.input_rub_per_million} ₽/M in · ${p.output_rub_per_million} ₽/M out`;
	}
	const unit = p.per_unit?.find((u) => u.sku === 'output_image') ?? p.per_unit?.[0];
	if (unit && typeof unit.price_rub === 'number') return `from ${unit.price_rub} ₽/${unit.unit}`;
	return undefined;
}

/**
 * Which catalog rows belong to an operation. Chat models that also draw pictures
 * (output text+image) are served by /chat/completions, not /images/generations,
 * so the image list keeps only image-only rows.
 */
export function matchesModality(model: CatalogModel, modality: string): boolean {
	const out = model.output_modalities ?? ['text'];
	if (modality === 'text') {
		return out.includes('text') && !out.includes('speech') && !out.includes('embeddings');
	}
	if (modality === 'image') return out.includes('image') && !out.includes('text');
	return out.includes(modality);
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
	const models = body.data.filter((m) => matchesModality(m, modality));
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
