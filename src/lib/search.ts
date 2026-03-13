export function escapeFts5Query(query: string): string {
	return query.replace(/['"*()[\]{}\-:^~+.]/g, ' ').trim();
}
