import type { INodeProperties } from 'n8n-workflow';
import { binaryPropertyOutput, modelProperty } from './shared';

const show = { show: { resource: ['image'], operation: ['generate'] } };

export const imageOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['image'] } },
	options: [
		{
			name: 'Generate',
			value: 'generate',
			action: 'Generate an image',
			description: 'Create an image from a text prompt (/images/generations)',
		},
	],
	default: 'generate',
};

export const imageFields: INodeProperties[] = [
	modelProperty('searchImageModels', 'black-forest-labs/flux.2-pro', show),
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		required: true,
		description: 'Description of the image to generate',
		displayOptions: show,
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show,
		options: [
			{
				displayName: 'Number of Images',
				name: 'n',
				type: 'number',
				default: 1,
				typeOptions: { minValue: 1 },
				description: 'How many images to generate (capped by the model limit)',
			},
			binaryPropertyOutput('data'),
			{
				displayName: 'Separate Items',
				name: 'separateItems',
				type: 'boolean',
				default: true,
				description: 'Whether to output each image as a separate item',
			},
			{
				displayName: 'Size',
				name: 'size',
				type: 'string',
				default: '',
				placeholder: '1024x1024',
				description: 'Image size such as 1024x1024, or a tier such as 2K, depending on the model',
			},
		],
	},
];
