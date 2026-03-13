import type { LayoutServerLoad } from './$types';
import { getDb } from '$lib/db';

export const load: LayoutServerLoad = () => {
	const db = getDb();

	const total = (
		db.prepare('SELECT COUNT(*) as count FROM conversation').get() as { count: number }
	).count;

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
			LIMIT 50 OFFSET 0`
		)
		.all() as Array<{
		uuid: string;
		name: string;
		summary: string;
		created_at: string;
		updated_at: string;
		first_message_preview: string | null;
	}>;

	return {
		initialConversations: conversations,
		totalConversations: total,
		hasMoreConversations: total > 50
	};
};
