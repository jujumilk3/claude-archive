<script lang="ts">
	import { page } from '$app/stores';
	import { tick } from 'svelte';
	import Message from '$lib/components/Message.svelte';
	import { exportConversationToMarkdown, downloadMarkdown, conversationFilename } from '$lib/export';
	import { t } from '$lib/i18n';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function handleExport() {
		const md = exportConversationToMarkdown(data.conversation, data.messages);
		const filename = conversationFilename(data.conversation.name, data.conversation.uuid);
		downloadMarkdown(filename, md);
	}

	let highlightUuid = $state('');
	let searchQuery = $state('');

	$effect(() => {
		const highlight = $page.url.searchParams.get('highlight');
		const q = $page.url.searchParams.get('q');
		searchQuery = q || '';

		if (highlight) {
			highlightUuid = '';
			tick().then(() => {
				highlightUuid = highlight;
				tick().then(() => {
					setTimeout(() => {
						const el = document.getElementById(`msg-${highlight}`);
						if (el) {
							el.scrollIntoView({ behavior: 'smooth', block: 'center' });
						}
					}, 100);
				});
			});
		} else {
			highlightUuid = '';
		}
	});
</script>

<div class="flex h-full flex-1 flex-col overflow-hidden bg-bg-primary">
	<header class="border-b border-border">
		<div class="mx-auto flex max-w-3xl items-start justify-between px-6 py-3 pl-12 md:pl-6">
			<div class="min-w-0 flex-1">
				<h1 class="text-lg font-medium text-text-primary">
					{data.conversation.name || $t('common.noTitle')}
				</h1>
				{#if data.conversation.summary}
					<p class="mt-1 line-clamp-2 text-sm text-text-secondary">{data.conversation.summary}</p>
				{/if}
			</div>
			<button
				onclick={handleExport}
				class="ml-3 shrink-0 rounded-lg px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
				aria-label={$t('chat.exportAriaLabel')}
				title={$t('chat.exportTitle')}
			>
				↓ MD
			</button>
		</div>
	</header>

	<div class="flex-1 overflow-y-auto">
		<div class="mx-auto max-w-3xl px-4 py-6">
			{#if data.messages.length === 0}
				<p class="text-center text-text-secondary">{$t('chat.noMessages')}</p>
			{:else}
				{#each data.messages as msg}
					<Message
						uuid={msg.uuid}
						sender={msg.sender}
						contentJson={msg.content_json}
						text={msg.text}
						createdAt={msg.created_at}
						attachmentsJson={msg.attachments_json}
						filesJson={msg.files_json}
						highlighted={highlightUuid === msg.uuid}
						{searchQuery}
					/>
				{/each}
			{/if}
		</div>
	</div>
</div>
