import { describe, it, expect } from 'vitest';
import { highlightSearchTerms, renderMarkdown } from './markdown';

describe('highlightSearchTerms', () => {
	it('wraps matching terms in mark tags', () => {
		const result = highlightSearchTerms('<p>hello world</p>', 'hello');
		expect(result).toContain('<mark class="search-highlight">hello</mark>');
		expect(result).toContain('world');
	});

	it('is case insensitive', () => {
		const result = highlightSearchTerms('<p>Hello World</p>', 'hello');
		expect(result).toContain('<mark class="search-highlight">Hello</mark>');
	});

	it('does not modify HTML tags', () => {
		const result = highlightSearchTerms('<a href="class">class test</a>', 'class');
		expect(result).toBe('<a href="class"><mark class="search-highlight">class</mark> test</a>');
	});

	it('returns unchanged html for short queries', () => {
		const html = '<p>test</p>';
		expect(highlightSearchTerms(html, '')).toBe(html);
		expect(highlightSearchTerms(html, 'a')).toBe(html);
	});

	it('handles multiple search terms', () => {
		const result = highlightSearchTerms('<p>hello beautiful world</p>', 'hello world');
		expect(result).toContain('<mark class="search-highlight">hello</mark>');
		expect(result).toContain('<mark class="search-highlight">world</mark>');
	});

	it('escapes regex special characters in query', () => {
		const result = highlightSearchTerms('<p>price is $10.00</p>', '$10');
		expect(result).toContain('<mark class="search-highlight">$10</mark>');
	});

	it('returns unchanged html when all terms are single characters', () => {
		const html = '<p>a b c test</p>';
		expect(highlightSearchTerms(html, 'a b')).toBe(html);
	});
});

describe('renderMarkdown', () => {
	it('shows specified language label in code blocks', () => {
		const result = renderMarkdown('```python\nprint("hello")\n```');
		expect(result).toContain('>python<');
	});

	it('shows auto-detected language label for unlabeled code blocks', () => {
		const result = renderMarkdown('```\nfunction foo() { return 42; }\n```');
		expect(result).not.toContain('>code<');
	});

	it('auto-detects language when fence label is not recognized', () => {
		const result = renderMarkdown('```unknownlang\nsome content\n```');
		expect(result).not.toContain('>code<');
		expect(result).not.toContain('>unknownlang<');
	});

	it('renders inline code with codespan styling', () => {
		const result = renderMarkdown('use `foo()` here');
		expect(result).toContain('<code class="rounded bg-code-bg px-1 py-0.5 text-sm">foo()</code>');
	});

	it('renders links with target _blank and rel noopener', () => {
		const result = renderMarkdown('[example](https://example.com)');
		expect(result).toContain('href="https://example.com"');
		expect(result).toContain('target="_blank"');
		expect(result).toContain('rel="noopener"');
		expect(result).toContain('class="text-accent underline"');
	});

	it('renders GFM tables with styled headers and cells', () => {
		const md = '| Name | Age |\n| --- | --- |\n| Alice | 30 |\n| Bob | 25 |';
		const result = renderMarkdown(md);
		expect(result).toContain('<table class="my-2 w-full border-collapse text-sm">');
		expect(result).toContain('<th class="px-3 py-1.5 text-left text-text-secondary font-medium">Name</th>');
		expect(result).toContain('<td class="px-3 py-1.5">Alice</td>');
		expect(result).toContain('<td class="px-3 py-1.5">25</td>');
	});

	it('returns empty string for empty input', () => {
		expect(renderMarkdown('')).toBe('');
	});

	it('escapes special characters in code block copy button data attribute', () => {
		const result = renderMarkdown('```\nif (a < b && c > d) { "hello" }\n```');
		expect(result).toContain('data-code="');
		expect(result).toContain('&lt;');
		expect(result).toContain('&gt;');
		expect(result).toContain('&amp;');
		expect(result).toContain('&quot;');
	});

	it('renders code blocks with line numbers and copy button', () => {
		const result = renderMarkdown('```js\nconst x = 1;\nconst y = 2;\n```');
		expect(result).toContain('class="line-number"');
		expect(result).toContain('class="line-content"');
		expect(result).toContain('class="copy-btn');
		expect(result).toContain('>js<');
	});

	it('renders bold and italic text', () => {
		const result = renderMarkdown('**bold** and *italic*');
		expect(result).toContain('<strong>bold</strong>');
		expect(result).toContain('<em>italic</em>');
	});

	it('renders unordered lists', () => {
		const result = renderMarkdown('- item 1\n- item 2');
		expect(result).toContain('<li>');
		expect(result).toContain('item 1');
		expect(result).toContain('item 2');
	});
});
