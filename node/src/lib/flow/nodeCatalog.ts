import { PROCESS_FUNCTIONS, type ProcessFunctionId } from './processFunctions';

export type FlowNodeType = 'input' | 'process' | 'output';

export type NodeCatalogItem = {
	type: FlowNodeType;
	label: string;
	description: string;
	fn?: ProcessFunctionId;
};

export const NODE_CATALOG: NodeCatalogItem[] = [
	{
		type: 'input',
		label: 'Input',
		description: 'Entry point for data'
	},
	...PROCESS_FUNCTIONS.map((item) => ({
		type: 'process' as const,
		fn: item.id,
		label: item.label,
		description: item.description
	})),
	{
		type: 'output',
		label: 'Output',
		description: 'Flow result or sink'
	}
];
