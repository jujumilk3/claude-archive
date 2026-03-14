<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function formatDate(iso: string | null): string {
		if (!iso) return '-';
		return new Date(iso).toLocaleDateString('ko-KR', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function formatNumber(n: number): string {
		return n.toLocaleString('ko-KR');
	}
</script>

<div class="flex h-full items-center justify-center bg-bg-primary">
	<div class="text-center">
		<h1 class="text-2xl font-semibold text-text-primary">Claude Archive</h1>
		{#if data.stats}
			<div class="mt-6 grid grid-cols-3 gap-6">
				<div class="rounded-lg border border-border px-6 py-4">
					<p class="text-2xl font-bold text-accent">{formatNumber(data.stats.total_conversations)}</p>
					<p class="mt-1 text-sm text-text-secondary">대화</p>
				</div>
				<div class="rounded-lg border border-border px-6 py-4">
					<p class="text-2xl font-bold text-accent">{formatNumber(data.stats.total_messages)}</p>
					<p class="mt-1 text-sm text-text-secondary">메시지</p>
				</div>
				<div class="rounded-lg border border-border px-6 py-4">
					<p class="text-2xl font-bold text-accent">{formatNumber(data.stats.total_projects)}</p>
					<p class="mt-1 text-sm text-text-secondary">프로젝트</p>
				</div>
			</div>
			{#if data.stats.oldest_conversation}
				<p class="mt-4 text-sm text-text-secondary">
					{formatDate(data.stats.oldest_conversation)} — {formatDate(data.stats.newest_conversation)}
				</p>
			{/if}
		{:else}
			<p class="mt-2 text-text-secondary">대화를 선택하세요</p>
		{/if}
	</div>
</div>
