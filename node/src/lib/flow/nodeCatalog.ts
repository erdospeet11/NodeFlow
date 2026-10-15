export type FlowNodeType = 'input' | 'process' | 'output';

export type NodeCatalogItem = {
	type: FlowNodeType;
	label: string;
	description: string;
};

export const NODE_CATALOG: NodeCatalogItem[] = [
	{
		type: 'input',
		label: 'Input',
		description: 'Entry point for data'
	},
	{
		type: 'process',
		label: 'Process',
		description: 'Transform or run logic'
	},
	{
		type: 'output',
		label: 'Output',
		description: 'Flow result or sink'
	}
];
