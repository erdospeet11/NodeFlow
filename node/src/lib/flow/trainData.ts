import { parseNumberList } from './numberList';

export function parseTrainData(text: string): number[] | number[][] | null {
	const lines = text
		.trim()
		.split(/\n+/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
	if (lines.length === 0) return [];
	const parsed = lines.map((line) => parseNumberList(line));
	if (parsed.some((row) => row === null)) return null;
	const rows = parsed as number[][];
	if (rows.every((row) => row.length === 1)) return rows.map((row) => row[0]);
	if (rows.some((row) => row.length < 2)) return null;
	if (rows.some((row) => row.length !== rows[0].length)) return null;
	if (rows.length === 1) return rows[0];
	return rows;
}

export function formatTrainData(data: number[] | number[][] | undefined): string {
	if (data === undefined) return '';
	if (data.length === 0) return '';
	if (typeof data[0] === 'number') return (data as number[]).join(', ');
	return (data as number[][]).map((row) => row.join(', ')).join('\n');
}
