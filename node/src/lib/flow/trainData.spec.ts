import { describe, expect, it } from 'vitest';
import { parseRunRequest } from './graphContract';
import { parseTrainData } from './trainData';
import { toRunRequest } from './toRunRequest';

describe('parseTrainData', () => {
	it('reads a numeric list or a table', () => {
		expect(parseTrainData('1, 3, 5')).toEqual([1, 3, 5]);
		expect(parseTrainData('1\n3\n5')).toEqual([1, 3, 5]);
		expect(parseTrainData('0, 0, 1\n1, 0, 3')).toEqual([
			[0, 0, 1],
			[1, 0, 3]
		]);
		expect(parseTrainData('')).toEqual([]);
		expect(parseTrainData('1, a')).toBeNull();
	});
});

describe('train contract', () => {
	it('maps a train node and rejects a path outside storage', () => {
		const request = toRunRequest(
			[
				{
					id: 'fit',
					type: 'train',
					data: { label: 'Train', userId: 'local', path: 'models/linear.json', data: [1, 3, 5] }
				}
			],
			[]
		);
		expect(request.nodes[0]).toMatchObject({
			type: 'train',
			config: { userId: 'local', path: 'models/linear.json', data: [1, 3, 5] }
		});
		expect(() =>
			parseRunRequest({
				version: 1,
				nodes: [
					{
						id: 'fit',
						type: 'train',
						config: { userId: 'local', path: '../secret.json' },
						ports: [
							{ id: 'in', direction: 'in' },
							{ id: 'out', direction: 'out' }
						]
					}
				],
				edges: []
			})
		).toThrow(/Invalid path/);
	});
});
