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
		// hljs auto-detects a language since 'unknownlang' is not registered
		expect(result).not.toContain('>code<');
		expect(result).not.toContain('>unknownlang<');
	});
});
