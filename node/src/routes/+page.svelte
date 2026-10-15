<script lang="ts">
	import { SvelteFlowProvider, type Edge, type Node } from '@xyflow/svelte';
	import FlowCanvas from '#lib/flow/FlowCanvas.svelte';

	type FlowItem = {
		id: string;
		name: string;
		nodes: Node[];
		edges: Edge[];
	};

	let flows = $state<FlowItem[]>([]);
	let activeFlowId = $state<string | null>(null);
	let running = $state(false);
	let debugging = $state(false);
	let flowNumber = 1;

	const activeFlow = $derived(flows.find((flow) => flow.id === activeFlowId) ?? null);

	function createFlow() {
		const flow: FlowItem = {
			id: crypto.randomUUID(),
			name: `Flow ${flowNumber++}`,
			nodes: [],
			edges: []
		};
		flows.push(flow);
		activeFlowId = flow.id;
	}

	function selectFlow(id: string) {
		activeFlowId = id;
	}

	function start() {
		running = true;
	}

	function stop() {
		running = false;
	}

	function toggleDebug() {
		debugging = !debugging;
	}
</script>

<div class="flex h-screen w-screen overflow-hidden bg-[#212121] text-[#ececec]">
	<aside class="flex w-[260px] shrink-0 flex-col border-r border-white/10 bg-[#171717] px-2 py-2">
		<button
			type="button"
			class="flex h-10 items-center gap-2.5 rounded-lg bg-white/[0.06] px-3 text-sm font-medium text-[#ececec] transition-colors hover:bg-white/10"
			onclick={createFlow}
		>
			<svg viewBox="0 0 24 24" class="size-4 shrink-0" fill="none" aria-hidden="true">
				<path
					d="M12 5v14M5 12h14"
					stroke="currentColor"
					stroke-width="1.75"
					stroke-linecap="round"
				/>
			</svg>
			New Flow
		</button>

		<nav class="mt-2 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto" aria-label="Flows">
			{#each flows as flow (flow.id)}
				<button
					type="button"
					class="flex h-9 w-full items-center truncate rounded-lg px-3 text-left text-sm text-[#ececec] transition-colors hover:bg-white/8 {flow.id ===
					activeFlowId
						? 'bg-white/10'
						: ''}"
					aria-current={flow.id === activeFlowId ? 'true' : undefined}
					onclick={() => selectFlow(flow.id)}
				>
					<span class="truncate">{flow.name}</span>
				</button>
			{/each}
		</nav>
	</aside>

	<section class="flex min-w-0 flex-1 flex-col">
		{#if activeFlow}
			<header
				class="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-white/10 bg-[#171717] px-3"
			>
				<p class="truncate px-2 text-sm text-[#b4b4b4]">
					{activeFlow.name}
				</p>

				<div class="flex items-center gap-1">
					<button
						type="button"
						class="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-white/8 {running
							? 'bg-emerald-500/15 text-emerald-300'
							: 'text-[#ececec]'}"
						aria-pressed={running}
						onclick={start}
					>
						<svg viewBox="0 0 24 24" class="size-3.5" fill="currentColor" aria-hidden="true">
							<path d="M8 5.5v13l11-6.5-11-6.5z" />
						</svg>
						Start
					</button>
					<button
						type="button"
						class="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-[#ececec] transition-colors hover:bg-white/8"
						onclick={stop}
					>
						<svg viewBox="0 0 24 24" class="size-3" fill="currentColor" aria-hidden="true">
							<rect x="6" y="6" width="12" height="12" rx="1.5" />
						</svg>
						Stop
					</button>
					<button
						type="button"
						class="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-white/8 {debugging
							? 'bg-amber-400/15 text-amber-200'
							: 'text-[#ececec]'}"
						aria-pressed={debugging}
						onclick={toggleDebug}
					>
						<svg viewBox="0 0 24 24" class="size-3.5" fill="none" aria-hidden="true">
							<path
								d="M8 9a4 4 0 0 1 8 0v2H8V9zM7 11H5m14 0h-2M8 15H6m12 0h-2M9 19v2m6-2v2M8 13h8v2a4 4 0 0 1-8 0v-2z"
								stroke="currentColor"
								stroke-width="1.75"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
						Debug
					</button>
				</div>
			</header>

			<div class="min-h-0 flex-1">
				{#each flows as flow (flow.id)}
					{#if flow.id === activeFlowId}
						<SvelteFlowProvider>
							<FlowCanvas bind:nodes={flow.nodes} bind:edges={flow.edges} />
						</SvelteFlowProvider>
					{/if}
				{/each}
			</div>
		{:else}
			<div class="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
				<h1 class="text-2xl font-semibold tracking-tight text-[#ececec]">NodeFlow</h1>
				<p class="mt-3 max-w-md text-sm leading-relaxed text-[#b4b4b4]">
					Create a flow to open the canvas and start connecting nodes. Use
					<span class="text-[#ececec]">New Flow</span> in the sidebar to begin.
				</p>
				<button
					type="button"
					class="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-white/[0.08] px-4 text-sm font-medium text-[#ececec] transition-colors hover:bg-white/12"
					onclick={createFlow}
				>
					<svg viewBox="0 0 24 24" class="size-4 shrink-0" fill="none" aria-hidden="true">
						<path
							d="M12 5v14M5 12h14"
							stroke="currentColor"
							stroke-width="1.75"
							stroke-linecap="round"
						/>
					</svg>
					New Flow
				</button>
			</div>
		{/if}
	</section>
</div>
