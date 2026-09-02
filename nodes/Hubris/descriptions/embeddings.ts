import type { INodeProperties } from 'n8n-workflow';
import { modelProperty } from './shared';

const show = { show: { resource: ['embeddings'], operation: ['embed'] } };

export const embeddingsOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['embeddings'] } },
	options: [
		{
			name: 'Embed',
			value: 'embed',
			action: 'Create embeddings',
			description: 'Turn text into a vector (/embeddings)',
		},
	],
	default: 'embed',
};

export const embeddingsFields: INodeProperties[] = [
	modelProperty('searchEmbeddingModels', 'openai/text-embedding-3-small', show),
	{
		displayName: 'Input',
		name: 'input',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		required: true,
		description: 'Text to embed, or a JSON array of strings for a batch',
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
				displayName: 'Dimensions',
				name: 'dimensions',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0 },
				description:
					'Reduced vector size (text-embedding-3 models only). 0 keeps the model default.',
			},
			{
				displayName: 'Encoding Format',
				name: 'encodingFormat',
				type: 'options',
				default: 'float',
				options: [
					{ name: 'Base64', value: 'base64' },
					{ name: 'Float', value: 'float' },
				],
				description: 'How the vector is returned',
			},
		],
	},
];
