<script lang="ts">
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';

	let { data }: NodeProps = $props();
</script>

<div
	class="min-w-[140px] rounded-lg border border-emerald-500/30 bg-[#1a1a1a] px-3 py-2.5 shadow-sm"
>
	<p class="text-[10px] font-medium tracking-wide text-emerald-400/90 uppercase">Input</p>
	<p class="mt-0.5 text-sm text-[#ececec]">{data.label}</p>
	<Handle
		type="source"
		position={Position.Right}
		class="!size-2.5 !border-[#1a1a1a] !bg-emerald-400"
	/>
</div>
