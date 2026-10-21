import type { RunLogEntry } from './runLog';

export type FlowRunState = {
	status: 'idle' | 'running' | 'ok' | 'error' | 'aborted';
	message: string;
	entries: RunLogEntry[];
};

export type RunSession = {
	debugging: boolean;
};

export function idleRun(): FlowRunState {
	return { status: 'idle', message: '', entries: [] };
}
