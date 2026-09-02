import type { IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { hubrisRequest, hubrisRequestBinary } from '../lib/api';
import { audioFormatFromBinary } from '../lib/binary';
import { withCostRub } from '../lib/cost';
import { getModelId } from '../lib/models';
import type { OperationHandler } from './types';

export const transcribe: OperationHandler = async (ctx, i) => {
	const model = getModelId(ctx, i);
	const field = ctx.getNodeParameter('binaryPropertyName', i) as string;
	const options = ctx.getNodeParameter('options', i, {}) as IDataObject;
	const binary = ctx.helpers.assertBinaryData(i, field);
	const format = audioFormatFromBinary(binary);
	if (!format) {
		throw new NodeOperationError(
			ctx.getNode(),
			'Unsupported audio format. Use wav, mp3, flac, m4a, ogg, webm or aac.',
			{ itemIndex: i },
		);
	}
	const buffer = await ctx.helpers.getBinaryDataBuffer(i, field);
	const body: IDataObject = { model, input_audio: { data: buffer.toString('base64'), format } };
	for (const key of ['language', 'prompt'] as const) {
		if (typeof options[key] === 'string' && options[key]) body[key] = options[key];
	}
	if (typeof options.temperature === 'number') body.temperature = options.temperature;
	if (options.responseFormat) body.response_format = options.responseFormat;

	const response = await hubrisRequest(ctx, {
		method: 'POST',
		path: '/audio/transcriptions',
		body,
	});
	return [{ json: withCostRub(response), pairedItem: { item: i } }];
};

export const speech: OperationHandler = async (ctx, i) => {
	const model = getModelId(ctx, i);
	const input = ctx.getNodeParameter('input', i) as string;
	const voice = ctx.getNodeParameter('voice', i) as string;
	const options = ctx.getNodeParameter('options', i, {}) as IDataObject;
	const field = (options.binaryPropertyName as string) || 'data';
	const responseFormat = (options.responseFormat as string) || 'mp3';

	const body: IDataObject = { model, input, voice, response_format: responseFormat };
	if (typeof options.speed === 'number' && options.speed !== 1) body.speed = options.speed;

	const { buffer, contentType } = await hubrisRequestBinary(ctx, {
		method: 'POST',
		path: '/audio/speech',
		body,
	});
	const isPcm = responseFormat === 'pcm';
	const mime = isPcm ? 'audio/pcm' : contentType.startsWith('audio/') ? contentType : 'audio/mpeg';
	return [
		{
			json: { model, voice, characters: input.length, format: responseFormat },
			binary: {
				[field]: await ctx.helpers.prepareBinaryData(buffer, `speech.${isPcm ? 'pcm' : 'mp3'}`, mime),
			},
			pairedItem: { item: i },
		},
	];
};
