import { describe, expect, it } from 'vitest';
import { applyProcess } from './processFunctions';

const values = [1, 2, 3, 4];

describe('applyProcess', () => {
	it('returns the sum', () => {
		expect(applyProcess(values, { fn: 'sum' })).toEqual({ kind: 'scalar', value: 10 });
	});

	it('returns the mean', () => {
		expect(applyProcess(values, { fn: 'mean' })).toEqual({ kind: 'scalar', value: 2.5 });
	});

	it('returns the minimum', () => {
		expect(applyProcess([3, -2, 8], { fn: 'min' })).toEqual({ kind: 'scalar', value: -2 });
	});

	it('returns the maximum', () => {
		expect(applyProcess([3, -2, 8], { fn: 'max' })).toEqual({ kind: 'scalar', value: 8 });
	});

	it('maps each number by multiplying, adding, or squaring', () => {
		expect(applyProcess(values, { fn: 'map', mapOp: 'multiply', operand: 2 })).toEqual({
			kind: 'list',
			value: [2, 4, 6, 8]
		});
		expect(applyProcess(values, { fn: 'map', mapOp: 'add', operand: 10 })).toEqual({
			kind: 'list',
			value: [11, 12, 13, 14]
		});
		expect(applyProcess([-2, 3], { fn: 'map', mapOp: 'square' })).toEqual({
			kind: 'list',
			value: [4, 9]
		});
	});

	it('rejects an empty reduction and non-finite numbers', () => {
		expect(() => applyProcess([], { fn: 'mean' })).toThrow(/at least one number/);
		expect(() => applyProcess([1, Number.NaN], { fn: 'max' })).toThrow(/finite numbers/);
	});
});
