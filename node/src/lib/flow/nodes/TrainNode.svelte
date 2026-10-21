<script lang="ts">
	import {
		Handle,
		Position,
		useEdges,
		useSvelteFlow,
		type Node,
		type NodeProps
	} from '@xyflow/svelte';
	import { canvasRun } from '../canvasRun.svelte';
	import NodeDebug from '../NodeDebug.svelte';
	import { formatTrainData, parseTrainData } from '../trainData';

	type TrainNodeData = {
		label?: string;
		userId?: string;
		path?: string;
		data?: number[] | number[][];
	};

	let { id, data }: NodeProps<Node<TrainNodeData>> = $props();
	const { updateNodeData } = useSvelteFlow();
	const edges = useEdges();
	const connected = $derived(edges.current.some((edge) => edge.target === id));

	let editing = $state(false);
	let draft = $state('');

	const userId = $derived(typeof data.userId === 'string' ? data.userId : 'local');
	const artifactPath = $derived(typeof data.path === 'string' ? data.path : 'models/linear.json');
	const parsed = $derived(parseTrainData(draft));
	const entry = $derived(canvasRun.entries.find((item) => item.nodeId === id) ?? null);

	const fieldClass =
		'nodrag nopan nowheel w-full rounded-md border border-white/10 bg-[#111] px-2 py-1 text-xs text-[#ececec] outline-none focus:border-amber-300/60';

	$effect(() => {
		if (editing) return;
		draft = formatTrainData(data.data);
	});

	function onData(event: Event & { currentTarget: HTMLTextAreaElement }) {
		draft = event.currentTarget.value;
		const next = parseTrainData(draft);
		if (next === null) return;
		if (next.length === 0) {
			updateNodeData(id, { data: undefined });
			return;
		}
		updateNodeData(id, { data: next });
	}
</script>

<div class="min-w-[200px] rounded-lg border border-amber-400/30 bg-[#1a1a1a] px-3 py-2.5 shadow-sm">
	<p class="text-[10px] font-medium tracking-wide text-amber-200/90 uppercase">Train</p>
	<label class="mt-2 block">
		<span class="text-[10px] text-[#8e8e8e]">User</span>
		<input
			class={fieldClass}
			type="text"
			value={userId}
			oninput={(event) => updateNodeData(id, { userId: event.currentTarget.value })}
		/>
	</label>
	<label class="mt-1.5 block">
		<span class="text-[10px] text-[#8e8e8e]">Artifact</span>
		<input
			class={fieldClass}
			type="text"
			value={artifactPath}
			spellcheck="false"
			oninput={(event) => updateNodeData(id, { path: event.currentTarget.value })}
		/>
	</label>
	<label class="mt-1.5 block">
		<span class="text-[10px] text-[#8e8e8e]">Data</span>
		<textarea
			class="{fieldClass} min-h-[3.25rem] resize-y"
			placeholder={'1, 3, 5'}
			value={draft}
			onfocus={() => (editing = true)}
			oninput={onData}
			onblur={() => {
				editing = false;
				draft = formatTrainData(data.data);
			}}></textarea>
	</label>
	{#if parsed === null}
		<p class="mt-1 text-[10px] text-red-300">Use a list, or one row of numbers per line</p>
	{:else if connected}
		<p class="mt-1 text-[10px] text-[#8e8e8e]">A connected input is used instead</p>
	{/if}
	{#if !canvasRun.debugging && entry?.status === 'ok' && typeof entry.output === 'string'}
		<p class="mt-1.5 truncate text-[10px] text-amber-100" title={entry.output}>{entry.output}</p>
	{:else if !canvasRun.debugging && entry?.status === 'error'}
		<p class="mt-1.5 text-[10px] text-red-300">{entry.error}</p>
	{/if}
	<NodeDebug nodeId={id} />
	<Handle
		id="in"
		type="target"
		position={Position.Left}
		class="!size-2.5 !border-[#1a1a1a] !bg-amber-300"
	/>
	<Handle
		id="out"
		type="source"
		position={Position.Right}
		class="!size-2.5 !border-[#1a1a1a] !bg-amber-300"
	/>
</div>
