<script lang="ts">
	import '../app.css';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { browser } from '$app/environment';

	let { children } = $props();
	let sidebarCollapsed = $state(false);
	let sidebarRef = $state<Sidebar>();

	$effect(() => {
		if (browser) {
			const saved = localStorage.getItem('sidebar-collapsed');
			if (saved === 'true') sidebarCollapsed = true;
		}
	});

	function toggleSidebar() {
		sidebarCollapsed = !sidebarCollapsed;
		if (browser) {
			localStorage.setItem('sidebar-collapsed', String(sidebarCollapsed));
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
			e.preventDefault();
			toggleSidebar();
		}
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			if (sidebarCollapsed) {
				sidebarCollapsed = false;
				if (browser) localStorage.setItem('sidebar-collapsed', 'false');
			}
			requestAnimationFrame(() => {
				sidebarRef?.focusSearch();
			});
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex h-screen overflow-hidden">
	{#if !sidebarCollapsed}
		<Sidebar bind:this={sidebarRef} />
	{/if}

	<div class="relative flex-1">
		<button
			onclick={toggleSidebar}
			class="absolute left-3 top-3 z-10 rounded-md p-1.5 text-text-secondary hover:bg-bg-sidebar hover:text-text-primary"
			title={sidebarCollapsed ? '사이드바 열기 (⌘B)' : '사이드바 닫기 (⌘B)'}
		>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M3 12h18M3 6h18M3 18h18" />
			</svg>
		</button>

		{@render children()}
	</div>
</div>
