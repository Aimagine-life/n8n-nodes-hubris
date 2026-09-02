import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError, sleep } from 'n8n-workflow';
import { hubrisRequest, hubrisRequestBinary } from '../lib/api';
import { dataUrlFromBinary } from '../lib/binary';
import { withCostRub } from '../lib/cost';
import { getModelId } from '../lib/models';
import { pollUntilDone, PollTimeoutError, type VideoJob } from '../lib/poll';
import type { OperationHandler } from './types';

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

async function finishJob(
	ctx: IExecuteFunctions,
	i: number,
	job: VideoJob,
	options: IDataObject,
): Promise<INodeExecutionData> {
	const item: INodeExecutionData = { json: withCostRub(job), pairedItem: { item: i } };
	if (job.status === 'completed' && options.download !== false) {
		const field = (options.binaryPropertyName as string) || 'data';
		item.binary = { [field]: await downloadVideo(ctx, job.id) };
	}
	return item;
}

function fetchJob(ctx: IExecuteFunctions, id: string): Promise<VideoJob> {
	return hubrisRequest<VideoJob>(ctx, { method: 'GET', path: `/videos/${encodeURIComponent(id)}` });
}

export const generate: OperationHandler = async (ctx, i) => {
	const model = getModelId(ctx, i);
	const prompt = ctx.getNodeParameter('prompt', i) as string;
	const wait = ctx.getNodeParameter('waitForCompletion', i) as boolean;
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

	let job = await hubrisRequest<VideoJob>(ctx, { method: 'POST', path: '/videos', body });
	if (!wait) return [{ json: job, pairedItem: { item: i } }];

	const intervalMs = ((options.pollInterval as number) || 10) * 1000;
	const timeoutMs = ((options.timeoutMinutes as number) || 15) * 60_000;
	try {
		job = await pollUntilDone(() => fetchJob(ctx, job.id), {
			intervalMs,
			timeoutMs,
			now: () => Date.now(),
			wait: sleep,
		});
	} catch (error) {
		if (error instanceof PollTimeoutError) {
			throw new NodeOperationError(
				ctx.getNode(),
				`Video ${error.jobId} is still processing after the timeout. Fetch it later with Video → Get.`,
				{ itemIndex: i },
			);
		}
		throw new NodeOperationError(ctx.getNode(), error as Error, { itemIndex: i });
	}
	return [await finishJob(ctx, i, job, options)];
};

export const get: OperationHandler = async (ctx, i) => {
	const id = (ctx.getNodeParameter('videoId', i) as string).trim();
	const options = ctx.getNodeParameter('options', i, {}) as IDataObject;
	const job = await fetchJob(ctx, id);
	return [await finishJob(ctx, i, job, options)];
};
