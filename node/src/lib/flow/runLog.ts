import type { RunRequest, RunResult } from './graphContract';

export type LoggedValue = number | number[] | number[][] | string;

export type RunLogEntry = {
	nodeId: string;
	label: string;
	status: 'ok' | 'error';
	input: LoggedValue | null;
	output?: LoggedValue;
	error?: string;
};

export function canvasNodeLabel(node: { type?: string | null; data?: unknown }): string {
	if (isRecord(node.data) && typeof node.data.label === 'string' && node.data.label.trim()) {
		return node.data.label;
	}
	if (node.type === 'input') return 'Input';
	if (node.type === 'output') return 'Output';
	if (node.type === 'process') return 'Process';
	if (node.type === 'train') return 'Train';
	return 'Node';
}

export function buildRunLog(
	request: RunRequest,
	result: RunResult,
	labels: ReadonlyMap<string, string>
): RunLogEntry[] {
	const nodes = new Map(request.nodes.map((node) => [node.id, node]));
	const outputs = new Map<string, LoggedValue>();

	return result.results.map((item) => {
		const node = nodes.get(item.nodeId);
		let input: LoggedValue | null = null;
		if (node?.type === 'input') {
			input = node.config.values;
		} else {
			const incoming = request.edges.filter((edge) => edge.target.nodeId === item.nodeId);
			if (incoming.length === 1) {
				input = outputs.get(incoming[0].source.nodeId) ?? null;
			} else if (node?.type === 'train' && node.config.data !== undefined) {
				input = node.config.data;
			}
		}

		const entry: RunLogEntry = {
			nodeId: item.nodeId,
			label: labels.get(item.nodeId) ?? item.nodeId,
			status: item.status,
			input
		};
		if (item.status === 'ok') {
			entry.output = item.value;
			outputs.set(item.nodeId, item.value);
		} else {
			entry.error = item.error;
		}
		return entry;
	});
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}
