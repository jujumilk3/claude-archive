<script lang="ts">
	import { renderMarkdown, highlightSearchTerms } from '$lib/markdown';
	import { t, locale, formatTimestamp } from '$lib/i18n';
	import type { ContentBlock } from '$lib/types';

	interface Attachment {
		file_name: string;
		file_size?: number;
		file_type?: string;
		extracted_content?: string;
	}

	interface FileRef {
		file_name: string;
	}

	interface Props {
		uuid: string;
		sender: string;
		contentJson: string;
		text: string;
		createdAt?: string;
		attachmentsJson?: string;
		filesJson?: string;
		highlighted?: boolean;
		searchQuery?: string;
	}

	let {
		uuid,
		sender,
		contentJson,
		text,
		createdAt,
		attachmentsJson = '[]',
		filesJson = '[]',
		highlighted = false,
		searchQuery = ''
	}: Props = $props();

	const formattedTime = $derived(
		createdAt ? formatTimestamp(createdAt, $locale) : ''
	);

	const content: ContentBlock[] = $derived((() => {
		try {
			const parsed = JSON.parse(contentJson);
			return Array.isArray(parsed) && parsed.length > 0 ? parsed : [{ type: 'text' as const, text }];
		} catch {
			return [{ type: 'text' as const, text }];
		}
	})());

	const attachments: Attachment[] = $derived((() => {
		try {
			const parsed = JSON.parse(attachmentsJson);
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	})());

	const files: FileRef[] = $derived((() => {
		try {
			const parsed = JSON.parse(filesJson);
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	})());

	function renderText(input: string): string {
		const html = renderMarkdown(input);
		if (searchQuery) {
			return highlightSearchTerms(html, searchQuery);
		}
		return html;
	}

	function getToolResultText(block: ContentBlock): string {
		if (typeof block.content === 'string') return block.content;
		if (Array.isArray(block.content)) {
			return block.content.map((c) => c.text || '').join('\n');
		}
		return '';
	}

	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	let bubbleEl: HTMLDivElement;

	const copyIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
	const checkIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

	function handleClick(e: MouseEvent) {
		const target = (e.target as HTMLElement).closest('.copy-btn') as HTMLElement | null;
		if (!target) return;
		const code = target.dataset.code || '';
		navigator.clipboard.writeText(code).catch(() => {});
		target.innerHTML = checkIcon;
		setTimeout(() => {
			target.innerHTML = copyIcon;
		}, 1500);
	}

	function updateCopyLabels() {
		if (!bubbleEl) return;
		const btns = bubbleEl.querySelectorAll<HTMLButtonElement>('.copy-btn[data-default-label]');
		btns.forEach((btn) => {
			btn.innerHTML = copyIcon;
		});
	}

	$effect(() => {
		if (!bubbleEl) return;
		bubbleEl.addEventListener('click', handleClick);
		updateCopyLabels();
		return () => bubbleEl.removeEventListener('click', handleClick);
	});
</script>

<div
	id="msg-{uuid}"
	class="msg-wrapper group/msg mb-1 flex {sender === 'human' ? 'flex-col items-end' : 'justify-start'} {highlighted ? 'animate-highlight' : ''}"
>
	<div
		bind:this={bubbleEl}
		class="msg-bubble max-w-[85%] rounded-xl px-4 py-[10px] {sender === 'human'
			? 'bg-bg-message-human text-text-primary human-message'
			: 'text-text-primary claude-response'}"
	>
		{#if attachments.length > 0}
			<div class="mb-2 flex flex-wrap gap-2">
				{#each attachments as att}
					<details class="w-full rounded-lg border border-border">
						<summary class="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:text-text-primary">
							<span>📎 {att.file_name}</span>
							{#if att.file_size != null}
								<span class="opacity-60">({formatFileSize(att.file_size)})</span>
							{/if}
						</summary>
						{#if att.extracted_content}
							<pre class="max-h-[300px] overflow-auto border-t border-border p-3"><code class="text-xs text-text-secondary">{att.extracted_content}</code></pre>
						{/if}
					</details>
				{/each}
			</div>
		{/if}

		{#if files.length > 0}
			<div class="mb-2 flex flex-wrap gap-1">
				{#each files as file}
					<span class="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-text-secondary">
						📄 {file.file_name}
					</span>
				{/each}
			</div>
		{/if}

		{#each content as block}
			{#if block.type === 'text' && block.text}
				<div class="markdown-body">
					{@html renderText(block.text)}
				</div>
			{:else if block.type === 'thinking' && block.thinking}
				<details class="my-2 rounded-lg border border-border">
					<summary class="cursor-pointer px-3 py-2 text-xs text-text-secondary hover:text-text-primary">
						💭 {$t('message.thinking')}
					</summary>
					<div class="markdown-body max-h-[400px] overflow-auto border-t border-border p-3 text-xs leading-relaxed text-text-secondary">
						{@html renderMarkdown(block.thinking)}
					</div>
				</details>
			{:else if block.type === 'thinking' && block.text}
				<details class="my-2 rounded-lg border border-border">
					<summary class="cursor-pointer px-3 py-2 text-xs text-text-secondary hover:text-text-primary">
						💭 {$t('message.thinking')}
					</summary>
					<div class="markdown-body max-h-[400px] overflow-auto border-t border-border p-3 text-xs leading-relaxed text-text-secondary">
						{@html renderMarkdown(block.text)}
					</div>
				</details>
			{:else if block.type === 'tool_use'}
				<details class="my-2 rounded-lg border border-border">
					<summary class="cursor-pointer px-3 py-2 text-xs text-text-secondary hover:text-text-primary">
						🔧 {block.name}
					</summary>
					<pre class="max-h-[300px] overflow-auto border-t border-border p-3"><code class="text-xs text-text-secondary">{JSON.stringify(block.input, null, 2)}</code></pre>
				</details>
			{:else if block.type === 'tool_result'}
				<details class="my-2 rounded-lg border border-border">
					<summary class="cursor-pointer px-3 py-2 text-xs text-text-secondary hover:text-text-primary">
						📋 {$t('message.result')}{block.is_error ? ` ${$t('message.resultError')}` : ''}{block.name ? `: ${block.name}` : ''}
					</summary>
					<pre class="max-h-[300px] overflow-auto border-t border-border p-3"><code class="text-xs text-text-secondary">{getToolResultText(block)}</code></pre>
				</details>
			{:else if block.type !== 'text' && block.type !== 'thinking'}
				<details class="my-2 rounded-lg border border-border">
					<summary class="cursor-pointer px-3 py-2 text-xs text-text-secondary hover:text-text-primary">
						📦 {block.type}{block.name ? `: ${block.name}` : ''}
					</summary>
					<pre class="max-h-[300px] overflow-auto border-t border-border p-3"><code class="text-xs text-text-secondary">{JSON.stringify(block, null, 2)}</code></pre>
				</details>
			{/if}
		{/each}
	</div>
	{#if formattedTime && sender === 'human'}
		<div class="mt-1 text-right text-xs text-text-muted">
			{formattedTime}
		</div>
	{/if}
</div>

<style>
	@keyframes highlight-fade {
		0% { background-color: rgba(218, 119, 86, 0.3); }
		100% { background-color: transparent; }
	}
	.animate-highlight {
		animation: highlight-fade 2s ease-out;
	}
	.msg-wrapper {
		content-visibility: auto;
		contain-intrinsic-size: auto 120px;
	}

	/* Markdown body: Claude uses grid gap-3 for spacing between elements */
	.markdown-body {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.75rem;
	}
	.markdown-body :global(> *) { min-width: 0; }

	/* Claude response paragraphs: leading-[1.7], break-words */
	.claude-response .markdown-body :global(p) {
		line-height: 1.7;
		word-break: break-word;
		white-space: normal;
		margin: 0;
	}

	/* Headings match Claude exactly */
	.markdown-body :global(h1) { font-size: 1.5rem; font-weight: var(--font-weight-heading); margin: 0; }
	.markdown-body :global(h2) { font-size: 1.125rem; font-weight: var(--font-weight-heading); margin-top: 0.75rem; margin-bottom: -0.25rem; }
	.markdown-body :global(h3) { font-size: 1rem; font-weight: var(--font-weight-heading); margin: 0; }
	.markdown-body :global(h4),
	.markdown-body :global(h5),
	.markdown-body :global(h6) { font-size: 1rem; font-weight: var(--font-weight-heading); margin: 0; }
	.markdown-body :global(ul) { list-style-type: disc; padding-left: 1.5em; margin: 0; }
	.markdown-body :global(ol) { list-style-type: decimal; padding-left: 1.5em; margin: 0; }
	.markdown-body :global(li) { margin: 0.15em 0; line-height: 1.7; }
	.markdown-body :global(li > ul),
	.markdown-body :global(li > ol) { margin: 0.25em 0 0; }
	.markdown-body :global(blockquote) {
		border-left: 3px solid var(--border);
		padding-left: 1em;
		margin: 0;
		color: var(--text-secondary);
	}
	.markdown-body :global(p) { margin: 0; }
	.markdown-body :global(hr) { border: none; border-top: 1px solid var(--border); margin: 0; }

	/* User message: grid gap-2, whitespace-pre-wrap */
	.human-message .markdown-body {
		gap: 0.5rem;
	}
	.human-message .markdown-body :global(p) {
		white-space: pre-wrap;
		word-break: break-word;
		line-height: 1.4;
	}

	/* Search highlight styling */
	.msg-bubble :global(.search-highlight) {
		background-color: rgba(218, 119, 86, 0.4);
		color: inherit;
		padding: 0 1px;
		border-radius: 2px;
	}

</style>
