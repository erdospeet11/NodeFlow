<script lang="ts">
	import {
		SvelteFlow,
		Background,
		Controls,
		useSvelteFlow,
		type ColorMode,
		type Node,
		type Edge,
		type XYPosition
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';

	import { NODE_CATALOG, type NodeCatalogItem } from './nodeCatalog';
	import { nodeTypes } from './nodes';

	type Props = {
		nodes?: Node[];
		edges?: Edge[];
		colorMode?: ColorMode;
	};

	let {
		nodes = $bindable<Node[]>([]),
		edges = $bindable<Edge[]>([]),
		colorMode = 'dark'
	}: Props = $props();

	const { screenToFlowPosition } = useSvelteFlow();

	type ContextMenuState = {
		screen: XYPosition;
		flow: XYPosition;
	};

	let menu = $state<ContextMenuState | null>(null);
	let menuEl = $state<HTMLDivElement | null>(null);

	function closeMenu() {
		menu = null;
	}

	function onPaneContextMenu({ event }: { event: MouseEvent }) {
		event.preventDefault();
		menu = {
			screen: { x: event.clientX, y: event.clientY },
			flow: screenToFlowPosition(
				{ x: event.clientX, y: event.clientY },
				{ snapToGrid: false }
			)
		};
	}

	function onPaneClick() {
		closeMenu();
	}

	function addNode(item: NodeCatalogItem) {
		if (!menu) return;

		const newNode: Node = {
			id: crypto.randomUUID(),
			type: item.type,
			position: menu.flow,
			data:
				item.type === 'process'
					? { label: item.label, fn: item.fn ?? 'mean', mapOp: 'multiply', operand: 1 }
					: { label: item.label }
		};

		nodes = [...nodes, newNode];
		closeMenu();
	}

	function onWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') closeMenu();
	}

	function onWindowPointerDown(event: PointerEvent) {
		if (!menu || !menuEl) return;
		if (event.target instanceof Element && menuEl.contains(event.target)) return;
		closeMenu();
	}

	$effect(() => {
		if (!menu || !menuEl) return;

		const padding = 8;
		const { width, height } = menuEl.getBoundingClientRect();
		const maxX = window.innerWidth - width - padding;
		const maxY = window.innerHeight - height - padding;

		menuEl.style.left = `${Math.max(padding, Math.min(menu.screen.x, maxX))}px`;
		menuEl.style.top = `${Math.max(padding, Math.min(menu.screen.y, maxY))}px`;
	});
</script>

<svelte:window onkeydown={onWindowKeydown} onpointerdown={onWindowPointerDown} />

<div class="relative h-full w-full">
	<SvelteFlow
		bind:nodes
		bind:edges
		{nodeTypes}
		{colorMode}
		onpanecontextmenu={onPaneContextMenu}
		onpaneclick={onPaneClick}
	>
		<Background />
		<Controls />
	</SvelteFlow>

	{#if menu}
		<div
			bind:this={menuEl}
			class="fixed z-50 min-w-[200px] overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] py-1 shadow-2xl shadow-black/50"
			style:left="{menu.screen.x}px"
			style:top="{menu.screen.y}px"
			role="menu"
			aria-label="Add node"
		>
			<p class="px-3 py-1.5 text-[10px] font-medium tracking-wide text-[#8e8e8e] uppercase">
				Add node
			</p>
			{#each NODE_CATALOG as item (`${item.type}:${item.fn ?? item.label}`)}
				<button
					type="button"
					role="menuitem"
					class="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors hover:bg-white/8"
					onclick={() => addNode(item)}
				>
					<span class="text-sm text-[#ececec]">{item.label}</span>
					<span class="text-xs text-[#8e8e8e]">{item.description}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
