import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { escapeFts5Query } from '$lib/search';
import { searchMessages } from '$lib/db/queries';

export const GET: RequestHandler = ({ url }) => {
	const q = url.searchParams.get('q') || '';
	const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);
	const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10) || 20));

	if (q.length < 2) {
		return json({ results: [], total: 0, hasMore: false });
	}

	const escaped = escapeFts5Query(q);

	if (!escaped) {
		return json({ results: [], total: 0, hasMore: false });
	}

	try {
		const ftsQuery = `"${escaped}"`;
		const { results, total } = searchMessages(ftsQuery, offset, limit);

		return json({
			results,
			total,
			hasMore: offset + limit < total
		});
	} catch (e) {
		console.error('Search query failed:', e);
		error(500, 'Internal server error');
	}
};
