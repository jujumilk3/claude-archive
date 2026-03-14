import { getDb } from '$lib/db';

export interface ConversationSummary {
	uuid: string;
	name: string;
	summary: string;
	source: string;
	created_at: string;
	updated_at: string;
	first_message_preview: string | null;
}

export interface ConversationDetail {
	uuid: string;
	name: string;
	summary: string;
	source: string;
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
	c.source,
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

export function getConversationListWithCount(offset = 0, limit = 50): { conversations: ConversationSummary[]; total: number } {
	const db = getDb();
	const query = db.transaction(() => {
		const countResult = db.prepare('SELECT COUNT(*) as count FROM conversation').get() as { count: number };
		const total = countResult.count;
		const conversations = db.prepare(CONVERSATION_LIST_SQL).all(limit, offset) as ConversationSummary[];
		return { conversations, total };
	});
	return query();
}

export function getConversationByUuid(uuid: string): ConversationDetail | undefined {
	const db = getDb();
	return db
		.prepare('SELECT uuid, name, summary, source, created_at, updated_at FROM conversation WHERE uuid = ?')
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

export interface ArchiveStats {
	total_conversations: number;
	total_messages: number;
	total_projects: number;
	oldest_conversation: string | null;
	newest_conversation: string | null;
}

export function getArchiveStats(): ArchiveStats {
	const db = getDb();
	return db.prepare(`SELECT
		(SELECT COUNT(*) FROM conversation) as total_conversations,
		(SELECT COUNT(*) FROM message) as total_messages,
		(SELECT COUNT(*) FROM project) as total_projects,
		(SELECT MIN(created_at) FROM conversation) as oldest_conversation,
		(SELECT MAX(created_at) FROM conversation) as newest_conversation
	`).get() as ArchiveStats;
}

export interface SearchResult {
	message_uuid: string;
	conversation_uuid: string;
	conversation_name: string;
	snippet: string;
	message_sender: string;
	created_at: string;
}

const SEARCH_FTS_SQL = `SELECT
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
LIMIT ? OFFSET ?`;

const SEARCH_TITLE_SQL = `SELECT
	c.uuid as conversation_uuid,
	CASE WHEN c.name != '' THEN c.name
		ELSE COALESCE(
			(SELECT SUBSTR(m.text, 1, 50)
			 FROM message m
			 WHERE m.conversation_uuid = c.uuid AND m.sender = 'human'
			 ORDER BY m.message_order LIMIT 1),
			''
		)
	END as conversation_name,
	c.summary as snippet,
	c.updated_at as created_at
FROM conversation c
WHERE c.name LIKE '%' || @q || '%'
   OR (c.name = '' AND EXISTS (
       SELECT 1 FROM message m
       WHERE m.conversation_uuid = c.uuid AND m.sender = 'human'
         AND m.text LIKE '%' || @q || '%'
       LIMIT 1
   ))
ORDER BY c.updated_at DESC
LIMIT @lim`;

const UNTITLED_KEYWORDS = ['untitled', '(untitled)', '제목 없음', '(제목 없음)', 'no title', 'notitle'];

const SEARCH_UNTITLED_SQL = `SELECT
	c.uuid as conversation_uuid,
	COALESCE(
		(SELECT SUBSTR(m.text, 1, 50)
		 FROM message m
		 WHERE m.conversation_uuid = c.uuid AND m.sender = 'human'
		 ORDER BY m.message_order LIMIT 1),
		''
	) as conversation_name,
	c.summary as snippet,
	c.updated_at as created_at
FROM conversation c
WHERE c.name = ''
ORDER BY c.updated_at DESC
LIMIT ?`;

function isUntitledSearch(query: string): boolean {
	const q = query.toLowerCase().trim();
	return UNTITLED_KEYWORDS.some((kw) => kw.includes(q) || q.includes(kw));
}

export function searchMessages(ftsQuery: string, offset = 0, limit = 20, rawQuery = ''): { results: SearchResult[]; total: number } {
	const db = getDb();
	const likeQuery = rawQuery || ftsQuery.replace(/"/g, '');
	const search = db.transaction(() => {
		let ftsResults: SearchResult[] = [];
		let ftsTotal = 0;

		// FTS search (may fail for non-FTS-friendly queries like "(Unti")
		try {
			const ftsCountResult = db
				.prepare('SELECT COUNT(*) as count FROM message_fts WHERE message_fts MATCH ?')
				.get(ftsQuery) as { count: number } | undefined;
			ftsTotal = ftsCountResult?.count ?? 0;
			ftsResults = db.prepare(SEARCH_FTS_SQL).all(ftsQuery, limit, offset) as SearchResult[];
		} catch {
			// FTS query syntax error — skip FTS results
		}

		const ftsConvUuids = new Set(ftsResults.map((r) => r.conversation_uuid));

		let titleResults: SearchResult[] = [];
		if (offset === 0) {
			if (isUntitledSearch(rawQuery)) {
				titleResults = (db.prepare(SEARCH_UNTITLED_SQL).all(50) as Array<{ conversation_uuid: string; conversation_name: string; snippet: string; created_at: string }>)
					.filter((r) => !ftsConvUuids.has(r.conversation_uuid))
					.map((r): SearchResult => ({
						message_uuid: '',
						conversation_uuid: r.conversation_uuid,
						conversation_name: r.conversation_name || '(Untitled)',
						snippet: r.snippet || r.conversation_name || '(Untitled)',
						message_sender: 'title',
						created_at: r.created_at
					}));
			} else {
				titleResults = (db.prepare(SEARCH_TITLE_SQL).all({ q: likeQuery, lim: 20 }) as Array<{ conversation_uuid: string; conversation_name: string; snippet: string; created_at: string }>)
					.filter((r) => !ftsConvUuids.has(r.conversation_uuid))
					.map((r): SearchResult => ({
						message_uuid: '',
						conversation_uuid: r.conversation_uuid,
						conversation_name: r.conversation_name,
						snippet: r.snippet || r.conversation_name,
						message_sender: 'title',
						created_at: r.created_at
					}));
			}
		}

		const results = [...titleResults, ...ftsResults];
		const total = ftsTotal + (offset === 0 ? titleResults.length : 0);
		return { results, total };
	});
	return search();
}
