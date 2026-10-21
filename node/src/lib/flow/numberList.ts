export function parseNumberList(text: string): number[] | null {
	const trimmed = text.trim();
	if (trimmed === '') return [];
	const parts = trimmed.split(/[\s,]+/).filter((part) => part.length > 0);
	if (parts.length === 0) return [];
	const numbers = parts.map((part) => Number(part));
	if (numbers.some((value) => !Number.isFinite(value))) return null;
	return numbers;
}

export function formatNumberList(values: readonly number[]): string {
	return values.join(', ');
}

export type FlowValue = number | readonly number[] | readonly (readonly number[])[] | string;

export function formatFlowValue(value: FlowValue): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'number') return String(value);
	if (Array.isArray(value[0])) {
		return (value as readonly (readonly number[])[]).map((row) => row.join(', ')).join('; ');
	}
	return formatNumberList(value as readonly number[]);
}

export function formatRunValue(value: FlowValue | null): string {
	if (value === null) return '—';
	const text = formatFlowValue(value);
	return text === '' ? '[]' : text;
}
