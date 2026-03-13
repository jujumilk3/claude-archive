<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let expandedUuid = $state<string | null>(null);
	let docs = $state<Array<{ uuid: string; filename: string; content: string; created_at: string }>>([]);
	let loadingDocs = $state(false);
	let filterQuery = $state('');

	const filteredProjects = $derived(
		filterQuery.length < 1
			? data.projects
			: data.projects.filter((p) => {
					const q = filterQuery.toLowerCase();
					return p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q));
				})
	);

	async function toggleProject(uuid: string) {
		if (expandedUuid === uuid) {
			expandedUuid = null;
			docs = [];
			return;
		}

		expandedUuid = uuid;
		loadingDocs = true;

		try {
			const res = await fetch(`/api/projects/${uuid}`);
			const data = await res.json();
			docs = data.docs;
		} finally {
			loadingDocs = false;
		}
	}
</script>

<div class="flex h-full flex-1 flex-col overflow-hidden bg-bg-primary">
	<header class="border-b border-border px-6 py-3 pl-12 md:pl-6">
		<div class="flex items-center gap-4">
			<h1 class="text-lg font-medium text-text-primary">프로젝트</h1>
			<div class="relative flex-1 max-w-xs">
				<input
					type="text"
					placeholder="프로젝트 검색..."
					bind:value={filterQuery}
					class="w-full rounded-md border border-border bg-bg-sidebar px-3 py-1 text-sm text-text-primary placeholder-text-secondary outline-none focus:border-accent"
				/>
				{#if filterQuery}
					<button
						onclick={() => (filterQuery = '')}
						class="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
					>✕</button>
				{/if}
			</div>
			<span class="text-xs text-text-secondary">{filteredProjects.length}개</span>
		</div>
	</header>

	<div class="flex-1 overflow-y-auto">
		<div class="mx-auto max-w-3xl px-4 py-6">
			{#if data.projects.length === 0}
				<p class="text-center text-text-secondary">프로젝트가 없습니다</p>
			{:else if filteredProjects.length === 0}
				<p class="text-center text-text-secondary">일치하는 프로젝트가 없습니다</p>
			{:else}
				{#each filteredProjects as project}
					<div class="mb-3 rounded-lg border border-border">
						<button
							onclick={() => toggleProject(project.uuid)}
							class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-bg-sidebar"
						>
							<div>
								<h2 class="text-sm font-medium text-text-primary">{project.name}</h2>
								{#if project.description}
									<p class="mt-0.5 text-xs text-text-secondary line-clamp-2">{project.description}</p>
								{/if}
							</div>
							<div class="flex items-center gap-3 text-xs text-text-secondary">
								<span>{project.doc_count}개 문서</span>
								<span>{new Date(project.created_at).toLocaleDateString('ko-KR')}</span>
								<span class="transition-transform {expandedUuid === project.uuid ? 'rotate-180' : ''}">▼</span>
							</div>
						</button>

						{#if expandedUuid === project.uuid}
							<div class="border-t border-border px-4 py-3">
								{#if loadingDocs}
									<p class="text-sm text-text-secondary">로딩 중...</p>
								{:else if docs.length === 0}
									<p class="text-sm text-text-secondary">문서가 없습니다</p>
								{:else}
									{#each docs as doc}
										<details class="mb-2">
											<summary class="cursor-pointer text-sm text-accent hover:underline">
												{doc.filename}
											</summary>
											<pre class="mt-2 max-h-[400px] overflow-auto rounded-lg bg-code-bg p-4"><code class="text-xs text-text-primary">{doc.content}</code></pre>
										</details>
									{/each}
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	</div>
</div>
