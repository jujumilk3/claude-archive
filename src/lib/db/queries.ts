import { getDb } from '$lib/db';

export interface ConversationSummary {
	uuid: string;
	name: string;
	summary: string;
	created_at: string;
	updated_at: string;
	first_message_preview: string | null;
}

export interface ConversationDetail {
	uuid: string;
	name: string;
	summary: string;
	created_at: string;
	updated_at: string;
}

export interface Message {
	uuid: string;
	text: string;
	content_json: string;
	sender: string;
	created_at: string;
	message_order: number;
	has_tool_use: number;
	attachments_json: string;
	files_json: string;
}

export interface Project {
	uuid: string;
	name: string;
	description: string;
	created_at: string;
	updated_at: string;
	doc_count: number;
}

export interface ProjectDoc {
	uuid: string;
	filename: string;
	content: string;
	created_at: string;
}

const CONVERSATION_LIST_SQL = `SELECT
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
LIMIT ? OFFSET ?`;

const MESSAGES_SQL = `SELECT uuid, text, content_json, sender, created_at, message_order, has_tool_use, attachments_json, files_json
FROM message
WHERE conversation_uuid = ?
ORDER BY message_order`;

export function getConversationCount(): number {
	const db = getDb();
	return (db.prepare('SELECT COUNT(*) as count FROM conversation').get() as { count: number }).count;
}

export function getConversationList(offset = 0, limit = 50): ConversationSummary[] {
	const db = getDb();
	return db.prepare(CONVERSATION_LIST_SQL).all(limit, offset) as ConversationSummary[];
}

export function getConversationByUuid(uuid: string): ConversationDetail | undefined {
	const db = getDb();
	return db
		.prepare('SELECT uuid, name, summary, created_at, updated_at FROM conversation WHERE uuid = ?')
		.get(uuid) as ConversationDetail | undefined;
}

export function getMessagesByConversation(conversationUuid: string): Message[] {
	const db = getDb();
	return db.prepare(MESSAGES_SQL).all(conversationUuid) as Message[];
}

export function getProjectList(): Project[] {
	const db = getDb();
	return db
		.prepare(
			`SELECT
				p.uuid,
				p.name,
				p.description,
				p.created_at,
				p.updated_at,
				(SELECT COUNT(*) FROM project_doc pd WHERE pd.project_uuid = p.uuid) as doc_count
			FROM project p
			ORDER BY p.updated_at DESC`
		)
		.all() as Project[];
}

export function getProjectByUuid(uuid: string): { uuid: string; name: string; description: string; created_at: string; updated_at: string } | undefined {
	const db = getDb();
	return db
		.prepare('SELECT uuid, name, description, created_at, updated_at FROM project WHERE uuid = ?')
		.get(uuid) as { uuid: string; name: string; description: string; created_at: string; updated_at: string } | undefined;
}

export function getProjectDocs(projectUuid: string): ProjectDoc[] {
	const db = getDb();
	return db
		.prepare(
			`SELECT uuid, filename, content, created_at
			FROM project_doc
			WHERE project_uuid = ?
			ORDER BY created_at`
		)
		.all(projectUuid) as ProjectDoc[];
}
