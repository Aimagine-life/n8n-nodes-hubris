import type { supplyModel as SupplyModelFn } from '@n8n/ai-node-sdk';
import type {
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

/**
 * `@n8n/ai-node-sdk` ships with n8n 2.20+. It is resolved lazily so that on older
 * instances the package still loads (the regular Hubris node keeps working) and only
 * this sub-node reports a clear error when used.
 */
function loadSupplyModel(): typeof SupplyModelFn | undefined {
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		return (require('@n8n/ai-node-sdk') as { supplyModel: typeof SupplyModelFn }).supplyModel;
	} catch {
		return undefined;
	}
}

interface OpenAiCompatibleOptions {
	baseUrl: string;
	apiKey: string;
	model: string;
	temperature?: number;
	topP?: number;
	maxTokens?: number;
	frequencyPenalty?: number;
	presencePenalty?: number;
	reasoning?: { effort: ReasoningEffort };
	timeout?: number;
	maxRetries?: number;
}

/**
 * Fallback for n8n < 2.20: those versions bundle `@langchain/openai` for their own
 * OpenAI Chat Model node, and the AI Agent accepts a LangChain chat model directly.
 * Resolved at runtime through n8n's module path, so it is not a dependency of this package.
 */
function supplyModelViaLangchain(options: OpenAiCompatibleOptions): SupplyData | undefined {
	const dynamicRequire: NodeRequire = require;
	let langchainOpenAi: { ChatOpenAI: new (fields: object) => unknown };
	try {
		langchainOpenAi = dynamicRequire('@langchain/openai') as typeof langchainOpenAi;
	} catch {
		return undefined;
	}
	const model = new langchainOpenAi.ChatOpenAI({
		model: options.model,
		apiKey: options.apiKey,
		configuration: { baseURL: options.baseUrl },
		temperature: options.temperature,
		topP: options.topP,
		maxTokens: options.maxTokens,
		frequencyPenalty: options.frequencyPenalty,
		presencePenalty: options.presencePenalty,
		reasoning: options.reasoning,
		timeout: options.timeout,
		maxRetries: options.maxRetries,
	});
	return { response: model };
}
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

		const options: OpenAiCompatibleOptions = {
			baseUrl: trimBaseUrl(String(credentials.baseUrl || 'https://api.hubris.pw/v1')),
			apiKey: String(credentials.apiKey),
			model,
			temperature: o.temperature !== undefined && o.temperature >= 0 ? o.temperature : undefined,
			topP: o.topP !== undefined && o.topP >= 0 ? o.topP : undefined,
			maxTokens: o.maxTokens !== undefined && o.maxTokens > 0 ? o.maxTokens : undefined,
			frequencyPenalty: o.frequencyPenalty || undefined,
			presencePenalty: o.presencePenalty || undefined,
			reasoning: effort ? { effort } : undefined,
			timeout: o.timeout,
			maxRetries: o.maxRetries,
		};

		const supplyModel = loadSupplyModel();
		if (supplyModel) {
			return supplyModel(this, {
				type: 'openai',
				...options,
				defaultHeaders: { 'User-Agent': 'n8n-nodes-hubris' },
			});
		}
		const fallback = supplyModelViaLangchain(options);
		if (fallback) return fallback;
		throw new NodeOperationError(
			this.getNode(),
			'Hubris Chat Model needs n8n 1.100 or newer. Alternatively use the built-in OpenAI Chat Model node with an OpenAI credential pointing at https://api.hubris.pw/v1.',
			{ itemIndex },
		);
	}
}
