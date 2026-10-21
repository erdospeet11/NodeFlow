import { describe, expect, it } from 'vitest';
import { evaluateNode } from './evaluateFlow';
import { parseNumberList } from './numberList';

const nodes = [
	{ id: 'numbers', type: 'input', data: { values: [1, 2, 3, 4] } },
	{ id: 'total', type: 'process', data: { fn: 'sum' } },
	{ id: 'result', type: 'output', data: {} }
];

const edges = [
	{ source: 'numbers', target: 'total' },
	{ source: 'total', target: 'result' }
];

describe('evaluateNode', () => {
	it('shows the sum on the output node', () => {
		expect(evaluateNode('result', nodes, edges)).toEqual({ state: 'ok', value: 10 });
	});

	it('leaves a train node for the runner', () => {
		expect(
			evaluateNode(
				'result',
				[
					{ id: 'fit', type: 'train', data: {} },
					{ id: 'result', type: 'output', data: {} }
				],
				[{ source: 'fit', target: 'result' }]
			)
		).toEqual({ state: 'empty' });
	});

	it('reports an empty sum', () => {
		const empty = nodes.map((node) =>
			node.id === 'numbers' ? { ...node, data: { values: [] } } : node
		);
		expect(evaluateNode('result', empty, edges)).toEqual({
			state: 'error',
			error: 'Sum needs at least one number'
		});
	});

	it('parses a comma-separated list', () => {
		expect(parseNumberList('1, 2, 3')).toEqual([1, 2, 3]);
		expect(parseNumberList('1, 2,')).toEqual([1, 2]);
		expect(parseNumberList('')).toEqual([]);
		expect(parseNumberList('1, a')).toBeNull();
	});
});
