import { parseRunResult, type RunRequest, type RunResult } from './graphContract';

export async function postRun(request: RunRequest, signal: AbortSignal): Promise<RunResult> {
	const response = await fetch('/runs', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(request),
		signal
	});
	const payload: unknown = await response.json().catch(() => null);
	if (!response.ok) {
		throw new Error(errorDetail(payload, response.status));
	}
	return parseRunResult(payload);
}

export function isAbortError(error: unknown): boolean {
	return error instanceof DOMException && error.name === 'AbortError';
}

function errorDetail(payload: unknown, status: number): string {
	if (isRecord(payload) && typeof payload.detail === 'string' && payload.detail) {
		return payload.detail;
	}
	return `Run failed (${status})`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}
