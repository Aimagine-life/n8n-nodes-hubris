import type { INodeProperties } from 'n8n-workflow';
import { binaryPropertyOutput, modelProperty } from './shared';

const show = (operation: string) => ({ show: { resource: ['audio'], operation: [operation] } });

export const audioOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['audio'] } },
	options: [
		{
			name: 'Generate Speech',
			value: 'speech',
			action: 'Convert text to speech',
			description: 'Text to speech (/audio/speech)',
		},
		{
			name: 'Transcribe',
			value: 'transcribe',
			action: 'Transcribe audio to text',
			description: 'Speech to text (/audio/transcriptions)',
		},
	],
	default: 'transcribe',
};

export const audioTranscribeFields: INodeProperties[] = [
	modelProperty('searchTranscriptionModels', 'openai/whisper-1', show('transcribe')),
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		hint: 'The name of the input binary field containing the audio file',
		displayOptions: show('transcribe'),
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show('transcribe'),
		options: [
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				placeholder: 'en',
				description: 'Language of the audio as an ISO-639-1 code. Improves accuracy and speed.',
			},
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				default: '',
				description: 'Text to guide the style of the transcript, such as names or terms',
			},
			{
				displayName: 'Response Format',
				name: 'responseFormat',
				type: 'options',
				default: 'json',
				options: [
					{ name: 'JSON', value: 'json' },
					{ name: 'Verbose JSON', value: 'verbose_json' },
				],
				description: 'Verbose JSON adds language, duration and timestamped segments when the model supports it',
			},
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
				description: 'Sampling temperature between 0 and 1',
			},
		],
	},
];

export const audioSpeechFields: INodeProperties[] = [
	modelProperty('searchSpeechModels', 'microsoft/mai-voice-2-flash', show('speech')),
	{
		displayName: 'Text',
		name: 'input',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		required: true,
		description: 'Text to convert to speech. Billed per character.',
		displayOptions: show('speech'),
	},
	{
		displayName: 'Voice Name or ID',
		name: 'voice',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getVoices', loadOptionsDependsOn: ['model.value'] },
		default: '',
		required: true,
		description:
			'Voices of the selected model. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: show('speech'),
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show('speech'),
		options: [
			binaryPropertyOutput('data'),
			{
				displayName: 'Response Format',
				name: 'responseFormat',
				type: 'options',
				default: 'mp3',
				options: [
					{ name: 'MP3', value: 'mp3' },
					{ name: 'PCM (16-Bit LE)', value: 'pcm' },
				],
				description: 'Audio container of the output file',
			},
			{
				displayName: 'Speed',
				name: 'speed',
				type: 'number',
				default: 1,
				typeOptions: { minValue: 0.25, maxValue: 4, numberPrecision: 2 },
				description: 'Playback speed multiplier when the model supports it',
			},
		],
	},
];
