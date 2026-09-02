import type { INodeProperties } from 'n8n-workflow';

export const accountOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['account'] } },
	options: [
		{
			name: 'Get Key Info',
			value: 'getKey',
			action: 'Get API key info and balance',
			description: 'Spending limit, period usage and account balance of the current key (/key)',
		},
	],
	default: 'getKey',
};
