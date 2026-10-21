import { applyProcess, isProcessFunctionId, type ProcessConfig } from './processFunctions';

export type FlowNodeLike = {
	id: string;
	type?: string | null;
	data?: unknown;
};

export type FlowEdgeLike = {
	source: string;
	target: string;
};

export type Evaluation =
	| { state: 'empty' }
	| { state: 'ok'; value: number | number[] }
	| { state: 'error'; error: string };

export function evaluateNode(
	nodeId: string,
	nodes: readonly FlowNodeLike[],
	edges: readonly FlowEdgeLike[]
): Evaluation {
	return evaluate(nodeId, nodes, edges, new Set());
}

function evaluate(
	nodeId: string,
	nodes: readonly FlowNodeLike[],
	edges: readonly FlowEdgeLike[],
	visiting: Set<string>
): Evaluation {
	if (visiting.has(nodeId)) return { state: 'error', error: 'Cycle' };
	const node = nodes.find((item) => item.id === nodeId);
	if (!node) return { state: 'error', error: 'Missing node' };

	visiting.add(nodeId);
	try {
		if (node.type === 'input') {
			const values = readValues(node.data);
			if (!values) return { state: 'error', error: 'Input needs numbers' };
			return { state: 'ok', value: values };
		}
		if (node.type === 'train') return { state: 'empty' };
		if (node.type !== 'process' && node.type !== 'output') {
			return { state: 'error', error: 'Unknown node' };
		}

		const incoming = edges.filter((edge) => edge.target === nodeId);
		if (incoming.length === 0) {
			return node.type === 'output'
				? { state: 'empty' }
				: { state: 'error', error: 'Needs one input' };
		}
		if (incoming.length > 1) return { state: 'error', error: 'Needs one input' };

		const upstream = evaluate(incoming[0].source, nodes, edges, visiting);
		if (upstream.state !== 'ok') return upstream;
		if (node.type === 'output') return upstream;

		try {
			const result = applyProcess(asList(upstream.value), readProcessConfig(node.data));
			return { state: 'ok', value: result.value };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Process failed';
			return { state: 'error', error: message };
		}
	} finally {
		visiting.delete(nodeId);
	}
}

function readValues(data: unknown): number[] | null {
	if (!isRecord(data) || data.values === undefined) return [];
	if (
		!Array.isArray(data.values) ||
		data.values.some((value) => typeof value !== 'number' || !Number.isFinite(value))
	) {
		return null;
	}
	return data.values;
}

function readProcessConfig(data: unknown): ProcessConfig {
	if (!isRecord(data) || !isProcessFunctionId(data.fn)) {
		throw new Error('Unknown process function');
	}
	if (data.fn !== 'map') return { fn: data.fn };
	const mapOp = data.mapOp === 'add' || data.mapOp === 'square' ? data.mapOp : 'multiply';
	return { fn: 'map', mapOp, operand: typeof data.operand === 'number' ? data.operand : 1 };
}

function asList(value: number | number[]): number[] {
	return typeof value === 'number' ? [value] : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object';
}
