import type { MapOp, ProcessFunctionId } from './processFunctions';

export const GRAPH_CONTRACT_VERSION = 1 as const;

export type Port = {
	id: string;
	direction: 'in' | 'out';
};

export type InputNode = {
	id: string;
	type: 'input';
	config: { values: number[] };
	ports: [Port];
};

export type ProcessNode = {
	id: string;
	type: 'process';
	config: ProcessConfig;
	ports: [Port, Port];
};

export type OutputNode = {
	id: string;
	type: 'output';
	config: Record<string, never>;
	ports: [Port];
};

export type TrainData = number[] | number[][];

export type TrainNode = {
	id: string;
	type: 'train';
	config: { userId: string; path: string; data?: TrainData };
	ports: [Port, Port];
};

export type GraphNode = InputNode | ProcessNode | OutputNode | TrainNode;

export type ProcessConfig =
	| { fn: Exclude<ProcessFunctionId, 'map'> }
	| { fn: 'map'; mapOp: 'square' }
	| { fn: 'map'; mapOp: Exclude<MapOp, 'square'>; operand: number };

export type Endpoint = {
	nodeId: string;
	port: string;
};

export type GraphEdge = {
	id: string;
	source: Endpoint;
	target: Endpoint;
};

export type RunRequest = {
	version: typeof GRAPH_CONTRACT_VERSION;
	nodes: GraphNode[];
	edges: GraphEdge[];
};

export type NodeResult =
	| { nodeId: string; status: 'ok'; value: number | number[] | string }
	| { nodeId: string; status: 'error'; error: string };

export type RunResult = {
	version: typeof GRAPH_CONTRACT_VERSION;
	status: 'ok' | 'error';
	results: NodeResult[];
};

export class GraphContractError extends Error {
	constructor(detail: string) {
		super(detail);
		this.name = 'GraphContractError';
	}
}

export function parseRunRequest(value: unknown): RunRequest {
	const request = readRunRequest(value);
	assertGraph(request);
	return request;
}

export function parseRunResult(value: unknown): RunResult {
	const result = readRunResult(value);
	const failed = result.results.some((item) => item.status === 'error');
	if (failed && result.status !== 'error') {
		throw new GraphContractError('Run status must be error when a node result failed');
	}
	if (!failed && result.status !== 'ok') {
		throw new GraphContractError('Run status must be ok when every node result succeeded');
	}
	return result;
}

function readRunRequest(value: unknown): RunRequest {
	const record = object(value, 'Run request');
	if (record.version !== GRAPH_CONTRACT_VERSION) {
		throw new GraphContractError('Run request version must be 1');
	}
	if (!Array.isArray(record.nodes) || !Array.isArray(record.edges)) {
		throw new GraphContractError('Run request needs nodes and edges');
	}
	exactKeys(record, ['version', 'nodes', 'edges'], 'Run request');
	return {
		version: GRAPH_CONTRACT_VERSION,
		nodes: record.nodes.map((node) => readNode(node)),
		edges: record.edges.map((edge) => readEdge(edge))
	};
}

function readNode(value: unknown): GraphNode {
	const record = object(value, 'Node');
	exactKeys(record, ['id', 'type', 'config', 'ports'], 'Node');
	const id = text(record.id, 'Node id');
	const ports = readPorts(record.ports, id);
	if (record.type === 'input') {
		assertPortShape(ports, ['out'], id);
		return { id, type: 'input', config: readInputConfig(record.config, id), ports: [ports[0]] };
	}
	if (record.type === 'process') {
		assertPortShape(ports, ['in', 'out'], id);
		return {
			id,
			type: 'process',
			config: readProcessConfig(record.config, id),
			ports: [ports[0], ports[1]]
		};
	}
	if (record.type === 'output') {
		assertPortShape(ports, ['in'], id);
		return { id, type: 'output', config: readOutputConfig(record.config, id), ports: [ports[0]] };
	}
	if (record.type === 'train') {
		assertPortShape(ports, ['in', 'out'], id);
		return {
			id,
			type: 'train',
			config: readTrainConfig(record.config, id),
			ports: [ports[0], ports[1]]
		};
	}
	throw new GraphContractError(`Node ${id} has an unknown type`);
}

function readInputConfig(value: unknown, nodeId: string): { values: number[] } {
	const record = object(value, `Config for ${nodeId}`);
	exactKeys(record, ['values'], `Config for ${nodeId}`);
	if (!Array.isArray(record.values) || record.values.some((item) => !isFiniteNumber(item))) {
		throw new GraphContractError(`Config for ${nodeId} needs an array of finite numbers`);
	}
	return { values: record.values };
}

