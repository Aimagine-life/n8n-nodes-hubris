import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';
import { BASE_URL_CURRENT, BASE_URL_CUSTOM, BASE_URL_LEGACY } from '../nodes/Hubris/lib/base-url';

export class HubrisApi implements ICredentialType {
	name = 'hubrisApi';

	displayName = 'Hubris API';

	icon: Icon = { light: 'file:../icons/hubris.svg', dark: 'file:../icons/hubris.dark.svg' };

	documentationUrl = 'https://hubris.pro/docs/integrations/n8n';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'Inference API key from https://hubris.pro/keys (starts with sk-gw-)',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'options',
			options: [
				{
					name: 'Hubris (api.hubris.pro)',
					value: BASE_URL_CURRENT,
					description: 'Recommended endpoint',
				},
				{
					name: 'Hubris Legacy (api.hubris.pw)',
					value: BASE_URL_LEGACY,
					description: 'Previous endpoint, kept working for existing workflows',
				},
				{
					name: 'Custom',
					value: BASE_URL_CUSTOM,
					description: 'A proxy or a staging environment',
				},
			],
			default: BASE_URL_CURRENT,
		},
		{
			displayName: 'Custom Base URL',
			name: 'customBaseUrl',
			type: 'string',
			default: '',
			placeholder: 'https://example.com/v1',
			displayOptions: { show: { baseUrl: [BASE_URL_CUSTOM] } },
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: { headers: { Authorization: '=Bearer {{$credentials.apiKey}}' } },
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: `={{$credentials.baseUrl === '${BASE_URL_CUSTOM}' ? $credentials.customBaseUrl : $credentials.baseUrl}}`,
			url: '/key',
		},
	};
}
