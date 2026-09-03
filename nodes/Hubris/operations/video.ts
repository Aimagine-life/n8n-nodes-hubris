import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { hubrisRequest, hubrisRequestBinary } from '../lib/api';
import { dataUrlFromBinary } from '../lib/binary';
import { withCostRub } from '../lib/cost';
import { getModelId } from '../lib/models';
import type { OperationHandler } from './types';

/**
 * Video generation is asynchronous: Generate starts the job and returns its id,
 * Get checks one job and downloads the file once it is ready. The node never
 * waits or polls on its own — waiting belongs in the workflow (a Wait node plus
 * Get, or an If loop), so the user stays in control of timing and retries.
 */
interface VideoJob extends IDataObject {
	id: string;
	status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

type FrameType = 'first_frame' | 'last_frame';

async function frameImage(
	ctx: IExecuteFunctions,
	i: number,
	binaryField: unknown,
	url: unknown,
	frameType: FrameType,
): Promise<IDataObject | undefined> {
	if (typeof binaryField === 'string' && binaryField) {
		const binary = ctx.helpers.assertBinaryData(i, binaryField);
		const buffer = await ctx.helpers.getBinaryDataBuffer(i, binaryField);
		return {
			type: 'image_url',
			image_url: { url: dataUrlFromBinary(buffer, binary.mimeType || 'image/png') },
			frame_type: frameType,
		};
	}
	if (typeof url === 'string' && url.trim()) {
		return { type: 'image_url', image_url: { url: url.trim() }, frame_type: frameType };
	}
	return undefined;
}

async function downloadVideo(ctx: IExecuteFunctions, id: string) {
	const { buffer, contentType } = await hubrisRequestBinary(ctx, {
		method: 'GET',
		path: `/videos/${encodeURIComponent(id)}/content`,
		qs: { index: 0 },
	});
	const mime = contentType.startsWith('video/') ? contentType : 'video/mp4';
	return ctx.helpers.prepareBinaryData(buffer, `${id}.mp4`, mime);
}

export const generate: OperationHandler = async (ctx, i) => {
	const model = getModelId(ctx, i);
	const prompt = ctx.getNodeParameter('prompt', i) as string;
	const options = ctx.getNodeParameter('options', i, {}) as IDataObject;

	const body: IDataObject = { model, prompt };
	if (typeof options.duration === 'number' && options.duration > 0) body.duration = options.duration;
	if (typeof options.seed === 'number' && options.seed !== 0) body.seed = options.seed;
	for (const key of ['resolution', 'aspect_ratio', 'size'] as const) {
		if (typeof options[key] === 'string' && options[key]) body[key] = options[key];
	}
	if (options.generate_audio === true) body.generate_audio = true;
	const frames = [
		await frameImage(ctx, i, options.firstFrameBinary, options.firstFrameUrl, 'first_frame'),
		await frameImage(ctx, i, options.lastFrameBinary, options.lastFrameUrl, 'last_frame'),
	].filter((f): f is IDataObject => f !== undefined);
	if (frames.length) body.frame_images = frames;

	const job = await hubrisRequest<VideoJob>(ctx, { method: 'POST', path: '/videos', body });
	return [{ json: job, pairedItem: { item: i } }];
};

export const get: OperationHandler = async (ctx, i) => {
	const id = (ctx.getNodeParameter('videoId', i) as string).trim();
	const options = ctx.getNodeParameter('options', i, {}) as IDataObject;
	const job = await hubrisRequest<VideoJob>(ctx, {
		method: 'GET',
		path: `/videos/${encodeURIComponent(id)}`,
	});

	const item: INodeExecutionData = { json: withCostRub(job), pairedItem: { item: i } };
	if (job.status === 'completed' && options.download !== false) {
		const field = (options.binaryPropertyName as string) || 'data';
		item.binary = { [field]: await downloadVideo(ctx, job.id) };
	}
	return [item];
};
