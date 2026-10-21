<script lang="ts">
	import { formatRunValue } from './numberList';
	import type { RunLogEntry } from './runLog';

	let { entry }: { entry: RunLogEntry } = $props();
</script>

<p class="text-[10px] leading-4 text-[#8e8e8e]">in {formatRunValue(entry.input)}</p>
{#if entry.status === 'ok'}
	<p class="text-[10px] leading-4 text-[#ececec]">out {formatRunValue(entry.output ?? null)}</p>
{:else}
	<p class="text-[10px] leading-4 text-red-300">{entry.error}</p>
{/if}
