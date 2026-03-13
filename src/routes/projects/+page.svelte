<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let expandedUuid = $state<string | null>(null);
	let docs = $state<Array<{ uuid: string; filename: string; content: string; created_at: string }>>([]);
	let loadingDocs = $state(false);

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
	<header class="border-b border-border px-6 py-3">
		<h1 class="text-lg font-medium text-text-primary">프로젝트</h1>
	</header>

	<div class="flex-1 overflow-y-auto">
		<div class="mx-auto max-w-3xl px-4 py-6">
			{#if data.projects.length === 0}
				<p class="text-center text-text-secondary">프로젝트가 없습니다</p>
			{:else}
				{#each data.projects as project}
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
