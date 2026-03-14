<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { t, locale, formatMonthYear, formatRelativeTime } from '$lib/i18n';
	import SourceLogo from './SourceLogo.svelte';

	interface Conversation {
		uuid: string;
		name: string;
		summary: string;
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

	let {
		onNavigate,
		initialConversations = [],
		hasMoreInitial = true
	}: {
		onNavigate?: () => void;
		initialConversations?: Conversation[];
		hasMoreInitial?: boolean;
	} = $props();

	let conversations: Conversation[] = $state([]);
	let searchResults: SearchResult[] = $state([]);
	let searchQuery = $state('');
	let isSearching = $state(false);
	let hasMore = $state(true);
	let loading = $state(false);
	let initialized = false;
	let searchTotal = $state(0);
	let searchHasMore = $state(false);
	let searchLoading = $state(false);
	let selectedIndex = $state(-1);
	let searchFocused = $state(false);
	let searchPending = $state(false);
	let searchHistory: string[] = $state(loadSearchHistory());
	let debounceTimer: ReturnType<typeof setTimeout>;
	let listEl: HTMLElement;
	let searchInputEl: HTMLInputElement;

	const SEARCH_HISTORY_KEY = 'claude-archive-search-history';
	const MAX_HISTORY = 10;

	function loadSearchHistory(): string[] {
		if (typeof localStorage === 'undefined') return [];
		try {
			return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
		} catch {
			return [];
		}
	}

	function saveSearchTerm(term: string) {
		const trimmed = term.trim();
		if (trimmed.length < 2) return;
		searchHistory = [trimmed, ...searchHistory.filter((t) => t !== trimmed)].slice(0, MAX_HISTORY);
		localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searchHistory));
	}

	function removeHistoryItem(term: string) {
		searchHistory = searchHistory.filter((t) => t !== term);
		localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searchHistory));
	}

	function useHistoryItem(term: string) {
		searchQuery = term;
		handleSearchInput();
	}

	const showHistory = $derived(searchFocused && !searchQuery && searchHistory.length > 0 && !isSearching);

	export function focusSearch() {
		searchInputEl?.focus();
	}

	export function clearSearchState() {
		clearSearch();
	}

	const currentUuid = $derived(page.params?.uuid || '');
	const isProjectsPage = $derived(page.url?.pathname === '/projects');
	const isSettingsPage = $derived(page.url?.pathname === '/settings');

	$effect(() => {
		if (!initialized) {
			initialized = true;
			if (initialConversations.length > 0) {
				conversations = initialConversations;
				hasMore = hasMoreInitial;
			} else {
				loadConversations();
			}
		}
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
		} catch {
			if (offset === 0) {
				conversations = [];
			}
			hasMore = false;
		} finally {
			loading = false;
		}
	}

	function handleScroll() {
		if (!listEl) return;
		const { scrollTop, scrollHeight, clientHeight } = listEl;
		if (scrollHeight - scrollTop - clientHeight < 200) {
			if (isSearching) {
				loadMoreSearchResults();
			} else if (hasMore && !loading) {
				loadConversations(conversations.length);
			}
		}
	}

	async function loadMoreSearchResults() {
		if (!searchHasMore || searchLoading || !searchQuery) return;
		searchLoading = true;
		try {
			const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&offset=${searchResults.length}&limit=20`);
			const data = await res.json();
			searchResults = [...searchResults, ...data.results];
			searchHasMore = data.hasMore;
		} catch {
			searchHasMore = false;
		} finally {
			searchLoading = false;
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
		isSearching = true;
		searchPending = true;
		debounceTimer = setTimeout(async () => {
			try {
				const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&offset=0&limit=20`);
				const data = await res.json();
				searchResults = data.results;
				searchTotal = data.total;
				searchHasMore = data.hasMore;
			} catch {
				searchResults = [];
				searchTotal = 0;
				searchHasMore = false;
			} finally {
				searchPending = false;
			}
		}, 300);
	}

	function clearSearch() {
		clearTimeout(debounceTimer);
		searchQuery = '';
		isSearching = false;
		searchPending = false;
		searchResults = [];
		searchHasMore = false;
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
				saveSearchTerm(searchQuery);
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
		return $t('common.noTitle');
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
				addToGroup($t('date.today'), conv);
			} else if (d >= yesterday) {
				addToGroup($t('date.yesterday'), conv);
			} else if (d >= last7) {
				addToGroup($t('date.last7days'), conv);
			} else if (d >= last30) {
				addToGroup($t('date.last30days'), conv);
			} else {
				const label = formatMonthYear(d, $locale);
				addToGroup(label, conv);
			}
		}

		return groupOrder.map((label) => ({
			label,
			conversations: groups.get(label)!
		}));
	}

	const dateGroups = $derived(groupByDate(conversations));

	let editMode = $state(false);
	let selectedUuids = $state<Set<string>>(new Set());
	let deleting = $state(false);

	function toggleEditMode() {
		editMode = !editMode;
		if (!editMode) selectedUuids = new Set();
	}

	function toggleSelect(uuid: string) {
		const next = new Set(selectedUuids);
		if (next.has(uuid)) next.delete(uuid); else next.add(uuid);
		selectedUuids = next;
	}

	function selectAll() {
		if (isSearching) {
			selectedUuids = new Set(searchResults.map((r) => r.conversation_uuid));
		} else {
			selectedUuids = new Set(conversations.map((c) => c.uuid));
		}
	}

	function deselectAll() {
		selectedUuids = new Set();
	}

	async function deleteSelected() {
		if (selectedUuids.size === 0) return;
		const msg = $t('sidebar.confirmDelete', { count: selectedUuids.size });
		if (!confirm(msg)) return;

		deleting = true;
		try {
			const res = await fetch('/api/conversations/delete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ uuids: [...selectedUuids] })
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			conversations = conversations.filter((c) => !selectedUuids.has(c.uuid));
			searchResults = searchResults.filter((r) => !selectedUuids.has(r.conversation_uuid));
			searchTotal = Math.max(0, searchTotal - selectedUuids.size);
			selectedUuids = new Set();
			editMode = false;
		} catch (err) {
			console.error('Delete failed:', err);
		} finally {
			deleting = false;
		}
	}
</script>

<aside class="flex h-full w-[288px] min-w-[288px] flex-col border-r border-border bg-bg-sidebar">
	<div class="px-3 pt-3 pb-1">
		<button
			onclick={() => { goto('/'); onNavigate?.(); }}
			class="mb-2 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors {!currentUuid && !isProjectsPage && !isSettingsPage
				? 'bg-bg-primary text-text-primary'
				: 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'}"
		>
			<svg width="16" height="16" viewBox="0 0 248 248" fill="currentColor" class="shrink-0 text-accent"><path d="M52.4285 162.873L98.7844 136.879L99.5485 134.602L98.7844 133.334H96.4921L88.7237 132.862L62.2346 132.153L39.3113 131.207L17.0249 130.026L11.4214 128.844L6.2 121.873L6.7094 118.447L11.4214 115.257L18.171 115.847L33.0711 116.911L55.485 118.447L71.6586 119.392L95.728 121.873H99.5485L100.058 120.337L98.7844 119.392L97.7656 118.447L74.5877 102.732L49.4995 86.1905L36.3823 76.62L29.3779 71.7757L25.8121 67.2858L24.2839 57.3608L30.6515 50.2716L39.3113 50.8623L41.4763 51.4531L50.2636 58.1879L68.9842 72.7209L93.4357 90.6804L97.0015 93.6343L98.4374 92.6652L98.6571 91.9801L97.0015 89.2625L83.757 65.2772L69.621 40.8192L63.2534 30.6579L61.5978 24.632C60.9565 22.1032 60.579 20.0111 60.579 17.4246L67.8381 7.49965L71.9133 6.19995L81.7193 7.49965L85.7946 11.0443L91.9074 24.9865L101.714 46.8451L116.996 76.62L121.453 85.4816L123.873 93.6343L124.764 96.1155H126.292V94.6976L127.566 77.9197L129.858 57.3608L132.15 30.8942L132.915 23.4505L136.608 14.4708L143.994 9.62643L149.725 12.344L154.437 19.0788L153.8 23.4505L150.998 41.6463L145.522 70.1215L141.957 89.2625H143.994L146.414 86.7813L156.093 74.0206L172.266 53.698L179.398 45.6635L187.803 36.802L193.152 32.5484H203.34L210.726 43.6549L207.415 55.1159L196.972 68.3492L188.312 79.5739L175.896 96.2095L168.191 109.585L168.882 110.689L170.738 110.53L198.755 104.504L213.91 101.787L231.994 98.7149L240.144 102.496L241.036 106.395L237.852 114.311L218.495 119.037L195.826 123.645L162.07 131.592L161.696 131.893L162.137 132.547L177.36 133.925L183.855 134.279H199.774L229.447 136.524L237.215 141.605L241.8 147.867L241.036 152.711L229.065 158.737L213.019 154.956L175.45 145.977L162.587 142.787H160.805V143.85L171.502 154.366L191.242 172.089L215.82 195.011L217.094 200.682L213.91 205.172L210.599 204.699L188.949 188.394L180.544 181.069L161.696 165.118H160.422V166.772L164.752 173.152L187.803 207.771L188.949 218.405L187.294 221.832L181.308 223.959L174.813 222.777L161.187 203.754L147.305 182.486L136.098 163.345L134.745 164.2L128.075 235.42L125.019 239.082L117.887 241.8L111.902 237.31L108.718 229.984L111.902 215.452L115.722 196.547L118.779 181.541L121.58 162.873L123.291 156.636L123.14 156.219L121.773 156.449L107.699 175.752L86.304 204.699L69.3663 222.777L65.291 224.431L58.2867 220.768L58.9235 214.27L62.8713 208.48L86.304 178.705L100.44 160.155L109.551 149.507L109.462 147.967L108.959 147.924L46.6977 188.512L35.6182 189.93L30.7788 185.44L31.4156 178.115L33.7079 175.752L52.4285 162.873Z"/></svg>
			Claude Archive
		</button>
		<div class="relative">
			<input
				type="text"
				placeholder={$t('sidebar.searchPlaceholder')}
				aria-label={$t('sidebar.searchAriaLabel')}
				bind:value={searchQuery}
				bind:this={searchInputEl}
				oninput={handleSearchInput}
				onkeydown={handleSearchKeydown}
				onfocus={() => searchFocused = true}
				onblur={() => setTimeout(() => searchFocused = false, 150)}
				class="w-full rounded-md border border-border bg-bg-primary px-3 py-1.5 text-sm text-text-primary placeholder-text-secondary outline-none focus:border-accent"
			/>
			{#if searchQuery}
				<button
					onclick={clearSearch}
					aria-label={$t('common.clearSearch')}
					class="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
				>
					✕
				</button>
			{/if}
			{#if showHistory}
				<div class="absolute left-0 right-0 top-full z-10 mt-1 rounded-md border border-border bg-bg-sidebar py-1 shadow-lg">
					<div class="flex items-center justify-between px-3 py-1">
						<span class="text-xs text-text-secondary">{$t('sidebar.recentSearches')}</span>
					</div>
					{#each searchHistory as term}
						<div class="group flex items-center">
							<button
								onclick={() => useHistoryItem(term)}
								class="flex-1 truncate px-3 py-1 text-left text-sm text-text-secondary hover:bg-bg-primary hover:text-text-primary"
							>
								{term}
							</button>
							<button
								onclick={() => removeHistoryItem(term)}
								aria-label={$t('sidebar.deleteHistoryAriaLabel', { term })}
								class="mr-2 text-xs text-text-secondary opacity-0 hover:text-text-primary focus:opacity-100 group-hover:opacity-100"
							>
								✕
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	{#if editMode}
		<div class="flex items-center gap-1 border-b border-border px-2 pb-2">
			<button onclick={selectAll} class="flex-1 rounded-md px-2 py-1 text-xs text-text-secondary hover:bg-bg-primary hover:text-text-primary">
				{$t('sidebar.selectAll')}
			</button>
			<button onclick={deselectAll} class="flex-1 rounded-md px-2 py-1 text-xs text-text-secondary hover:bg-bg-primary hover:text-text-primary">
				{$t('sidebar.deselectAll')}
			</button>
			{#if selectedUuids.size > 0}
				<button
					onclick={deleteSelected}
					disabled={deleting}
					class="flex-1 rounded-md px-2 py-1 text-xs text-red-400 hover:bg-red-400/10 disabled:opacity-50"
				>
					{$t('sidebar.deleteSelected', { count: selectedUuids.size })}
				</button>
			{/if}
		</div>
	{/if}

	<nav
		class="flex-1 overflow-y-auto px-2"
		bind:this={listEl}
		onscroll={handleScroll}
	>
		{#if isSearching}
			{#if searchPending}
				<div class="py-4 text-center text-sm text-text-secondary">{$t('sidebar.searching')}</div>
			{:else if searchResults.length === 0}
				<p class="px-3 py-4 text-center text-sm text-text-secondary">{$t('sidebar.noResults')}</p>
			{:else}
				<p class="px-3 py-1 text-xs text-text-secondary">{$t('sidebar.resultCount', { count: searchTotal })}</p>
				{#each searchResults as result, i}
					{#if editMode}
						<button
							onclick={() => toggleSelect(result.conversation_uuid)}
							class="mb-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left {selectedUuids.has(result.conversation_uuid)
								? 'bg-accent/10 text-text-primary'
								: 'hover:bg-bg-primary'}"
						>
							<span class="flex h-4 w-4 shrink-0 items-center justify-center rounded border {selectedUuids.has(result.conversation_uuid) ? 'border-accent bg-accent' : 'border-text-muted'}">
								{#if selectedUuids.has(result.conversation_uuid)}
									<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" stroke-width="2"><path d="M2 6l3 3 5-5"/></svg>
								{/if}
							</span>
							<div class="min-w-0 flex-1">
								<div class="truncate text-sm">{result.conversation_name || $t('common.noTitle')}</div>
								<div class="mt-0.5 line-clamp-1 text-xs text-text-secondary">{@html result.snippet}</div>
							</div>
						</button>
					{:else}
						<button
							data-result-index={i}
							onclick={() => { saveSearchTerm(searchQuery); goto(`/chat/${result.conversation_uuid}?highlight=${result.message_uuid}&q=${encodeURIComponent(searchQuery)}`); onNavigate?.(); }}
							class="mb-1 w-full rounded-md px-3 py-2 text-left {selectedIndex === i ? 'bg-bg-primary ring-1 ring-accent' : 'hover:bg-bg-primary'}"
						>
							<div class="flex items-center gap-1.5 text-sm">
								<span class="truncate text-text-primary">{result.conversation_name || $t('common.noTitle')}</span>
								<span class="shrink-0 text-xs text-text-secondary">· {result.message_sender === 'human' ? $t('common.senderHuman') : $t('common.senderAssistant')}</span>
							</div>
							<div class="mt-0.5 line-clamp-2 text-xs text-text-secondary">
								{@html result.snippet}
							</div>
						</button>
					{/if}
				{/each}
				{#if searchLoading}
					<div class="py-4 text-center text-sm text-text-secondary">{$t('common.loading')}</div>
				{/if}
			{/if}
		{:else}
			{#each dateGroups as group}
				<div class="mb-2">
					<h3 class="px-3 py-1 text-xs font-medium text-text-secondary">{group.label}</h3>
					{#each group.conversations as conv}
						{#if editMode}
							<button
								onclick={() => toggleSelect(conv.uuid)}
								class="sidebar-item flex w-full items-center gap-2 rounded-md px-2 text-left transition-colors {selectedUuids.has(conv.uuid)
									? 'bg-accent/10 text-text-primary'
									: 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'}"
							>
								<span class="flex h-4 w-4 shrink-0 items-center justify-center rounded border {selectedUuids.has(conv.uuid) ? 'border-accent bg-accent' : 'border-text-muted'}">
									{#if selectedUuids.has(conv.uuid)}
										<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" stroke-width="2"><path d="M2 6l3 3 5-5"/></svg>
									{/if}
								</span>
								<span class="line-clamp-1">{getDisplayName(conv)}</span>
							</button>
						{:else}
							<button
								onclick={() => { goto(`/chat/${conv.uuid}`); onNavigate?.(); }}
								title={conv.summary ? `${formatRelativeTime(new Date(conv.updated_at), $locale)} · ${conv.summary}` : formatRelativeTime(new Date(conv.updated_at), $locale)}
								class="sidebar-item flex w-full items-center gap-1.5 rounded-md px-4 text-left transition-colors {currentUuid === conv.uuid
									? 'bg-bg-primary text-text-primary'
									: 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'}"
							>
								<SourceLogo source={conv.source || 'claude'} size={14} />
								<span class="line-clamp-1">{getDisplayName(conv)}</span>
							</button>
						{/if}
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
				<div class="py-4 text-center text-sm text-text-secondary">{$t('common.loading')}</div>
			{/if}

			{#if conversations.length === 0 && !loading}
				<p class="px-3 py-4 text-center text-sm text-text-secondary">{$t('sidebar.noConversations')}</p>
			{/if}
		{/if}
	</nav>

	<div class="border-t border-border p-2">
		<button
			onclick={toggleEditMode}
			class="w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors {editMode
				? 'bg-accent/10 text-accent'
				: 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'}"
		>
			{editMode ? `✕ ${$t('sidebar.cancel')}` : `✏️ ${$t('sidebar.editMode')}`}
		</button>
		{#if !editMode}
			<button
				onclick={() => { goto('/projects'); onNavigate?.(); }}
				class="w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors {isProjectsPage
					? 'bg-bg-primary text-text-primary'
					: 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'}"
			>
				📁 {$t('sidebar.projects')}
			</button>
			<button
				onclick={() => { goto('/settings'); onNavigate?.(); }}
				class="w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors {isSettingsPage
					? 'bg-bg-primary text-text-primary'
					: 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'}"
			>
				⚙️ {$t('settings.title')}
			</button>
		{/if}
	</div>
</aside>
