export const PROCESS_FUNCTIONS = [
	{
		id: 'sum',
		label: 'Sum',
		description: 'Add the numbers together'
	},
	{
		id: 'mean',
		label: 'Mean',
		description: 'Average of the numbers'
	},
	{
		id: 'min',
		label: 'Min',
		description: 'Smallest number'
	},
	{
		id: 'max',
		label: 'Max',
		description: 'Largest number'
	},
	{
		id: 'map',
		label: 'Map',
		description: 'Apply an operation to each number'
	}
] as const;

export type ProcessFunctionId = (typeof PROCESS_FUNCTIONS)[number]['id'];

export const MAP_OPS = [
	{ id: 'multiply', label: 'Multiply', needsOperand: true },
	{ id: 'add', label: 'Add', needsOperand: true },
	{ id: 'square', label: 'Square', needsOperand: false }
] as const;

export type MapOp = (typeof MAP_OPS)[number]['id'];

export type ProcessConfig = {
	fn: ProcessFunctionId;
	mapOp?: MapOp;
	operand?: number;
};

export type ProcessNodeData = {
	label: string;
	fn: ProcessFunctionId;
	mapOp: MapOp;
	operand: number;
};

export type ProcessResult =
	| { kind: 'scalar'; value: number }
	| { kind: 'list'; value: number[] };

const FUNCTION_IDS = new Set<string>(PROCESS_FUNCTIONS.map((item) => item.id));

export function isProcessFunctionId(value: unknown): value is ProcessFunctionId {
	return typeof value === 'string' && FUNCTION_IDS.has(value);
}

export function processFunctionLabel(id: ProcessFunctionId): string {
	return PROCESS_FUNCTIONS.find((item) => item.id === id)?.label ?? 'Process';
}

function assertNumbers(values: readonly number[]): void {
	if (values.some((value) => !Number.isFinite(value))) {
		throw new Error('Process functions only accept finite numbers');
	}
}

function assertNonEmpty(values: readonly number[], name: string): void {
	if (values.length === 0) {
		throw new Error(`${name} needs at least one number`);
	}
}

export function applyProcess(values: readonly number[], config: ProcessConfig): ProcessResult {
	assertNumbers(values);

	switch (config.fn) {
		case 'sum': {
			assertNonEmpty(values, 'Sum');
			return { kind: 'scalar', value: values.reduce((total, value) => total + value, 0) };
		}
		case 'mean': {
			assertNonEmpty(values, 'Mean');
			const total = values.reduce((sum, value) => sum + value, 0);
			return { kind: 'scalar', value: total / values.length };
		}
		case 'min': {
			assertNonEmpty(values, 'Min');
			return { kind: 'scalar', value: values.reduce((lowest, value) => Math.min(lowest, value)) };
		}
		case 'max': {
			assertNonEmpty(values, 'Max');
			return { kind: 'scalar', value: values.reduce((highest, value) => Math.max(highest, value)) };
		}
		case 'map': {
			const op = config.mapOp ?? 'multiply';
			const operand = config.operand ?? 1;
			if (op !== 'square' && !Number.isFinite(operand)) {
				throw new Error('Map needs a finite number');
			}
			return {
				kind: 'list',
				value: values.map((value) => {
					if (op === 'add') return value + operand;
					if (op === 'square') return value * value;
					return value * operand;
				})
			};
		}
	}
}
