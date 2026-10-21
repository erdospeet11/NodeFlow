<script lang="ts">
	import { Handle, Position, useSvelteFlow, type Node, type NodeProps } from '@xyflow/svelte';
	import NodeDebug from '../NodeDebug.svelte';
	import { formatNumberList, parseNumberList } from '../numberList';

	type InputNodeData = {
		label?: string;
		values?: number[];
	};

	let { id, data }: NodeProps<Node<InputNodeData>> = $props();
	const { updateNodeData } = useSvelteFlow();

	let editing = $state(false);
	let draft = $state('');

	const storedValues = $derived(
		Array.isArray(data.values) && data.values.every((value) => Number.isFinite(value))
			? data.values
			: []
	);
	const parsed = $derived(parseNumberList(draft));

	$effect(() => {
		if (editing) return;
		draft = formatNumberList(storedValues);
	});

	function onInput(event: Event & { currentTarget: HTMLInputElement }) {
		draft = event.currentTarget.value;
		const next = parseNumberList(draft);
		if (!next || same(next, storedValues)) return;
		updateNodeData(id, { values: next });
	}

	function same(left: number[], right: number[]) {
		return left.length === right.length && left.every((value, index) => value === right[index]);
	}
</script>

<div
	class="min-w-[180px] rounded-lg border border-emerald-500/30 bg-[#1a1a1a] px-3 py-2.5 shadow-sm"
>
	<p class="text-[10px] font-medium tracking-wide text-emerald-400/90 uppercase">Input</p>
	<label class="mt-2 block">
		<span class="sr-only">Numbers</span>
		<input
			class="nodrag nopan nowheel w-full rounded-md border border-white/10 bg-[#111] px-2 py-1 text-xs text-[#ececec] outline-none placeholder:text-[#8e8e8e] focus:border-emerald-400/60"
			type="text"
			inputmode="decimal"
			placeholder="1, 2, 3"
			value={draft}
			onfocus={() => (editing = true)}
			oninput={onInput}
			onblur={() => {
				editing = false;
				draft = formatNumberList(storedValues);
			}}
		/>
	</label>
	{#if parsed === null}
		<p class="mt-1 text-[10px] text-red-300">Use numbers separated by commas</p>
	{/if}
	<NodeDebug nodeId={id} />
	<Handle
		id="out"
		type="source"
		position={Position.Right}
		class="!size-2.5 !border-[#1a1a1a] !bg-emerald-400"
	/>
</div>
