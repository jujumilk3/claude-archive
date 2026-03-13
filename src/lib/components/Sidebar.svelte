<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	interface Conversation {
		uuid: string;
		name: string;
		first_message_preview: string | null;
		updated_at: string;
	}

	interface SearchResult {
		message_uuid: string;
		conversation_uuid: string;
		conversation_name: string;
		snippet: string;
		message_sender: string;
		created_at: string;
	}

	interface DateGroup {
		label: string;
		conversations: Conversation[];
	}

	let { onNavigate }: { onNavigate?: () => void } = $props();

	let conversations: Conversation[] = $state([]);
	let searchResults: SearchResult[] = $state([]);
	let searchQuery = $state('');
	let isSearching = $state(false);
	let hasMore = $state(true);
	let loading = $state(false);
	let searchTotal = $state(0);
	let selectedIndex = $state(-1);
	let debounceTimer: ReturnType<typeof setTimeout>;
	let listEl: HTMLElement;
	let searchInputEl: HTMLInputElement;

	export function focusSearch() {
		searchInputEl?.focus();
	}

	export function clearSearchState() {
		clearSearch();
	}

	const currentUuid = $derived($page.params?.uuid || '');

	$effect(() => {
		loadConversations();
	});

	async function loadConversations(offset = 0) {
		if (loading) return;
		loading = true;

		try {
			const res = await fetch(`/api/conversations?offset=${offset}&limit=50`);
			const data = await res.json();

			if (offset === 0) {
				conversations = data.conversations;
			} else {
				conversations = [...conversations, ...data.conversations];
			}
			hasMore = data.hasMore;
		} finally {
			loading = false;
		}
	}

	function handleScroll() {
		if (!listEl || isSearching || !hasMore || loading) return;
		const { scrollTop, scrollHeight, clientHeight } = listEl;
		if (scrollHeight - scrollTop - clientHeight < 200) {
			loadConversations(conversations.length);
		}
	}

	function handleSearchInput() {
		clearTimeout(debounceTimer);
		selectedIndex = -1;
		if (searchQuery.length < 2) {
			isSearching = false;
			searchResults = [];
			return;
		}
		debounceTimer = setTimeout(async () => {
			isSearching = true;
			const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
			const data = await res.json();
			searchResults = data.results;
			searchTotal = data.total;
		}, 300);
	}

	function clearSearch() {
		searchQuery = '';
		isSearching = false;
		searchResults = [];
		selectedIndex = -1;
	}

	function handleSearchKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			clearSearch();
			return;
		}

		if (!isSearching || searchResults.length === 0) return;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = selectedIndex < searchResults.length - 1 ? selectedIndex + 1 : 0;
			scrollSelectedIntoView();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : searchResults.length - 1;
			scrollSelectedIntoView();
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const idx = selectedIndex >= 0 ? selectedIndex : 0;
			const result = searchResults[idx];
			if (result) {
				goto(`/chat/${result.conversation_uuid}?highlight=${result.message_uuid}&q=${encodeURIComponent(searchQuery)}`);
				onNavigate?.();
			}
		}
	}

	function scrollSelectedIntoView() {
		requestAnimationFrame(() => {
			const el = listEl?.querySelector(`[data-result-index="${selectedIndex}"]`);
			el?.scrollIntoView({ block: 'nearest' });
		});
	}

	function getDisplayName(conv: Conversation): string {
		if (conv.name) return conv.name;
		if (conv.first_message_preview) return conv.first_message_preview;
		return '(제목 없음)';
	}

	function groupByDate(items: Conversation[]): DateGroup[] {
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const yesterday = new Date(today.getTime() - 86400000);
		const last7 = new Date(today.getTime() - 7 * 86400000);
		const last30 = new Date(today.getTime() - 30 * 86400000);

		const groups: Map<string, Conversation[]> = new Map();
		const groupOrder: string[] = [];

		function addToGroup(label: string, conv: Conversation) {
			if (!groups.has(label)) {
				groups.set(label, []);
				groupOrder.push(label);
			}
			groups.get(label)!.push(conv);
		}

		for (const conv of items) {
			const d = new Date(conv.updated_at);
			if (d >= today) {
				addToGroup('오늘', conv);
			} else if (d >= yesterday) {
				addToGroup('어제', conv);
			} else if (d >= last7) {
				addToGroup('지난 7일', conv);
			} else if (d >= last30) {
				addToGroup('지난 30일', conv);
			} else {
				const label = `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
				addToGroup(label, conv);
			}
		}

		return groupOrder.map((label) => ({
			label,
			conversations: groups.get(label)!
		}));
	}

	const dateGroups = $derived(groupByDate(conversations));
</script>

<aside class="flex h-full w-[260px] min-w-[260px] flex-col border-r border-border bg-bg-sidebar">
	<div class="p-3">
		<div class="relative">
			<input
				type="text"
				placeholder="검색... (⌘K)"
				bind:value={searchQuery}
				bind:this={searchInputEl}
				oninput={handleSearchInput}
				onkeydown={handleSearchKeydown}
				class="w-full rounded-md border border-border bg-bg-primary px-3 py-1.5 text-sm text-text-primary placeholder-text-secondary outline-none focus:border-accent"
			/>
			{#if searchQuery}
				<button
					onclick={clearSearch}
					class="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
				>
					✕
				</button>
			{/if}
		</div>
	</div>

	<nav
		class="flex-1 overflow-y-auto px-2"
		bind:this={listEl}
		onscroll={handleScroll}
	>
		{#if isSearching}
			{#if searchResults.length === 0}
				<p class="px-3 py-4 text-center text-sm text-text-secondary">검색 결과가 없습니다</p>
			{:else}
				<p class="px-3 py-1 text-xs text-text-secondary">{searchTotal}개 결과</p>
				{#each searchResults as result, i}
					<button
						data-result-index={i}
						onclick={() => { goto(`/chat/${result.conversation_uuid}?highlight=${result.message_uuid}&q=${encodeURIComponent(searchQuery)}`); onNavigate?.(); }}
						class="mb-1 w-full rounded-md px-3 py-2 text-left {selectedIndex === i ? 'bg-bg-primary ring-1 ring-accent' : 'hover:bg-bg-primary'}"
					>
						<div class="truncate text-sm text-text-primary">
							{result.conversation_name || '(제목 없음)'}
						</div>
						<div class="mt-0.5 line-clamp-2 text-xs text-text-secondary">
							{@html result.snippet}
						</div>
					</button>
				{/each}
			{/if}
		{:else}
			{#each dateGroups as group}
				<div class="mb-2">
					<h3 class="px-3 py-1 text-xs font-medium text-text-secondary">{group.label}</h3>
					{#each group.conversations as conv}
						<button
							onclick={() => { goto(`/chat/${conv.uuid}`); onNavigate?.(); }}
							class="w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors {currentUuid === conv.uuid
								? 'bg-bg-primary text-text-primary'
								: 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'}"
						>
							<span class="line-clamp-1">{getDisplayName(conv)}</span>
						</button>
					{/each}
				</div>
			{/each}

			{#if loading && conversations.length === 0}
				<div class="space-y-1 px-1">
					{#each Array(12) as _}
						<div class="rounded-md px-3 py-2">
							<div class="skeleton h-4 w-full"></div>
						</div>
					{/each}
				</div>
			{:else if loading}
				<div class="py-4 text-center text-sm text-text-secondary">로딩 중...</div>
			{/if}

			{#if conversations.length === 0 && !loading}
				<p class="px-3 py-4 text-center text-sm text-text-secondary">대화가 없습니다</p>
			{/if}
		{/if}
	</nav>

	<div class="border-t border-border p-2">
		<button
			onclick={() => { goto('/projects'); onNavigate?.(); }}
			class="w-full rounded-md px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-bg-primary hover:text-text-primary"
		>
			📁 프로젝트
		</button>
	</div>
</aside>
