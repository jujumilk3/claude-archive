<script lang="ts">
	import '../app.css';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { browser } from '$app/environment';
	import { navigating } from '$app/stores';
	import { t } from '$lib/i18n';
	import { settings, resolvedTheme, applyTheme, applyFontSize } from '$lib/stores/settings';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
	let sidebarCollapsed = $state(false);
	let sidebarRef = $state<Sidebar>();
	let isMobile = $state(false);

	$effect(() => {
		if (browser) {
			const saved = localStorage.getItem('sidebar-collapsed');
			if (saved === 'true') sidebarCollapsed = true;

			const mq = window.matchMedia('(max-width: 767px)');
			isMobile = mq.matches;
			const handler = (e: MediaQueryListEvent) => {
				isMobile = e.matches;
				if (e.matches) sidebarCollapsed = true;
			};
			mq.addEventListener('change', handler);
			if (isMobile) sidebarCollapsed = true;

			applyTheme($resolvedTheme);
			applyFontSize($settings.fontSize);

			return () => mq.removeEventListener('change', handler);
		}
	});

	function toggleSidebar() {
		sidebarCollapsed = !sidebarCollapsed;
		if (browser && !isMobile) {
			localStorage.setItem('sidebar-collapsed', String(sidebarCollapsed));
		}
	}

	function handleSidebarNavigate() {
		if (isMobile) sidebarCollapsed = true;
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
			e.preventDefault();
			toggleSidebar();
		}
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			const wasCollapsed = sidebarCollapsed;
			if (sidebarCollapsed) {
				sidebarCollapsed = false;
				if (browser && !isMobile) localStorage.setItem('sidebar-collapsed', 'false');
			}
			setTimeout(() => {
				sidebarRef?.focusSearch();
			}, wasCollapsed ? 220 : 0);
		}
		if (e.key === 'Escape') {
			if (isMobile && !sidebarCollapsed) {
				sidebarCollapsed = true;
			}
			sidebarRef?.clearSearchState();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex h-screen overflow-hidden">
	{#if isMobile}
		{#if !sidebarCollapsed}
			<button
				class="fixed inset-0 z-30 bg-black/50"
				onclick={() => (sidebarCollapsed = true)}
				aria-label={$t('sidebar.closeSidebar')}
			></button>
			<div class="fixed inset-y-0 left-0 z-40 w-[260px]">
				<Sidebar bind:this={sidebarRef} onNavigate={handleSidebarNavigate}
				initialConversations={data.initialConversations}
				hasMoreInitial={data.hasMoreConversations} />
			</div>
		{/if}
	{:else}
		<div
			class="shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out"
			style="width: {sidebarCollapsed ? 0 : 260}px"
		>
			<Sidebar bind:this={sidebarRef} onNavigate={handleSidebarNavigate}
				initialConversations={data.initialConversations}
				hasMoreInitial={data.hasMoreConversations} />
		</div>
	{/if}

	<div class="relative flex-1">
		{#if $navigating}
			<div class="absolute left-0 right-0 top-0 z-50 h-0.5 overflow-hidden bg-bg-sidebar">
				<div class="nav-progress h-full bg-accent"></div>
			</div>
		{/if}
		<button
			onclick={toggleSidebar}
			class="absolute left-3 top-3 z-10 rounded-md p-1.5 text-text-secondary hover:bg-bg-sidebar hover:text-text-primary"
			title={sidebarCollapsed ? $t('sidebar.openSidebarShortcut') : $t('sidebar.closeSidebarShortcut')}
			aria-label={sidebarCollapsed ? $t('sidebar.openSidebar') : $t('sidebar.closeSidebar')}
		>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M3 12h18M3 6h18M3 18h18" />
			</svg>
		</button>

		{@render children()}
	</div>
</div>

<style>
	.nav-progress {
		animation: progress 1.5s ease-in-out infinite;
	}
	@keyframes progress {
		0% { width: 0%; margin-left: 0%; }
		50% { width: 40%; margin-left: 30%; }
		100% { width: 0%; margin-left: 100%; }
	}
</style>
