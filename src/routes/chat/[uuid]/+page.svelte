<script lang="ts">
	import { page } from '$app/stores';
	import { tick } from 'svelte';
	import Message from '$lib/components/Message.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

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
		<div class="mx-auto max-w-3xl px-6 py-3 pl-12 md:pl-6">
			<h1 class="text-lg font-medium text-text-primary">
				{data.conversation.name || '(제목 없음)'}
			</h1>
			{#if data.conversation.summary}
				<p class="mt-1 line-clamp-2 text-sm text-text-secondary">{data.conversation.summary}</p>
			{/if}
		</div>
	</header>

	<div class="flex-1 overflow-y-auto">
		<div class="mx-auto max-w-3xl px-4 py-6">
			{#if data.messages.length === 0}
				<p class="text-center text-text-secondary">이 대화에는 메시지가 없습니다</p>
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
