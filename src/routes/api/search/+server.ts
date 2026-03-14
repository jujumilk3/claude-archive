import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { buildFts5Query, sanitizeSnippet } from '$lib/search';
import { searchMessages } from '$lib/db/queries';

export const GET: RequestHandler = ({ url }) => {
	const q = url.searchParams.get('q') || '';
	const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);
	const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10) || 20));

	if (q.length < 2) {
		return json({ results: [], total: 0, hasMore: false });
	}

	const ftsQuery = buildFts5Query(q);

	if (!ftsQuery) {
		return json({ results: [], total: 0, hasMore: false });
	}

	try {
		const { results, total } = searchMessages(ftsQuery, offset, limit);

		return json({
			results: results.map((r) => ({ ...r, snippet: sanitizeSnippet(r.snippet) })),
			total,
			hasMore: offset + limit < total
		});
	} catch (e) {
		if (typeof e === 'object' && e !== null && 'status' in e) throw e;
		console.error('Search query failed:', e);
		error(500, 'Internal server error');
	}
};
