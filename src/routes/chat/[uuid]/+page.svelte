<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import Message from '$lib/components/Message.svelte';

	interface MessageData {
		uuid: string;
		text: string;
		content_json: string;
		sender: string;
		created_at: string;
		message_order: number;
		has_tool_use: number;
	}

	interface ConversationData {
		uuid: string;
		name: string;
		created_at: string;
	}

	let conversation: ConversationData | null = $state(null);
	let messages: MessageData[] = $state([]);
	let loading = $state(true);
	let errorMsg = $state('');
	let highlightUuid = $state('');
	let searchQuery = $state('');

	const uuid = $derived($page.params.uuid);

	$effect(() => {
		if (uuid) {
			loadConversation(uuid);
		}
	});

	async function loadConversation(convUuid: string) {
		loading = true;
		errorMsg = '';

		try {
			const res = await fetch(`/api/conversations/${convUuid}/messages`);
			if (!res.ok) {
				if (res.status === 404) {
					errorMsg = '대화를 찾을 수 없습니다';
				} else {
					errorMsg = '오류가 발생했습니다';
				}
				return;
			}

			const data = await res.json();
			conversation = data.conversation;
			messages = data.messages;

			const highlight = $page.url.searchParams.get('highlight');
			const q = $page.url.searchParams.get('q');
			searchQuery = q || '';

			if (highlight) {
				highlightUuid = highlight;
				requestAnimationFrame(() => {
					setTimeout(() => {
						const el = document.getElementById(`msg-${highlight}`);
						if (el) {
							el.scrollIntoView({ behavior: 'smooth', block: 'center' });
						}
					}, 100);
				});
			} else {
				highlightUuid = '';
			}
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex h-full flex-1 flex-col overflow-hidden bg-bg-primary">
	{#if loading}
		<div class="flex h-full flex-col">
			<header class="border-b border-border px-6 py-3 pl-12 md:pl-6">
				<div class="skeleton h-6 w-48"></div>
			</header>
			<div class="flex-1 overflow-hidden">
				<div class="mx-auto max-w-3xl space-y-6 px-4 py-6">
					{#each [true, false, true, false, true] as isHuman}
						<div class="flex {isHuman ? 'justify-end' : 'justify-start'}">
							<div class="space-y-2 {isHuman ? 'w-2/3' : 'w-3/4'}">
								<div class="skeleton h-4 w-full"></div>
								<div class="skeleton h-4 w-5/6"></div>
								{#if !isHuman}
									<div class="skeleton h-4 w-4/6"></div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{:else if errorMsg}
		<div class="flex h-full items-center justify-center">
			<p class="text-text-secondary">{errorMsg}</p>
		</div>
	{:else if conversation}
		<header class="border-b border-border px-6 py-3 pl-12 md:pl-6">
			<h1 class="text-lg font-medium text-text-primary">
				{conversation.name || '(제목 없음)'}
			</h1>
		</header>

		<div class="flex-1 overflow-y-auto">
			<div class="mx-auto max-w-3xl px-4 py-6">
				{#if messages.length === 0}
					<p class="text-center text-text-secondary">이 대화에는 메시지가 없습니다</p>
				{:else}
					{#each messages as msg}
						<Message
							uuid={msg.uuid}
							sender={msg.sender}
							contentJson={msg.content_json}
							text={msg.text}
							createdAt={msg.created_at}
							highlighted={highlightUuid === msg.uuid}
							{searchQuery}
						/>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>
