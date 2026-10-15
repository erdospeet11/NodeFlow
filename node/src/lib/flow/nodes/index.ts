import type { NodeTypes } from '@xyflow/svelte';
import InputNode from './InputNode.svelte';
import ProcessNode from './ProcessNode.svelte';
import OutputNode from './OutputNode.svelte';

export const nodeTypes = {
	input: InputNode,
	process: ProcessNode,
	output: OutputNode
} satisfies NodeTypes;
