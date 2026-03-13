import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/db';

export const GET: RequestHandler = ({ url }) => {
	const offset = parseInt(url.searchParams.get('offset') || '0', 10);
	const limit = parseInt(url.searchParams.get('limit') || '50', 10);

	const db = getDb();

	const total = (db.prepare('SELECT COUNT(*) as count FROM conversation').get() as { count: number }).count;

	const conversations = db
		.prepare(
			`SELECT
				c.uuid,
				c.name,
				c.summary,
				c.created_at,
				c.updated_at,
				(
					SELECT SUBSTR(m.text, 1, 50)
					FROM message m
					WHERE m.conversation_uuid = c.uuid AND m.sender = 'human'
					ORDER BY m.message_order ASC
					LIMIT 1
				) as first_message_preview
			FROM conversation c
			ORDER BY c.updated_at DESC
			LIMIT ? OFFSET ?`
		)
		.all(limit, offset) as Array<{
		uuid: string;
		name: string;
		summary: string;
		created_at: string;
		updated_at: string;
		first_message_preview: string | null;
	}>;

	return json({
		conversations,
		total,
		hasMore: offset + limit < total
	});
};
