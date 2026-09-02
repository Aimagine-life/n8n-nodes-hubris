import type { IBinaryKeyData, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { hubrisRequest } from '../lib/api';
import { detectImageMime } from '../lib/binary';
import { withCostRub } from '../lib/cost';
import { getModelId } from '../lib/models';
import type { OperationHandler } from './types';

interface GeneratedImage {
	b64_json?: string;
	revised_prompt?: string;
}

export const generate: OperationHandler = async (ctx, i) => {
	const model = getModelId(ctx, i);
	const prompt = ctx.getNodeParameter('prompt', i) as string;
	const options = ctx.getNodeParameter('options', i, {}) as IDataObject;
	const field = (options.binaryPropertyName as string) || 'data';
	const separate = options.separateItems !== false;

	const body: IDataObject = { model, prompt, response_format: 'b64_json' };
	if (typeof options.n === 'number' && options.n > 0) body.n = options.n;
	if (typeof options.size === 'string' && options.size.trim()) body.size = options.size.trim();

	const response = await hubrisRequest(ctx, {
		method: 'POST',
		path: '/images/generations',
		body,
	});
	const images = (response.data as GeneratedImage[] | undefined) ?? [];
	if (!images.length) {
		throw new NodeOperationError(ctx.getNode(), 'The API returned no images', { itemIndex: i });
	}

	const base = withCostRub({ model, created: response.created, usage: response.usage });
	const prepared = await Promise.all(
		images.map(async (img, idx) => {
			const buffer = Buffer.from(img.b64_json ?? '', 'base64');
			const { mime, ext } = detectImageMime(buffer);
			return {
				idx,
				revised_prompt: img.revised_prompt ?? null,
				binary: await ctx.helpers.prepareBinaryData(buffer, `hubris-image-${idx + 1}.${ext}`, mime),
			};
		}),
	);

	if (separate) {
		return prepared.map((p) => ({
			json: { ...base, index: p.idx, revised_prompt: p.revised_prompt },
			binary: { [field]: p.binary },
			pairedItem: { item: i },
		}));
	}
	const binary: IBinaryKeyData = {};
	for (const p of prepared) {
		binary[prepared.length === 1 ? field : `${field}_${p.idx}`] = p.binary;
	}
	return [{ json: { ...base, count: prepared.length }, binary, pairedItem: { item: i } }];
};
