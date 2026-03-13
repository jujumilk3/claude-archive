<script lang="ts">
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
	}

	let { uuid, sender, contentJson, text, createdAt, highlighted = false }: Props = $props();

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

	function getToolResultText(block: ContentBlock): string {
		if (typeof block.content === 'string') return block.content;
		if (Array.isArray(block.content)) {
			return block.content.map((c) => c.text || '').join('\n');
		}
		return '';
	}

	function copyToClipboard(text: string, btn: HTMLButtonElement) {
		navigator.clipboard.writeText(text);
		const original = btn.textContent;
		btn.textContent = 'Copied!';
		setTimeout(() => {
			btn.textContent = original;
		}, 1500);
	}

	function extractCodeBlocks(text: string): Array<{ type: 'text' | 'code'; content: string; lang?: string }> {
		const parts: Array<{ type: 'text' | 'code'; content: string; lang?: string }> = [];
		const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
		let lastIndex = 0;
		let match;

		while ((match = codeBlockRegex.exec(text)) !== null) {
			if (match.index > lastIndex) {
				parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
			}
			parts.push({ type: 'code', content: match[2], lang: match[1] || undefined });
			lastIndex = match.index + match[0].length;
		}

		if (lastIndex < text.length) {
			parts.push({ type: 'text', content: text.slice(lastIndex) });
		}

		return parts.length > 0 ? parts : [{ type: 'text', content: text }];
	}

	function renderMarkdownInline(text: string): string {
		let html = text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');

		html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
		html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
		html = html.replace(/`([^`]+)`/g, '<code class="rounded bg-code-bg px-1 py-0.5 text-sm">$1</code>');
		html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-accent underline" target="_blank" rel="noopener">$1</a>');

		html = html.replace(/\n/g, '<br>');

		return html;
	}
</script>

<div
	id="msg-{uuid}"
	class="msg-wrapper group/msg mb-4 flex {sender === 'human' ? 'justify-end' : 'justify-start'} {highlighted ? 'animate-highlight' : ''}"
>
	<div
		class="max-w-[85%] rounded-2xl px-4 py-3 {sender === 'human'
			? 'bg-bg-message-human text-text-primary'
			: 'text-text-primary'}"
	>
		{#each content as block}
			{#if block.type === 'text' && block.text}
				{@const parts = extractCodeBlocks(block.text)}
				{#each parts as part}
					{#if part.type === 'code'}
						<div class="group relative my-3 overflow-hidden rounded-lg bg-code-bg">
							<div class="flex items-center justify-between border-b border-border px-4 py-1.5">
								<span class="text-xs text-text-secondary">{part.lang || 'code'}</span>
								<button
									onclick={(e) => copyToClipboard(part.content, e.currentTarget as HTMLButtonElement)}
									class="text-xs text-text-secondary hover:text-text-primary"
								>
									Copy
								</button>
							</div>
							<pre class="max-h-[500px] overflow-auto p-4"><code class="text-sm text-text-primary">{part.content}</code></pre>
						</div>
					{:else}
						<div class="prose-invert text-sm leading-relaxed">
							{@html renderMarkdownInline(part.content)}
						</div>
					{/if}
				{/each}
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
		<div class="mt-1 hidden text-xs text-text-secondary group-hover/msg:block {sender === 'human' ? 'text-right' : 'text-left'}">
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
</style>
