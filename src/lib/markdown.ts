import { Marked } from 'marked';
import hljs from 'highlight.js';

const marked = new Marked({
	gfm: true,
	breaks: true,
	renderer: {
		code({ text, lang }: { text: string; lang?: string }) {
			const language = lang && hljs.getLanguage(lang) ? lang : undefined;
			const highlighted = language
				? hljs.highlight(text, { language }).value
				: hljs.highlightAuto(text).value;
			const detectedLang = language || lang || 'code';

			const lines = highlighted.split('\n');
			// Remove trailing empty line that fenced blocks often have
			if (lines.length > 1 && lines[lines.length - 1].trim() === '') {
				lines.pop();
			}
			const lineNumbersHtml = lines
				.map(
					(line, i) =>
						`<span class="code-line"><span class="line-number">${i + 1}</span><span class="line-content">${line || ' '}</span></span>`
				)
				.join('\n');

			return `<div class="code-block-wrapper group relative my-3 overflow-hidden rounded-lg bg-code-bg">
				<div class="flex items-center justify-between border-b border-border px-4 py-1.5">
					<span class="text-xs text-text-secondary">${detectedLang}</span>
					<button class="copy-btn text-xs text-text-secondary hover:text-text-primary" data-code="${escapeAttr(text)}">Copy</button>
				</div>
				<pre class="max-h-[500px] overflow-auto p-4 leading-relaxed"><code class="hljs text-sm">${lineNumbersHtml}</code></pre>
			</div>`;
		},
		codespan({ text }: { text: string }) {
			return `<code class="rounded bg-code-bg px-1 py-0.5 text-sm">${text}</code>`;
		},
		link({ href, text }: { href: string; text: string }) {
			return `<a href="${href}" class="text-accent underline" target="_blank" rel="noopener">${text}</a>`;
		},
		table(token) {
			const headerCells = token.header
				.map(
					(cell: { text: string }) =>
						`<th class="px-3 py-1.5 text-left text-text-secondary font-medium">${cell.text}</th>`
				)
				.join('');
			const headerRow = `<tr class="border-b border-border">${headerCells}</tr>`;

			const bodyRows = token.rows
				.map((row: Array<{ text: string }>) => {
					const cells = row.map((cell) => `<td class="px-3 py-1.5">${cell.text}</td>`).join('');
					return `<tr class="border-b border-border">${cells}</tr>`;
				})
				.join('');

			return `<table class="my-2 w-full border-collapse text-sm"><thead>${headerRow}</thead><tbody>${bodyRows}</tbody></table>`;
		}
	}
});

function escapeAttr(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

export function renderMarkdown(text: string): string {
	const result = marked.parse(text);
	if (typeof result === 'string') return result;
	return '';
}

export function highlightSearchTerms(html: string, query: string): string {
	if (!query || query.length < 2) return html;

	const terms = query
		.split(/\s+/)
		.filter((t) => t.length >= 2)
		.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

	if (terms.length === 0) return html;

	const pattern = new RegExp(`(${terms.join('|')})`, 'gi');

	// Only highlight text nodes (outside of HTML tags)
	return html.replace(/(<[^>]*>)|([^<]+)/g, (match, tag, text) => {
		if (tag) return tag;
		return text.replace(pattern, '<mark class="search-highlight">$1</mark>');
	});
}
