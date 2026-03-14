<script lang="ts">
	import { t, locale, formatDate, formatNumber } from '$lib/i18n';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<div class="flex h-full items-center justify-center bg-bg-primary">
	<div class="text-center">
		<h1 class="text-2xl font-semibold text-text-primary">Claude Archive</h1>
		{#if data.stats}
			<div class="mt-6 grid grid-cols-3 gap-6">
				<div class="rounded-lg border border-border px-6 py-4">
					<p class="text-2xl font-bold text-accent">{formatNumber(data.stats.total_conversations, $locale)}</p>
					<p class="mt-1 text-sm text-text-secondary">{$t('home.conversations')}</p>
				</div>
				<div class="rounded-lg border border-border px-6 py-4">
					<p class="text-2xl font-bold text-accent">{formatNumber(data.stats.total_messages, $locale)}</p>
					<p class="mt-1 text-sm text-text-secondary">{$t('home.messages')}</p>
				</div>
				<div class="rounded-lg border border-border px-6 py-4">
					<p class="text-2xl font-bold text-accent">{formatNumber(data.stats.total_projects, $locale)}</p>
					<p class="mt-1 text-sm text-text-secondary">{$t('home.projects')}</p>
				</div>
			</div>
			{#if data.stats.oldest_conversation}
				<p class="mt-4 text-sm text-text-secondary">
					{formatDate(new Date(data.stats.oldest_conversation), $locale)} — {formatDate(new Date(data.stats.newest_conversation), $locale)}
				</p>
			{/if}
		{:else}
			<p class="mt-2 text-text-secondary">{$t('home.selectConversation')}</p>
		{/if}
	</div>
</div>
