<script lang="ts">
	import { Handle, Position, useEdges, useNodes, type NodeProps } from '@xyflow/svelte';
	import { evaluateNode } from '../evaluateFlow';
	import NodeDebug from '../NodeDebug.svelte';
	import { formatFlowValue } from '../numberList';

	let { id }: NodeProps = $props();
	const nodes = useNodes();
	const edges = useEdges();

	const evaluation = $derived(evaluateNode(id, nodes.current, edges.current));
</script>

<div
	class="min-w-[140px] rounded-lg border border-violet-500/30 bg-[#1a1a1a] px-3 py-2.5 shadow-sm"
>
	<p class="text-[10px] font-medium tracking-wide text-violet-400/90 uppercase">Output</p>
	{#if evaluation.state === 'empty'}
		<p class="mt-1 text-sm text-[#8e8e8e]">No value</p>
	{:else if evaluation.state === 'error'}
		<p class="mt-1 text-xs text-red-300">{evaluation.error}</p>
	{:else}
		<p class="mt-1 text-sm text-[#ececec]">{formatFlowValue(evaluation.value)}</p>
	{/if}
	<NodeDebug nodeId={id} />
	<Handle
		id="in"
		type="target"
		position={Position.Left}
		class="!size-2.5 !border-[#1a1a1a] !bg-violet-400"
	/>
</div>
