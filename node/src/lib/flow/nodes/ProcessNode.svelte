<script lang="ts">
	import { Handle, Position, useSvelteFlow, type Node, type NodeProps } from '@xyflow/svelte';
	import {
		MAP_OPS,
		PROCESS_FUNCTIONS,
		isProcessFunctionId,
		processFunctionLabel,
		type MapOp,
		type ProcessFunctionId,
		type ProcessNodeData
	} from '../processFunctions';

	let { id, data }: NodeProps<Node<ProcessNodeData>> = $props();

	const { updateNodeData } = useSvelteFlow();

	const fn = $derived<ProcessFunctionId>(isProcessFunctionId(data.fn) ? data.fn : 'mean');
	const mapOp = $derived<MapOp>(MAP_OPS.some((op) => op.id === data.mapOp) ? data.mapOp : 'multiply');
	const operand = $derived(Number.isFinite(data.operand) ? data.operand : 1);
	const mapNeedsOperand = $derived(MAP_OPS.find((op) => op.id === mapOp)?.needsOperand ?? false);

	const fieldClass =
		'nodrag nopan nowheel w-full rounded-md border border-white/10 bg-[#111] px-2 py-1 text-xs text-[#ececec] outline-none focus:border-sky-400/60';

	function selectFunction(next: string) {
		if (!isProcessFunctionId(next) || next === fn) return;
		updateNodeData(id, { fn: next, label: processFunctionLabel(next) });
	}

	function selectMapOp(next: string) {
		const op = MAP_OPS.find((item) => item.id === next);
		if (!op || op.id === mapOp) return;
		updateNodeData(id, { mapOp: op.id });
	}

	function setOperand(raw: string) {
		const next = Number(raw);
		if (!Number.isFinite(next) || next === operand) return;
		updateNodeData(id, { operand: next });
	}
</script>

<div class="min-w-[168px] rounded-lg border border-sky-500/30 bg-[#1a1a1a] px-3 py-2.5 shadow-sm">
	<p class="text-[10px] font-medium tracking-wide text-sky-400/90 uppercase">Process</p>
	<label class="mt-2 block">
		<span class="sr-only">Function</span>
		<select class={fieldClass} value={fn} onchange={(event) => selectFunction(event.currentTarget.value)}>
			{#each PROCESS_FUNCTIONS as item (item.id)}
				<option value={item.id}>{item.label}</option>
			{/each}
		</select>
	</label>

	{#if fn === 'map'}
		<label class="mt-1.5 block">
			<span class="sr-only">Map operation</span>
			<select
				class={fieldClass}
				value={mapOp}
				onchange={(event) => selectMapOp(event.currentTarget.value)}
			>
				{#each MAP_OPS as op (op.id)}
					<option value={op.id}>{op.label}</option>
				{/each}
			</select>
		</label>
		{#if mapNeedsOperand}
			<label class="mt-1.5 block">
				<span class="sr-only">Map value</span>
				<input
					class={fieldClass}
					type="number"
					step="any"
					value={operand}
					onchange={(event) => setOperand(event.currentTarget.value)}
				/>
			</label>
		{/if}
	{/if}

	<Handle type="target" position={Position.Left} class="!size-2.5 !border-[#1a1a1a] !bg-sky-400" />
	<Handle type="source" position={Position.Right} class="!size-2.5 !border-[#1a1a1a] !bg-sky-400" />
</div>
