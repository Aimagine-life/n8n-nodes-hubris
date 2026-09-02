import type { IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { hubrisRequest } from '../lib/api';
import { withCostRub } from '../lib/cost';
import { getModelId } from '../lib/models';
import type { OperationHandler } from './types';

/** A JSON array of strings is treated as a batch; anything else is a single text. */
export function parseEmbeddingInput(
	raw: string,
): { input: string | string[]; error?: undefined } | { input?: undefined; error: string } {
	const trimmed = raw.trim();
	if (!trimmed.startsWith('[')) return { input: raw };
	let parsed: unknown;
	try {
		parsed = JSON.parse(trimmed);
	} catch {
		return { input: raw };
	}
	if (!Array.isArray(parsed) || !parsed.every((v) => typeof v === 'string')) {
		return { error: 'Input array must contain only strings' };
	}
	return { input: parsed as string[] };
}

export const embed: OperationHandler = async (ctx, i) => {
	const model = getModelId(ctx, i);
	const options = ctx.getNodeParameter('options', i, {}) as IDataObject;
	const parsed = parseEmbeddingInput(ctx.getNodeParameter('input', i) as string);
	if (parsed.error) throw new NodeOperationError(ctx.getNode(), parsed.error, { itemIndex: i });

	const body: IDataObject = { model, input: parsed.input };
	if (typeof options.dimensions === 'number' && options.dimensions > 0) {
		body.dimensions = options.dimensions;
	}
	if (options.encodingFormat) body.encoding_format = options.encodingFormat;

	const response = await hubrisRequest(ctx, { method: 'POST', path: '/embeddings', body });
	const data = (response.data as IDataObject[] | undefined) ?? [];
	const base = withCostRub({ model: response.model, usage: response.usage });
	return data.map((row) => ({
		json: { ...base, index: row.index, embedding: row.embedding },
		pairedItem: { item: i },
	}));
};
