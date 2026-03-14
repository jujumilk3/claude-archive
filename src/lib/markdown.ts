import { Marked } from 'marked';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import go from 'highlight.js/lib/languages/go';
import graphql from 'highlight.js/lib/languages/graphql';
import ini from 'highlight.js/lib/languages/ini';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import shell from 'highlight.js/lib/languages/shell';
import sql from 'highlight.js/lib/languages/sql';
import swift from 'highlight.js/lib/languages/swift';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

hljs.registerLanguage('bash', bash);
hljs.registerLanguage('css', css);
hljs.registerLanguage('diff', diff);
hljs.registerLanguage('go', go);
hljs.registerLanguage('graphql', graphql);
hljs.registerLanguage('ini', ini);
hljs.registerLanguage('java', java);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('kotlin', kotlin);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('python', python);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('shell', shell);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('swift', swift);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('yaml', yaml);

// Register common aliases
hljs.registerAliases(['sh', 'zsh'], { languageName: 'bash' });
hljs.registerAliases(['js', 'jsx'], { languageName: 'javascript' });
hljs.registerAliases(['ts', 'tsx'], { languageName: 'typescript' });
hljs.registerAliases(['py'], { languageName: 'python' });
hljs.registerAliases(['html', 'svg'], { languageName: 'xml' });
hljs.registerAliases(['yml'], { languageName: 'yaml' });
hljs.registerAliases(['toml'], { languageName: 'ini' });

const marked = new Marked({
	gfm: true,
	breaks: true,
	renderer: {
		code({ text, lang }: { text: string; lang?: string }) {
			const language = lang && hljs.getLanguage(lang) ? lang : undefined;
			let highlighted: string;
			let detectedLang: string;
			if (language) {
				highlighted = hljs.highlight(text, { language }).value;
				detectedLang = language;
			} else {
				const result = hljs.highlightAuto(text);
				highlighted = result.value;
				detectedLang = result.language || lang || 'code';
			}

			// Color markdown table: header row bold+colored, separator line dimmed
			if (detectedLang === 'markdown' || lang === 'markdown' || lang === 'md') {
				const lines = highlighted.split('\n');
				highlighted = lines.map((line, i) => {
					const plain = line.replace(/<[^>]*>/g, '').trim();
					// Separator line (|------|------|)
					if (/^\|[\s\-:|]+\|$/.test(plain)) {
						return `<span class="hljs-table-sep">${line}</span>`;
					}
					// Header row: line before a separator
					if (/^\|.*\|$/.test(plain)) {
						const nextPlain = i + 1 < lines.length ? lines[i + 1].replace(/<[^>]*>/g, '').trim() : '';
						if (/^\|[\s\-:|]+\|$/.test(nextPlain)) {
							return `<span class="hljs-table-header">${line}</span>`;
						}
					}
					return line;
				}).join('\n');
			}

			return `<div class="code-block-wrapper group/copy relative rounded-lg" style="background: var(--code-block-bg); border: 0.5px solid var(--border-300);">
				<div class="flex items-center justify-between p-3.5 pb-0">
					<span class="text-xs font-small" style="color: var(--text-500);">${escapeAttr(detectedLang)}</span>
					<button class="copy-btn opacity-0 group-hover/copy:opacity-100 transition-opacity rounded-md p-1 hover:bg-black/5" style="color: var(--text-500);" data-code="${escapeAttr(text)}" data-default-label="copy" aria-label="Copy code"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
				</div>
				<div class="overflow-x-auto"><pre class="!my-0 !rounded-lg !text-sm !leading-relaxed p-3.5" style="background: transparent;"><code class="hljs" style="background: transparent; font-family: var(--font-mono); white-space: pre;">${highlighted}</code></pre></div>
			</div>`;
		},
		codespan({ text }: { text: string }) {
			return `<code style="background: hsl(var(--_gray-200) / 0.05); border: 0.5px solid var(--border-300); color: var(--danger-000);" class="whitespace-pre-wrap rounded-[0.4rem] px-1 py-px text-[0.9rem]">${escapeAttr(text)}</code>`;
		},
		link({ href, text }: { href: string; text: string }) {
			const safeHref = /^javascript:/i.test(href) ? '#' : escapeAttr(href);
			return `<a href="${safeHref}" class="text-accent underline" target="_blank" rel="noopener">${text}</a>`;
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
