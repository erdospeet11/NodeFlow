<script lang="ts">
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';

	let { data }: NodeProps = $props();
</script>

<div
	class="min-w-[140px] rounded-lg border border-sky-500/30 bg-[#1a1a1a] px-3 py-2.5 shadow-sm"
>
	<p class="text-[10px] font-medium tracking-wide text-sky-400/90 uppercase">Process</p>
	<p class="mt-0.5 text-sm text-[#ececec]">{data.label}</p>
	<Handle
		type="target"
		position={Position.Left}
		class="!size-2.5 !border-[#1a1a1a] !bg-sky-400"
	/>
	<Handle
		type="source"
		position={Position.Right}
		class="!size-2.5 !border-[#1a1a1a] !bg-sky-400"
	/>
</div>
