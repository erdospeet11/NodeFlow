import type { RunLogEntry } from './runLog';

export const canvasRun = $state({
	debugging: false,
	entries: [] as RunLogEntry[]
});
