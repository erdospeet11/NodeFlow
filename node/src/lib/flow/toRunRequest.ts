import {
	GraphContractError,
	parseRunRequest,
	type GraphNode,
	type RunRequest
} from './graphContract';
import { isProcessFunctionId, type MapOp } from './processFunctions';

const IN_PORT = 'in';
const OUT_PORT = 'out';

export type CanvasNode = {
	id: string;
	type?: string | null;
	data?: unknown;
};

export type CanvasEdge = {
	id: string;
	source: string;
	target: string;
	sourceHandle?: string | null;
	targetHandle?: string | null;
};

export function toRunRequest(
	nodes: readonly CanvasNode[],
	edges: readonly CanvasEdge[]
): RunRequest {
	return parseRunRequest({
		version: 1,
		nodes: nodes.map(toContractNode),
		edges: edges.map((edge) => ({
			id: edge.id,
			source: { nodeId: edge.source, port: edge.sourceHandle || OUT_PORT },
			target: { nodeId: edge.target, port: edge.targetHandle || IN_PORT }
		}))
	});
}

function toContractNode(node: CanvasNode): GraphNode {
	if (node.type === 'input') {
		return {
			id: node.id,
			type: 'input',
			config: { values: readValues(node.data, node.id) },
			ports: [{ id: OUT_PORT, direction: 'out' }]
		};
	}
	if (node.type === 'process') {
		return {
			id: node.id,
			type: 'process',
			config: readProcessConfig(node.data, node.id),
			ports: [
				{ id: IN_PORT, direction: 'in' },
				{ id: OUT_PORT, direction: 'out' }
			]
		};
	}
	if (node.type === 'output') {
		return {
			id: node.id,
			type: 'output',
			config: {},
			ports: [{ id: IN_PORT, direction: 'in' }]
		};
	}
	if (node.type === 'train') {
		return {
			id: node.id,
			type: 'train',
			config: readTrainConfig(node.data, node.id),
			ports: [
				{ id: IN_PORT, direction: 'in' },
				{ id: OUT_PORT, direction: 'out' }
			]
		};
	}
	throw new GraphContractError(`Node ${node.id} has an unknown type`);
}

function readTrainConfig(data: unknown, nodeId: string) {
	const record = isRecord(data) ? data : {};
	const config: { userId: string; path: string; data?: number[] | number[][] } = {
		userId: typeof record.userId === 'string' ? record.userId : '',
		path: typeof record.path === 'string' ? record.path : ''
	};
	if (record.data !== undefined) config.data = readTrainData(record.data, nodeId);
	return config;
}

function readTrainData(value: unknown, nodeId: string): number[] | number[][] {
	if (!Array.isArray(value)) {
		throw new GraphContractError(`Config for ${nodeId} needs numeric or tabular data`);
	}
	return value as number[] | number[][];
}

function readValues(data: unknown, nodeId: string): number[] {
	if (!isRecord(data) || data.values === undefined) return [];
	if (
		!Array.isArray(data.values) ||
		data.values.some((value) => typeof value !== 'number' || !Number.isFinite(value))
	) {
		throw new GraphContractError(`Config for ${nodeId} needs an array of finite numbers`);
	}
	return data.values;
}

function readProcessConfig(data: unknown, nodeId: string) {
	const record = isRecord(data) ? data : {};
	if (!isProcessFunctionId(record.fn)) {
		throw new GraphContractError(`Config for ${nodeId} has an unknown function`);
	}
	if (record.fn !== 'map') return { fn: record.fn };
	if (!isMapOp(record.mapOp)) {
		throw new GraphContractError(`Config for ${nodeId} map needs an operation`);
	}
	if (record.mapOp === 'square') return { fn: 'map' as const, mapOp: 'square' as const };
	if (typeof record.operand !== 'number' || !Number.isFinite(record.operand)) {
		throw new GraphContractError(`Config for ${nodeId} map needs an operation`);
	}
	return { fn: 'map' as const, mapOp: record.mapOp, operand: record.operand };
}

function isMapOp(value: unknown): value is MapOp {
	return value === 'multiply' || value === 'add' || value === 'square';
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}
