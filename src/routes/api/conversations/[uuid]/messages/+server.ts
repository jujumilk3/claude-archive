import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/db';

export const GET: RequestHandler = ({ params }) => {
	const db = getDb();

	const conversation = db
		.prepare('SELECT uuid, name, summary, created_at, updated_at FROM conversation WHERE uuid = ?')
		.get(params.uuid) as { uuid: string; name: string; created_at: string } | undefined;

	if (!conversation) {
		error(404, 'Conversation not found');
	}

	const messages = db
		.prepare(
			`SELECT uuid, text, content_json, sender, created_at, message_order, has_tool_use, attachments_json, files_json
			 FROM message
			 WHERE conversation_uuid = ?
			 ORDER BY message_order`
		)
		.all(params.uuid);

	return json({
		conversation,
		messages
	});
};
