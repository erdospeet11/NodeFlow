import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GraphContractError, parseRunRequest, parseRunResult, type RunRequest } from './graphContract';

const examples = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../contracts/examples');

function loadExample(name: string): RunRequest {
	return JSON.parse(readFileSync(resolve(examples, name), 'utf8')) as RunRequest;
}

describe('graph contract', () => {
	it('accepts the sum run request and result', () => {
		const request = parseRunRequest(loadExample('sum.request.json'));
		expect(request.nodes.map((node) => node.id)).toEqual(['numbers', 'average', 'result']);
		const result = parseRunResult(
			JSON.parse(readFileSync(resolve(examples, 'sum.result.json'), 'utf8'))
		);
		expect(result.results[1]).toEqual({ nodeId: 'average', status: 'ok', value: 2.5 });
	});

	it('rejects a process config from another function', () => {
		const request = loadExample('sum.request.json');
		const average = request.nodes[1];
		if (average.type !== 'process') throw new Error('expected process node');
		average.config = { fn: 'mean', operand: 2 } as typeof average.config;
		expect(() => parseRunRequest(request)).toThrow(GraphContractError);
	});

	it('rejects an edge that does not land on an in port', () => {
		const request = loadExample('sum.request.json');
		request.edges[0].target = { nodeId: 'average', port: 'out' };
		expect(() => parseRunRequest(request)).toThrow(/target port is not an in port/);
	});
});
