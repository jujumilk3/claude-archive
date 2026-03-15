<script lang="ts">
	import '../app.css';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { browser } from '$app/environment';
	import { navigating } from '$app/state';
	import { t } from '$lib/i18n';
	import { settings, resolvedTheme, applyTheme, applyFontSize } from '$lib/stores/settings';
	import { sidebarRef as sidebarStore } from '$lib/stores/sidebar';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
	let sidebarCollapsed = $state(false);
	let sidebarRef = $state<Sidebar>();

	$effect(() => {
		sidebarStore.set(sidebarRef ?? null);
	});
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

			const themeMq = window.matchMedia('(prefers-color-scheme: dark)');
			const themeHandler = () => {
				if ($settings.theme === 'system') {
					applyTheme(themeMq.matches ? 'dark' : 'light');
				}
			};
			themeMq.addEventListener('change', themeHandler);

			return () => {
				mq.removeEventListener('change', handler);
				themeMq.removeEventListener('change', themeHandler);
			};
		}
	});

	$effect(() => {
		if (browser) {
			applyTheme($resolvedTheme);
		}
	});

	$effect(() => {
		if (browser) {
			applyFontSize($settings.fontSize);
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

<svelte:head>
	<title>Claude Archive</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div class="flex h-screen overflow-hidden">
	{#if isMobile}
		{#if !sidebarCollapsed}
			<button
				class="fixed inset-0 z-30 bg-black/50"
				onclick={() => (sidebarCollapsed = true)}
				aria-label={$t('sidebar.closeSidebar')}
			></button>
			<div class="fixed inset-y-0 left-0 z-40 w-[288px]">
				<Sidebar bind:this={sidebarRef} onNavigate={handleSidebarNavigate}
				initialConversations={data.initialConversations}
				hasMoreInitial={data.hasMoreConversations} />
			</div>
		{/if}
	{:else}
		<!-- Collapsed icon strip -->
		{#if sidebarCollapsed}
			<div class="icon-strip shrink-0 flex flex-col items-center border-r border-border bg-bg-sidebar py-3 gap-4" style="width: 48px;">
				<button
					onclick={toggleSidebar}
					class="rounded-md p-2 text-text-secondary hover:bg-bg-primary hover:text-text-primary"
					title={$t('sidebar.openSidebarShortcut')}
					aria-label={$t('sidebar.openSidebar')}
				>
					<!-- sidebar panel icon -->
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<rect x="3" y="3" width="18" height="18" rx="2" />
						<path d="M9 3v18" />
					</svg>
				</button>
			</div>
		{/if}

		<!-- Full sidebar -->
		<div
			class="shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out"
			style="width: {sidebarCollapsed ? 0 : 288}px"
		>
			<Sidebar bind:this={sidebarRef} onNavigate={handleSidebarNavigate}
				initialConversations={data.initialConversations}
				hasMoreInitial={data.hasMoreConversations} />
		</div>
	{/if}

	<div class="relative flex-1 min-w-0">
		{#if navigating.to}
			<div class="absolute left-0 right-0 top-0 z-50 h-0.5 overflow-hidden bg-bg-sidebar">
				<div class="nav-progress h-full bg-accent"></div>
			</div>
		{/if}

		{#if !sidebarCollapsed && !isMobile}
			<button
				onclick={toggleSidebar}
				class="absolute left-3 top-3 z-10 rounded-md p-1.5 text-text-secondary hover:bg-bg-sidebar hover:text-text-primary"
				title={$t('sidebar.closeSidebarShortcut')}
				aria-label={$t('sidebar.closeSidebar')}
			>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<rect x="3" y="3" width="18" height="18" rx="2" />
					<path d="M9 3v18" />
				</svg>
			</button>
		{/if}

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
