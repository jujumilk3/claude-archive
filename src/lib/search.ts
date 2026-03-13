export function escapeFts5Query(query: string): string {
	return query.replace(/['"*()[\]{}\-:^~+.]/g, ' ').trim();
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
