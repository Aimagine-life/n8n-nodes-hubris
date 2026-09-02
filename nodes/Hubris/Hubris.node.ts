import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchResult,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { searchModels, searchVideoModels } from './lib/models';
import { textChatFields, textOperations, textResponsesFields } from './descriptions/text';
import * as text from './operations/text';
import type { OperationHandler } from './operations/types';

const operations: Record<string, OperationHandler> = {
	'text.chat': text.chat,
	'text.responses': text.responses,
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
				options: [{ name: 'Text', value: 'text' }],
				default: 'text',
			},
			textOperations,
			...textChatFields,
			...textResponsesFields,
		],
	};

	methods = {
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
