import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class HubrisApi implements ICredentialType {
	name = 'hubrisApi';

	displayName = 'Hubris API';

	icon: Icon = { light: 'file:../icons/hubris.svg', dark: 'file:../icons/hubris.dark.svg' };

	documentationUrl = 'https://hubris.pw/docs/integrations/n8n';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'Inference API key from https://hubris.pw/keys (starts with sk-gw-)',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.hubris.pw/v1',
			description: 'Change only if you use a proxy or a staging environment',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: { headers: { Authorization: '=Bearer {{$credentials.apiKey}}' } },
	};

	test: ICredentialTestRequest = {
		request: { baseURL: '={{$credentials.baseUrl}}', url: '/key' },
	};
}
