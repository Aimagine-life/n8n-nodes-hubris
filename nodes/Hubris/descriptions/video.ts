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
			action: 'Generate a video',
			description: 'Create a video from a prompt and optional reference frames (/videos)',
		},
		{
			name: 'Get',
			value: 'get',
			action: 'Get a video',
			description: 'Check a video job and download the result when it is ready',
		},
	],
	default: 'generate',
};

const downloadOption: INodeProperties = {
	displayName: 'Download Video',
	name: 'download',
	type: 'boolean',
	default: true,
	description: 'Whether to download the finished video into a binary field',
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
		displayName: 'Wait for Completion',
		name: 'waitForCompletion',
		type: 'boolean',
		default: true,
		description: 'Whether to wait until the video is ready. Otherwise only the job ID is returned.',
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
			downloadOption,
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
				displayName: 'Poll Interval (Seconds)',
				name: 'pollInterval',
				type: 'number',
				default: 10,
				typeOptions: { minValue: 3 },
				description: 'How often to check the job status while waiting',
			},
			binaryPropertyOutput('data'),
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
			{
				displayName: 'Timeout (Minutes)',
				name: 'timeoutMinutes',
				type: 'number',
				default: 15,
				typeOptions: { minValue: 1 },
				description: 'How long to wait for the video before failing. The job keeps running and can be fetched later.',
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
		description: 'Job ID returned by the Generate operation. Videos are stored for 72 hours after creation.',
		displayOptions: show('get'),
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show('get'),
		options: [downloadOption, binaryPropertyOutput('data')],
	},
];
