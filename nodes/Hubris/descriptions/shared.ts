import type { INodeProperties } from 'n8n-workflow';

export function modelProperty(
	searchListMethod: string,
	placeholder: string,
	displayOptions?: INodeProperties['displayOptions'],
): INodeProperties {
	const property: INodeProperties = {
		displayName: 'Model',
		name: 'model',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description:
			'Model from the Hubris catalog. Choose from the list, or specify an ID using an expression.',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: { searchListMethod, searchable: true },
			},
			{ displayName: 'ID', name: 'id', type: 'string', placeholder },
		],
	};
	if (displayOptions) property.displayOptions = displayOptions;
	return property;
}

export function binaryPropertyOutput(defaultName = 'data'): INodeProperties {
	return {
		displayName: 'Put Output in Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: defaultName,
		hint: 'The name of the output binary field to put the file in',
	};
}
