export function escapeFts5Query(query: string): string {
	return query.replace(/['"*()[\]{}\-:^~+.]/g, ' ').trim();
}

export function buildFts5Query(userInput: string): string | null {
	const escaped = escapeFts5Query(userInput);
	if (!escaped) return null;
	const words = escaped.split(/\s+/).filter((w) => w.length > 0);
	if (words.length === 0) return null;
	return words.map((w) => `"${w}"`).join(' ');
}

export function sanitizeSnippet(snippet: string): string {
	return snippet
		.replace(/<mark>/g, '\x00MS\x00')
		.replace(/<\/mark>/g, '\x00ME\x00')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/\x00MS\x00/g, '<mark>')
		.replace(/\x00ME\x00/g, '</mark>');
}
