<script lang="ts">
	import { canvasRun } from './canvasRun.svelte';
	import DebugIo from './DebugIo.svelte';

	let { nodeId }: { nodeId: string } = $props();
	const entry = $derived(canvasRun.entries.find((item) => item.nodeId === nodeId) ?? null);
</script>

{#if canvasRun.debugging && entry}
	<div class="mt-2 border-t border-white/10 pt-1.5" data-node-debug={nodeId}>
		<DebugIo {entry} />
	</div>
{/if}
