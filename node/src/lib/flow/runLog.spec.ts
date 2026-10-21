import { describe, expect, it, vi } from 'vitest';
import { parseRunRequest } from './graphContract';
import { buildRunLog, canvasNodeLabel } from './runLog';
import { isAbortError, postRun } from './runClient';
import { toRunRequest } from './toRunRequest';

const nodes = [
	{ id: 'numbers', type: 'input', data: { label: 'Input', values: [1, 2, 3, 4] } },
	{
		id: 'total',
		type: 'process',
		data: { label: 'Sum', fn: 'sum', mapOp: 'multiply', operand: 1 }
	},
	{ id: 'log', type: 'output', data: { label: 'Output' } }
];

const edges = [
	{ id: 'e1', source: 'numbers', target: 'total', sourceHandle: null, targetHandle: null },
	{ id: 'e2', source: 'total', target: 'log' }
];

describe('toRunRequest', () => {
	it('maps a numbers, sum, and log canvas onto the contract', () => {
		const request = toRunRequest(nodes, edges);
		expect(request.nodes.map((node) => node.type)).toEqual(['input', 'process', 'output']);
		expect(request.nodes[1]).toMatchObject({ config: { fn: 'sum' } });
		expect(request.edges[0].source).toEqual({ nodeId: 'numbers', port: 'out' });
		expect(request.edges[1].target).toEqual({ nodeId: 'log', port: 'in' });
	});

	it('keeps a square map free of an operand', () => {
		const request = toRunRequest(
			[
				{
					id: 'scaled',
					type: 'process',
					data: { fn: 'map', mapOp: 'square', operand: 4 }
				}
			],
			[]
		);
		expect(request.nodes[0].config).toEqual({ fn: 'map', mapOp: 'square' });
	});
});

describe('buildRunLog', () => {
	it('keeps server order and records each input and output', () => {
		const request = toRunRequest(nodes, edges);
		const labels = new Map(nodes.map((node) => [node.id, canvasNodeLabel(node)]));
		const entries = buildRunLog(
			request,
			{
				version: 1,
				status: 'ok',
				results: [
					{ nodeId: 'numbers', status: 'ok', value: [1, 2, 3, 4] },
					{ nodeId: 'total', status: 'ok', value: 10 },
					{ nodeId: 'log', status: 'ok', value: 10 }
				]
			},
			labels
		);
		expect(entries.map((entry) => entry.label)).toEqual(['Input', 'Sum', 'Output']);
		expect(entries[1]).toMatchObject({ input: [1, 2, 3, 4], output: 10 });
		expect(entries[2]).toMatchObject({ input: 10, output: 10 });
	});

	it('leaves the input empty when the upstream node failed', () => {
		const request = parseRunRequest(toRunRequest(nodes, edges));
		const entries = buildRunLog(
			request,
			{
				version: 1,
				status: 'error',
				results: [
					{ nodeId: 'numbers', status: 'ok', value: [] },
					{ nodeId: 'total', status: 'error', error: 'Sum needs at least one number' },
					{ nodeId: 'log', status: 'error', error: 'Upstream failed' }
				]
			},
			new Map()
		);
		expect(entries[1].input).toEqual([]);
		expect(entries[2].input).toBeNull();
		expect(entries[2].error).toBe('Upstream failed');
	});
});

describe('postRun', () => {
	it('posts the request and parses the ordered result', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					version: 1,
					status: 'ok',
					results: [{ nodeId: 'numbers', status: 'ok', value: [1] }]
				}),
				{ status: 200, headers: { 'content-type': 'application/json' } }
			)
		);
		vi.stubGlobal('fetch', fetchMock);
		const request = toRunRequest([nodes[0]], []);
		await expect(postRun(request, new AbortController().signal)).resolves.toMatchObject({
			status: 'ok'
		});
		expect(fetchMock).toHaveBeenCalledWith(
			'/runs',
			expect.objectContaining({ method: 'POST', body: JSON.stringify(request) })
		);
		vi.unstubAllGlobals();
	});

	it('raises the runner detail for a rejected graph', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ detail: 'Cycle detected! This graph is not a valid DAG.' }), {
					status: 400,
					headers: { 'content-type': 'application/json' }
				})
			)
		);
		await expect(postRun(toRunRequest([], []), new AbortController().signal)).rejects.toThrow(
			/Cycle detected/
		);
		vi.unstubAllGlobals();
	});

	it('recognises an aborted fetch', () => {
		expect(isAbortError(new DOMException('The operation was aborted', 'AbortError'))).toBe(true);
	});
});
