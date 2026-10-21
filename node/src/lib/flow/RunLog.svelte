<script lang="ts">
	import DebugIo from './DebugIo.svelte';
	import { formatRunValue } from './numberList';
	import type { FlowRunState } from './runContext';

	let { run, debugging }: { run: FlowRunState; debugging: boolean } = $props();

	const statusLabel = $derived(
		run.status === 'running'
			? 'Running'
			: run.status === 'aborted'
				? 'Stopped'
				: run.status === 'ok'
					? 'OK'
					: 'Error'
	);
</script>

{#if run.status !== 'idle'}
	<aside
		class="absolute right-3 bottom-3 z-10 flex max-h-[45%] w-72 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#171717]/95 shadow-2xl shadow-black/40"
		aria-live="polite"
		aria-label="Run log"
		data-run-log
		data-run-status={run.status}
	>
		<div class="flex items-center justify-between border-b border-white/10 px-3 py-2">
			<p class="text-[10px] font-medium tracking-wide text-[#8e8e8e] uppercase">Run</p>
			<p class="text-[10px] text-[#b4b4b4]">{statusLabel}</p>
		</div>
		<div class="min-h-0 overflow-y-auto px-3 py-2">
			{#if run.status === 'error' && run.message}
				<p class="text-xs text-red-300">{run.message}</p>
			{/if}
			{#if run.status === 'ok' && run.entries.length === 0}
				<p class="text-xs text-[#8e8e8e]">No nodes</p>
			{/if}
			<ol class="space-y-1.5">
				{#each run.entries as entry, index (entry.nodeId)}
					<li class="text-xs" data-run-entry={entry.nodeId}>
						<div class="flex items-baseline justify-between gap-3">
							<span class="truncate text-[#ececec]">{index + 1}. {entry.label}</span>
							{#if !debugging}
								{#if entry.status === 'ok'}
									<span class="shrink-0 text-[#ececec]">{formatRunValue(entry.output ?? null)}</span
									>
								{:else}
									<span class="shrink-0 text-right text-red-300">{entry.error}</span>
								{/if}
							{/if}
						</div>
						{#if debugging}
							<DebugIo {entry} />
						{/if}
					</li>
				{/each}
			</ol>
		</div>
	</aside>
{/if}
