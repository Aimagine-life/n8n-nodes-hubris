import type { INodeProperties } from 'n8n-workflow';
import { binaryPropertyOutput, modelProperty } from './shared';

const show = (operation: string) => ({ show: { resource: ['video'], operation: [operation] } });

export const videoOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['video'] } },
	options: [
		{
			name: 'Generate',
			value: 'generate',
			action: 'Start a video generation job',
			description: 'Start a job and return its ID. Check it later with the Get operation.',
		},
		{
			name: 'Get',
			value: 'get',
			action: 'Get a video job',
			description: 'Check a job by ID and download the result once it is ready',
		},
	],
	default: 'generate',
};

export const videoGenerateFields: INodeProperties[] = [
	modelProperty('searchVideoModels', 'kwaivgi/kling-v3.0-pro', show('generate')),
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		required: true,
		description: 'Description of the video to generate',
		displayOptions: show('generate'),
	},
	{
		displayName:
			'Generation takes a few minutes. This operation returns a job ID right away — add a Wait node and the Get operation to fetch the finished video.',
		name: 'asyncNotice',
		type: 'notice',
		default: '',
		displayOptions: show('generate'),
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show('generate'),
		options: [
			{
				displayName: 'Aspect Ratio',
				name: 'aspect_ratio',
				type: 'string',
				default: '',
				placeholder: '16:9',
				description: 'Aspect ratio supported by the model',
			},
			{
				displayName: 'Duration (Seconds)',
				name: 'duration',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0, maxValue: 60 },
				description: 'Video length in seconds. 0 keeps the model default.',
			},
			{
				displayName: 'First Frame Binary Field',
				name: 'firstFrameBinary',
				type: 'string',
				default: '',
				description: 'Name of the input binary field with the first-frame image (image-to-video)',
			},
			{
				displayName: 'First Frame URL',
				name: 'firstFrameUrl',
				type: 'string',
				default: '',
				description: 'HTTPS URL of the first-frame image. Ignored when the binary field is set.',
			},
			{
				displayName: 'Generate Audio',
				name: 'generate_audio',
				type: 'boolean',
				default: false,
				description: 'Whether to generate sound (models that support audio only)',
			},
			{
				displayName: 'Last Frame Binary Field',
				name: 'lastFrameBinary',
				type: 'string',
				default: '',
				description: 'Name of the input binary field with the last-frame image',
			},
			{
				displayName: 'Last Frame URL',
				name: 'lastFrameUrl',
				type: 'string',
				default: '',
				description: 'HTTPS URL of the last-frame image. Ignored when the binary field is set.',
			},
			{
				displayName: 'Resolution',
				name: 'resolution',
				type: 'string',
				default: '',
				placeholder: '1080p',
				description: 'Resolution supported by the model',
			},
			{
				displayName: 'Seed',
				name: 'seed',
				type: 'number',
				default: 0,
				description: 'Seed for reproducible results (models that support it). 0 means random.',
			},
			{
				displayName: 'Size',
				name: 'size',
				type: 'string',
				default: '',
				placeholder: '1280x720',
				description: 'Exact frame size supported by the model',
			},
		],
	},
];

export const videoGetFields: INodeProperties[] = [
	{
		displayName: 'Video ID',
		name: 'videoId',
		type: 'string',
		default: '',
		required: true,
		description:
			'Job ID returned by the Generate operation. Status is one of pending, in_progress, completed or failed. Videos are stored for 72 hours after creation.',
		displayOptions: show('get'),
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show('get'),
		options: [
			{
				displayName: 'Download Video',
				name: 'download',
				type: 'boolean',
				default: true,
				description: 'Whether to download the finished video into a binary field',
			},
			binaryPropertyOutput('data'),
		],
	},
];