function readProcessConfig(value: unknown, nodeId: string): ProcessConfig {
	const record = object(value, `Config for ${nodeId}`);
	const keys = Object.keys(record);
	if (record.fn === 'sum' || record.fn === 'mean' || record.fn === 'min' || record.fn === 'max') {
		if (keys.length !== 1) {
			throw new GraphContractError(`Config for ${nodeId} only allows fn`);
		}
		return { fn: record.fn };
	}
	if (record.fn !== 'map') {
		throw new GraphContractError(`Config for ${nodeId} has an unknown function`);
	}
	if (record.mapOp === 'square') {
		if (keys.some((key) => key !== 'fn' && key !== 'mapOp')) {
			throw new GraphContractError(`Config for ${nodeId} square map does not take an operand`);
		}
		return { fn: 'map', mapOp: 'square' };
	}
	if (
		(record.mapOp === 'multiply' || record.mapOp === 'add') &&
		isFiniteNumber(record.operand) &&
		keys.length === 3
	) {
		return { fn: 'map', mapOp: record.mapOp, operand: record.operand };
	}
	throw new GraphContractError(`Config for ${nodeId} map needs an operation`);
}

function readTrainConfig(
	value: unknown,
	nodeId: string
): { userId: string; path: string; data?: TrainData } {
	const record = object(value, `Config for ${nodeId}`);
	const keys = Object.keys(record);
	if (
		keys.some((key) => key !== 'userId' && key !== 'path' && key !== 'data') ||
		!keys.includes('userId') ||
		!keys.includes('path')
	) {
		throw new GraphContractError(`Config for ${nodeId} has unexpected fields`);
	}
	const userId = text(record.userId, `User for ${nodeId}`);
	if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(userId)) {
		throw new GraphContractError('Invalid user id');
	}
	const path = text(record.path, `Path for ${nodeId}`);
	assertStoragePath(path);
	if (!('data' in record)) return { userId, path };
	return { userId, path, data: readTrainData(record.data, nodeId) };
}

function readTrainData(value: unknown, nodeId: string): TrainData {
	if (!Array.isArray(value) || value.length === 0) {
		throw new GraphContractError(`Config for ${nodeId} needs numeric or tabular data`);
	}
	if (value.every((item) => isFiniteNumber(item))) return value;
	if (value.every((item) => Array.isArray(item))) {
		const rows = value.map((item) => {
			if (!item.every((cell: unknown) => isFiniteNumber(cell)) || item.length < 2) {
				throw new GraphContractError(`Config for ${nodeId} needs numeric or tabular data`);
			}
			return item;
		});
		if (rows.some((row) => row.length !== rows[0].length)) {
			throw new GraphContractError(`Config for ${nodeId} rows must be the same length`);
		}
		return rows;
	}
	throw new GraphContractError(`Config for ${nodeId} needs numeric or tabular data`);
}

function assertStoragePath(path: string) {
	if (path.includes('\\') || path.startsWith('/') || /[\u0000-\u001f]/.test(path)) {
		throw new GraphContractError('Invalid path');
	}
	const parts = path.split('/');
	if (parts.length === 0 || parts.some((part) => part === '' || part === '.' || part === '..')) {
		throw new GraphContractError('Invalid path');
	}
}

function readOutputConfig(value: unknown, nodeId: string): Record<string, never> {
	const record = object(value, `Config for ${nodeId}`);
	exactKeys(record, [], `Config for ${nodeId}`);
	return {};
}

function readPorts(value: unknown, nodeId: string): Port[] {
	if (!Array.isArray(value)) {
		throw new GraphContractError(`Node ${nodeId} needs ports`);
	}
	return value.map((item) => {
		const record = object(item, `Port on ${nodeId}`);
		exactKeys(record, ['id', 'direction'], `Port on ${nodeId}`);
		const id = text(record.id, `Port id on ${nodeId}`);
		if (record.direction !== 'in' && record.direction !== 'out') {
			throw new GraphContractError(`Port ${id} on ${nodeId} has an unknown direction`);
		}
		return { id, direction: record.direction };
	});
}

function assertPortShape(ports: Port[], directions: Array<Port['direction']>, nodeId: string) {
	const actual = [...ports.map((port) => port.direction)].sort();
	const expected = [...directions].sort();
	if (
		actual.length !== expected.length ||
		actual.some((direction, index) => direction !== expected[index])
	) {
		throw new GraphContractError(`Node ${nodeId} has the wrong ports`);
	}
}

function readEdge(value: unknown): GraphEdge {
	const record = object(value, 'Edge');
	exactKeys(record, ['id', 'source', 'target'], 'Edge');
	return {
		id: text(record.id, 'Edge id'),
		source: readEndpoint(record.source, 'Edge source'),
		target: readEndpoint(record.target, 'Edge target')
	};
}

