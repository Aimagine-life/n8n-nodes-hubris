import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchResult,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { getVoicesForSelectedModel, searchModels, searchVideoModels } from './lib/models';
import { accountOperations } from './descriptions/account';
import { audioOperations, audioSpeechFields, audioTranscribeFields } from './descriptions/audio';
import { embeddingsFields, embeddingsOperations } from './descriptions/embeddings';
import { imageFields, imageOperations } from './descriptions/image';
import { textChatFields, textOperations, textResponsesFields } from './descriptions/text';
import { videoGenerateFields, videoGetFields, videoOperations } from './descriptions/video';
import * as account from './operations/account';
import * as audio from './operations/audio';
import * as embeddings from './operations/embeddings';
import * as image from './operations/image';
import * as text from './operations/text';
import type { OperationHandler } from './operations/types';
import * as video from './operations/video';

const operations: Record<string, OperationHandler> = {
	'account.getKey': account.getKey,
	'audio.speech': audio.speech,
	'audio.transcribe': audio.transcribe,
	'embeddings.embed': embeddings.embed,
	'image.generate': image.generate,
	'text.chat': text.chat,
	'text.responses': text.responses,
	'video.generate': video.generate,
	'video.get': video.get,
};

export class Hubris implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hubris',
		name: 'hubris',
		icon: { light: 'file:../../icons/hubris.svg', dark: 'file:../../icons/hubris.dark.svg' },
		group: ['transform'],
		version: [1],
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description:
			'Chat, images, audio, video and embeddings from 400+ models with one Hubris API key',
		defaults: { name: 'Hubris' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'hubrisApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Audio', value: 'audio' },
					{ name: 'Embedding', value: 'embeddings' },
					{ name: 'Image', value: 'image' },
					{ name: 'Text', value: 'text' },
					{ name: 'Video', value: 'video' },
				],
				default: 'text',
			},
			textOperations,
			...textChatFields,
			...textResponsesFields,
			embeddingsOperations,
			...embeddingsFields,
			imageOperations,
			...imageFields,
			audioOperations,
			...audioTranscribeFields,
			...audioSpeechFields,
			videoOperations,
			...videoGenerateFields,
			...videoGetFields,
			accountOperations,
		],
	};

	methods = {
		loadOptions: {
			async getVoices(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return getVoicesForSelectedModel(this);
			},
		},
		listSearch: {
			async searchTextModels(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				return searchModels(this, 'text', filter);
			},
			async searchEmbeddingModels(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				return searchModels(this, 'embeddings', filter);
			},
			async searchImageModels(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				return searchModels(this, 'image', filter);
			},
			async searchTranscriptionModels(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				return searchModels(this, 'transcription', filter);
			},
			async searchSpeechModels(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				return searchModels(this, 'speech', filter);
			},
			async searchVideoModels(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				return searchVideoModels(this, filter);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const handler = operations[`${resource}.${operation}`];
		if (!handler) {
			throw new NodeOperationError(
				this.getNode(),
				`Unsupported operation: ${resource}.${operation}`,
			);
		}

		const returnData: INodeExecutionData[] = [];
		for (let i = 0; i < items.length; i++) {
			try {
				returnData.push(...(await handler(this, i)));
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				const known = error instanceof NodeApiError || error instanceof NodeOperationError;
				const wrapped = known
					? (error as NodeApiError | NodeOperationError)
					: new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
				throw wrapped;
			}
		}
		return [returnData];
	}
}
