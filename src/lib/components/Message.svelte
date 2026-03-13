<script lang="ts">
	import { renderMarkdown, highlightSearchTerms } from '$lib/markdown';

	interface ContentBlock {
		type: 'text' | 'tool_use' | 'tool_result';
		text?: string;
		name?: string;
		input?: Record<string, unknown>;
		content?: Array<{ type: string; text: string }> | string;
		is_error?: boolean;
	}

	interface Props {
		uuid: string;
		sender: string;
		contentJson: string;
		text: string;
		createdAt?: string;
		highlighted?: boolean;
		searchQuery?: string;
	}

	let { uuid, sender, contentJson, text, createdAt, highlighted = false, searchQuery = '' }: Props = $props();

	const formattedTime = $derived(
		createdAt
			? new Date(createdAt).toLocaleString('ko-KR', {
					year: 'numeric',
					month: '2-digit',
					day: '2-digit',
					hour: '2-digit',
					minute: '2-digit'
				})
			: ''
	);

	const content: ContentBlock[] = $derived((() => {
		try {
			const parsed = JSON.parse(contentJson);
			return Array.isArray(parsed) && parsed.length > 0 ? parsed : [{ type: 'text' as const, text }];
		} catch {
			return [{ type: 'text' as const, text }];
		}
	})());

	function renderText(t: string): string {
		const html = renderMarkdown(t);
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

	function handleClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (target.classList.contains('copy-btn')) {
			const code = target.dataset.code || '';
			navigator.clipboard.writeText(code);
			const original = target.textContent;
			target.textContent = 'Copied!';
			setTimeout(() => {
				target.textContent = original;
			}, 1500);
		}
	}
</script>

<div
	id="msg-{uuid}"
	class="msg-wrapper group/msg mb-4 flex {sender === 'human' ? 'justify-end' : 'justify-start'} {highlighted ? 'animate-highlight' : ''}"
>
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="msg-bubble max-w-[85%] rounded-2xl px-4 py-3 {sender === 'human'
			? 'bg-bg-message-human text-text-primary'
			: 'text-text-primary'}"
		onclick={handleClick}
	>
		{#each content as block}
			{#if block.type === 'text' && block.text}
				<div class="markdown-body text-sm leading-relaxed">
					{@html renderText(block.text)}
				</div>
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
						📋 Result{block.is_error ? ' (error)' : ''}{block.name ? `: ${block.name}` : ''}
					</summary>
					<pre class="max-h-[300px] overflow-auto border-t border-border p-3"><code class="text-xs text-text-secondary">{getToolResultText(block)}</code></pre>
				</details>
			{/if}
		{/each}
	</div>
	{#if formattedTime}
		<div class="self-end pb-1 pl-2 pr-2 hidden text-xs text-text-secondary group-hover/msg:block">
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

	/* Markdown body styles */
	.markdown-body :global(h1) { font-size: 1.5em; font-weight: 700; margin: 0.67em 0; }
	.markdown-body :global(h2) { font-size: 1.25em; font-weight: 700; margin: 0.6em 0; }
	.markdown-body :global(h3) { font-size: 1.1em; font-weight: 600; margin: 0.5em 0; }
	.markdown-body :global(h4),
	.markdown-body :global(h5),
	.markdown-body :global(h6) { font-size: 1em; font-weight: 600; margin: 0.4em 0; }
	.markdown-body :global(ul) { list-style-type: disc; padding-left: 1.5em; margin: 0.4em 0; }
	.markdown-body :global(ol) { list-style-type: decimal; padding-left: 1.5em; margin: 0.4em 0; }
	.markdown-body :global(li) { margin: 0.15em 0; }
	.markdown-body :global(li > ul),
	.markdown-body :global(li > ol) { margin: 0.1em 0; }
	.markdown-body :global(blockquote) {
		border-left: 3px solid var(--border);
		padding-left: 1em;
		margin: 0.5em 0;
		color: var(--text-secondary);
	}
	.markdown-body :global(p) { margin: 0.4em 0; }
	.markdown-body :global(p:first-child) { margin-top: 0; }
	.markdown-body :global(p:last-child) { margin-bottom: 0; }
	.markdown-body :global(hr) { border: none; border-top: 1px solid var(--border); margin: 1em 0; }
	.markdown-body :global(strong) { font-weight: 700; }

	/* Search highlight styling */
	.msg-bubble :global(.search-highlight) {
		background-color: rgba(218, 119, 86, 0.4);
		color: inherit;
		padding: 0 1px;
		border-radius: 2px;
	}

	/* Code block line numbers */
	.msg-bubble :global(.code-line) {
		display: block;
	}
	.msg-bubble :global(.line-number) {
		display: inline-block;
		width: 3em;
		text-align: right;
		padding-right: 1em;
		color: var(--text-secondary);
		opacity: 0.5;
		user-select: none;
		font-size: 0.75rem;
	}
	.msg-bubble :global(.line-content) {
		display: inline;
	}
</style>
