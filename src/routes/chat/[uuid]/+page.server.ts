import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getDb } from '$lib/db';

export const load: PageServerLoad = ({ params }) => {
	const db = getDb();

	const conversation = db
		.prepare('SELECT uuid, name, summary, created_at, updated_at FROM conversation WHERE uuid = ?')
		.get(params.uuid) as
		| { uuid: string; name: string; summary: string; created_at: string; updated_at: string }
		| undefined;

	if (!conversation) {
		error(404, '대화를 찾을 수 없습니다');
	}

	const messages = db
		.prepare(
			`SELECT uuid, text, content_json, sender, created_at, message_order, has_tool_use, attachments_json, files_json
			 FROM message
			 WHERE conversation_uuid = ?
			 ORDER BY message_order`
		)
		.all(params.uuid) as Array<{
		uuid: string;
		text: string;
		content_json: string;
		sender: string;
		created_at: string;
		message_order: number;
		has_tool_use: number;
		attachments_json: string;
		files_json: string;
	}>;

	return { conversation, messages };
};
