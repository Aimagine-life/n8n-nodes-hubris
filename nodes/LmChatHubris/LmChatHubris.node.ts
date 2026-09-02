import { supplyModel } from '@n8n/ai-node-sdk';
import type {
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { modelProperty } from '../Hubris/descriptions/shared';
import { trimBaseUrl } from '../Hubris/lib/api';
import { searchModels } from '../Hubris/lib/models';

type ReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high';

interface ChatModelOptions {
	temperature?: number;
	maxTokens?: number;
	topP?: number;
	frequencyPenalty?: number;
	presencePenalty?: number;
	reasoningEffort?: 'default' | ReasoningEffort;
	timeout?: number;
	maxRetries?: number;
}

export class LmChatHubris implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hubris Chat Model',
		name: 'lmChatHubris',
		icon: { light: 'file:../../icons/hubris.svg', dark: 'file:../../icons/hubris.dark.svg' },
		group: ['transform'],
		version: [1],
		subtitle: '={{ $parameter["model"]["value"] || $parameter["model"] }}',
		description:
			'Claude, GPT, Gemini, DeepSeek and other models via Hubris for AI Agents and chains',
		defaults: { name: 'Hubris Chat Model' },
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Recommended)'],
			},
			resources: {
				primaryDocumentation: [{ url: 'https://hubris.pw/docs/integrations/n8n' }],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [{ name: 'hubrisApi', required: true }],
		properties: [
			modelProperty('searchTextModels', 'anthropic/claude-sonnet-5'),
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Frequency Penalty',
						name: 'frequencyPenalty',
						type: 'number',
						default: 0,
						typeOptions: { minValue: -2, maxValue: 2, numberPrecision: 2 },
						description: 'Penalizes tokens by how often they already appeared',
					},
					{
						displayName: 'Max Retries',
						name: 'maxRetries',
						type: 'number',
						default: 2,
						typeOptions: { minValue: 0 },
						description: 'How many times to retry a failed request',
					},
					{
						displayName: 'Maximum Number of Tokens',
						name: 'maxTokens',
						type: 'number',
						default: -1,
						description: 'Maximum number of tokens to generate. -1 keeps the model default.',
					},
					{
						displayName: 'Presence Penalty',
						name: 'presencePenalty',
						type: 'number',
						default: 0,
						typeOptions: { minValue: -2, maxValue: 2, numberPrecision: 2 },
						description: 'Penalizes tokens that already appeared at least once',
					},
					{
						displayName: 'Reasoning Effort',
						name: 'reasoningEffort',
						type: 'options',
						default: 'default',
						options: [
							{ name: 'Default', value: 'default' },
							{ name: 'High', value: 'high' },
							{ name: 'Low', value: 'low' },
							{ name: 'Medium', value: 'medium' },
							{ name: 'Minimal', value: 'minimal' },
							{ name: 'None', value: 'none' },
						],
						description: 'How much the model should think before answering (reasoning models only)',
					},
					{
						displayName: 'Sampling Temperature',
						name: 'temperature',
						type: 'number',
						default: -1,
						typeOptions: { minValue: -1, maxValue: 2, numberPrecision: 2 },
						description:
							'Controls randomness. -1 keeps the model default (recommended for Claude 5, which rejects the parameter).',
					},
					{
						displayName: 'Timeout (Ms)',
						name: 'timeout',
						type: 'number',
						default: 300000,
						typeOptions: { minValue: 1000 },
						description: 'Maximum request time in milliseconds',
					},
					{
						displayName: 'Top P',
						name: 'topP',
						type: 'number',
						default: -1,
						typeOptions: { minValue: -1, maxValue: 1, numberPrecision: 2 },
						description: 'Nucleus sampling threshold. -1 keeps the model default.',
					},
				],
			},
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
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('hubrisApi');
		const model = this.getNodeParameter('model', itemIndex, undefined, {
			extractValue: true,
		}) as string;
		const o = this.getNodeParameter('options', itemIndex, {}) as ChatModelOptions;
		const effort =
			o.reasoningEffort && o.reasoningEffort !== 'default' ? o.reasoningEffort : undefined;

		return supplyModel(this, {
			type: 'openai',
			baseUrl: trimBaseUrl(String(credentials.baseUrl || 'https://api.hubris.pw/v1')),
			apiKey: String(credentials.apiKey),
			model,
			defaultHeaders: { 'User-Agent': 'n8n-nodes-hubris' },
			temperature: o.temperature !== undefined && o.temperature >= 0 ? o.temperature : undefined,
			topP: o.topP !== undefined && o.topP >= 0 ? o.topP : undefined,
			maxTokens: o.maxTokens !== undefined && o.maxTokens > 0 ? o.maxTokens : undefined,
			frequencyPenalty: o.frequencyPenalty || undefined,
			presencePenalty: o.presencePenalty || undefined,
			reasoning: effort ? { effort } : undefined,
			timeout: o.timeout,
			maxRetries: o.maxRetries,
		});
	}
}
