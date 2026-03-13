import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/db';

function escapeFts5Query(query: string): string {
	return query.replace(/['"*()[\]{}\-:^~+.]/g, ' ').trim();
}

export const GET: RequestHandler = ({ url }) => {
	const q = url.searchParams.get('q') || '';
	const offset = parseInt(url.searchParams.get('offset') || '0', 10);
	const limit = parseInt(url.searchParams.get('limit') || '20', 10);

	if (q.length < 2) {
		return json({ results: [], total: 0, hasMore: false });
	}

	const db = getDb();
	const escaped = escapeFts5Query(q);

	if (!escaped) {
		return json({ results: [], total: 0, hasMore: false });
	}

	const ftsQuery = `"${escaped}"`;

	const countResult = db
		.prepare(
			`SELECT COUNT(*) as count
			 FROM message_fts
			 WHERE message_fts MATCH ?`
		)
		.get(ftsQuery) as { count: number };

	const results = db
		.prepare(
			`SELECT
				m.uuid as message_uuid,
				m.conversation_uuid,
				CASE WHEN c.name != '' THEN c.name
					ELSE COALESCE(
						(SELECT SUBSTR(m2.text, 1, 50)
						 FROM message m2
						 WHERE m2.conversation_uuid = c.uuid AND m2.sender = 'human'
						 ORDER BY m2.message_order LIMIT 1),
						''
					)
				END as conversation_name,
				snippet(message_fts, 0, '<mark>', '</mark>', '...', 32) as snippet,
				m.sender as message_sender,
				m.created_at
			 FROM message_fts
			 JOIN message m ON m.rowid = message_fts.rowid
			 JOIN conversation c ON c.uuid = m.conversation_uuid
			 WHERE message_fts MATCH ?
			 ORDER BY rank
			 LIMIT ? OFFSET ?`
		)
		.all(ftsQuery, limit, offset);

	return json({
		results,
		total: countResult.count,
		hasMore: offset + limit < countResult.count
	});
};