function readEndpoint(value: unknown, label: string): Endpoint {
	const record = object(value, label);
	exactKeys(record, ['nodeId', 'port'], label);
	return {
		nodeId: text(record.nodeId, `${label} node`),
		port: text(record.port, `${label} port`)
	};
}

function readRunResult(value: unknown): RunResult {
	const record = object(value, 'Run result');
	exactKeys(record, ['version', 'status', 'results'], 'Run result');
	if (record.version !== GRAPH_CONTRACT_VERSION) {
		throw new GraphContractError('Run result version must be 1');
	}
	if (record.status !== 'ok' && record.status !== 'error') {
		throw new GraphContractError('Run result status must be ok or error');
	}
	if (!Array.isArray(record.results)) {
		throw new GraphContractError('Run result needs results');
	}
	return {
		version: GRAPH_CONTRACT_VERSION,
		status: record.status,
		results: record.results.map((item) => readNodeResult(item))
	};
}

function readNodeResult(value: unknown): NodeResult {
	const record = object(value, 'Node result');
	const nodeId = text(record.nodeId, 'Node result id');
	if (record.status === 'ok') {
		exactKeys(record, ['nodeId', 'status', 'value'], `Result for ${nodeId}`);
		if (!isValue(record.value)) {
			throw new GraphContractError(
				`Result for ${nodeId} needs a number, a list of numbers, or text`
			);
		}
		return { nodeId, status: 'ok', value: record.value };
	}
	if (record.status === 'error') {
		exactKeys(record, ['nodeId', 'status', 'error'], `Result for ${nodeId}`);
		return { nodeId, status: 'error', error: text(record.error, `Result error for ${nodeId}`) };
	}
	throw new GraphContractError(`Result for ${nodeId} has an unknown status`);
}

function assertGraph(request: RunRequest) {
	const nodes = new Map<string, GraphNode>();
	for (const node of request.nodes) {
		if (nodes.has(node.id)) throw new GraphContractError(`Duplicate node id: ${node.id}`);
		if (new Set(node.ports.map((port) => port.id)).size !== node.ports.length) {
			throw new GraphContractError(`Duplicate port id on node ${node.id}`);
		}
		nodes.set(node.id, node);
	}

	const edgeIds = new Set<string>();
	const occupiedInputs = new Set<string>();
	for (const edge of request.edges) {
		if (edgeIds.has(edge.id)) throw new GraphContractError(`Duplicate edge id: ${edge.id}`);
		edgeIds.add(edge.id);
		if (edge.source.nodeId === edge.target.nodeId) {
			throw new GraphContractError(`Edge ${edge.id} connects a node to itself`);
		}
		requirePort(nodes, edge.id, edge.source, 'source', 'out');
		requirePort(nodes, edge.id, edge.target, 'target', 'in');
		const inlet = `${edge.target.nodeId}:${edge.target.port}`;
		if (occupiedInputs.has(inlet)) {
			throw new GraphContractError(`Edge ${edge.id} target port is already connected`);
		}
		occupiedInputs.add(inlet);
	}
}

function requirePort(
	nodes: Map<string, GraphNode>,
	edgeId: string,
	endpoint: Endpoint,
	role: 'source' | 'target',
	direction: Port['direction']
) {
	const node = nodes.get(endpoint.nodeId);
	if (!node) throw new GraphContractError(`Edge ${edgeId} ${role} node does not exist`);
	const port = node.ports.find((item) => item.id === endpoint.port);
	if (!port) throw new GraphContractError(`Edge ${edgeId} ${role} port does not exist`);
	if (port.direction !== direction) {
		throw new GraphContractError(`Edge ${edgeId} ${role} port is not an ${direction} port`);
	}
}

function object(value: unknown, label: string): Record<string, unknown> {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) {
		throw new GraphContractError(`${label} must be an object`);
	}
	return value as Record<string, unknown>;
}

function exactKeys(record: Record<string, unknown>, keys: string[], label: string) {
	const actual = Object.keys(record);
	if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) {
		throw new GraphContractError(`${label} has unexpected fields`);
	}
}

function text(value: unknown, label: string): string {
	if (typeof value !== 'string' || value.length === 0) {
		throw new GraphContractError(`${label} must be a non-empty string`);
	}
	return value;
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function isValue(value: unknown): value is number | number[] | string {
	return (
		isFiniteNumber(value) ||
		(typeof value === 'string' && value.length > 0) ||
		(Array.isArray(value) && value.every((item) => isFiniteNumber(item)))
	);
}
