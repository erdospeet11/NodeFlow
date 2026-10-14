<script lang="ts">
    import { SvelteFlow, Background, Controls, type ColorMode } from '@xyflow/svelte';
    import '@xyflow/svelte/dist/style.css';

    let colorMode : ColorMode = 'dark';
</script>

<div style:width="100vw" style:height="100vh">
    <SvelteFlow {colorMode}>
        <Background />
        <Controls />
    </SvelteFlow>
</div>