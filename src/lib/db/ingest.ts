import { getDb } from '$lib/db';

// ── Claude types ──

interface ContentBlock {
	type: 'text' | 'tool_use' | 'tool_result';
	text?: string;
	name?: string;
	input?: Record<string, unknown>;
	content?: Array<{ type: string; text: string; uuid?: string }> | string;
	is_error?: boolean;
	[key: string]: unknown;
}

interface ClaudeMessage {
	uuid: string;
	text: string;
	content: ContentBlock[];
	sender: 'human' | 'assistant';
	created_at: string;
	updated_at: string;
	attachments: unknown[];
	files: unknown[];
}

interface ClaudeConversation {
	uuid: string;
	name: string;
	summary: string;
	created_at: string;
	updated_at: string;
	account: { uuid: string };
	chat_messages: ClaudeMessage[];
}

interface ProjectDoc {
	uuid: string;
	filename: string;
	content: string;
	created_at: string;
}

interface Project {
	uuid: string;
	name: string;
	description: string;
	created_at: string;
	updated_at: string;
	docs: ProjectDoc[];
}

// ── OpenAI types ──

interface OpenAIMappingNode {
	id: string;
	message: {
		id: string;
		author: { role: string; name?: string };
		create_time: number | null;
		content: { content_type: string; parts?: Array<string | Record<string, unknown>>; text?: string };
		status: string;
		metadata?: Record<string, unknown>;
	} | null;
	parent: string | null;
	children: string[];
}

interface OpenAIConversation {
	conversation_id?: string;
	id?: string;
	title: string;
	create_time: number;
	update_time: number;
	mapping: Record<string, OpenAIMappingNode>;
	current_node?: string;
}

// ── Helpers ──

function hasToolUse(content: ContentBlock[]): boolean {
	return content.some((block) => block.type === 'tool_use');
}

function unixToIso(ts: number | null): string {
	if (!ts) return new Date().toISOString();
	return new Date(ts * 1000).toISOString();
}

function extractOpenAIMessages(conv: OpenAIConversation): Array<{ id: string; text: string; sender: 'human' | 'assistant'; created_at: string }> {
	const messages: Array<{ id: string; text: string; sender: 'human' | 'assistant'; created_at: string }> = [];

	// Walk from current_node back to root to get linear thread
	let nodeId = conv.current_node;
	const chain: string[] = [];
	while (nodeId) {
		chain.push(nodeId);
		nodeId = conv.mapping[nodeId]?.parent ?? null;
	}
	chain.reverse();

	for (const nid of chain) {
		const node = conv.mapping[nid];
		if (!node?.message) continue;

		const { author, content, create_time } = node.message;
		if (author.role === 'system') continue;

		const sender: 'human' | 'assistant' = author.role === 'user' ? 'human' : 'assistant';

		let text = '';
		if (content.parts) {
			text = content.parts
				.filter((p): p is string => typeof p === 'string')
				.join('\n');
		} else if (content.text) {
			text = content.text;
		}

		if (!text.trim()) continue;

		messages.push({
			id: node.message.id,
			text,
			sender,
			created_at: unixToIso(create_time)
		});
	}

	return messages;
}

// ── Auto-detect format ──

export function detectFormat(jsonString: string): 'claude' | 'openai' | 'unknown' {
	const trimmed = jsonString.trimStart();
	if (!trimmed.startsWith('[')) return 'unknown';

	const parsed = JSON.parse(jsonString);
	if (!Array.isArray(parsed) || parsed.length === 0) return 'unknown';

	const first = parsed[0];
	if (first.chat_messages !== undefined || first.account !== undefined) return 'claude';
	if (first.mapping !== undefined || first.conversation_id !== undefined) return 'openai';
	return 'unknown';
}

// ── Claude ingest ──

export function ingestClaudeConversations(jsonString: string): { conversations: number; messages: number } {
	const db = getDb();
	const conversations: ClaudeConversation[] = JSON.parse(jsonString);

	const insertConv = db.prepare(`
		INSERT OR REPLACE INTO conversation (uuid, name, summary, source, created_at, updated_at)
		VALUES (?, ?, ?, 'claude', ?, ?)
	`);

	const insertMsg = db.prepare(`
		INSERT OR REPLACE INTO message (uuid, conversation_uuid, text, content_json, sender, created_at, message_order, has_tool_use, attachments_json, files_json)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`);

	let convCount = 0;
	let msgCount = 0;

	const run = db.transaction(() => {
		for (const conv of conversations) {
			insertConv.run(conv.uuid, conv.name || '', conv.summary || '', conv.created_at, conv.updated_at);
			convCount++;

			if (!conv.chat_messages) continue;

			for (let i = 0; i < conv.chat_messages.length; i++) {
				const msg = conv.chat_messages[i];
				insertMsg.run(
					msg.uuid, conv.uuid, msg.text || '', JSON.stringify(msg.content || []),
					msg.sender, msg.created_at, i, hasToolUse(msg.content || []) ? 1 : 0,
					JSON.stringify(msg.attachments || []), JSON.stringify(msg.files || [])
				);
				msgCount++;
			}
		}
	});

	run();
	return { conversations: convCount, messages: msgCount };
}

// ── OpenAI ingest ──

export function ingestOpenAIConversations(jsonString: string): { conversations: number; messages: number } {
	const db = getDb();
	const conversations: OpenAIConversation[] = JSON.parse(jsonString);

	const insertConv = db.prepare(`
		INSERT OR REPLACE INTO conversation (uuid, name, summary, source, created_at, updated_at)
		VALUES (?, ?, '', 'openai', ?, ?)
	`);

	const insertMsg = db.prepare(`
		INSERT OR REPLACE INTO message (uuid, conversation_uuid, text, content_json, sender, created_at, message_order, has_tool_use, attachments_json, files_json)
		VALUES (?, ?, ?, ?, ?, ?, ?, 0, '[]', '[]')
	`);

	let convCount = 0;
	let msgCount = 0;

	const run = db.transaction(() => {
		for (const conv of conversations) {
			const uuid = conv.conversation_id || conv.id || '';
			if (!uuid) continue;

			insertConv.run(uuid, conv.title || '', unixToIso(conv.create_time), unixToIso(conv.update_time));
			convCount++;

			const messages = extractOpenAIMessages(conv);
			for (let i = 0; i < messages.length; i++) {
				const msg = messages[i];
				const contentJson = JSON.stringify([{ type: 'text', text: msg.text }]);
				insertMsg.run(msg.id, uuid, msg.text, contentJson, msg.sender, msg.created_at, i);
				msgCount++;
			}
		}
	});

	run();
	return { conversations: convCount, messages: msgCount };
}

// ── Legacy alias ──

export const ingestConversationsJson = ingestClaudeConversations;

// ── Projects (Claude only) ──

export function ingestProjectsJson(jsonString: string): number {
	const db = getDb();
	const projects: Project[] = JSON.parse(jsonString);

	const insertProject = db.prepare(`
		INSERT OR REPLACE INTO project (uuid, name, description, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)
	`);

	const insertDoc = db.prepare(`
		INSERT OR REPLACE INTO project_doc (uuid, project_uuid, filename, content, created_at)
		VALUES (?, ?, ?, ?, ?)
	`);

	let count = 0;

	const run = db.transaction(() => {
		for (const proj of projects) {
			insertProject.run(proj.uuid, proj.name, proj.description || '', proj.created_at, proj.updated_at);
			count++;

			if (proj.docs) {
				for (const doc of proj.docs) {
					insertDoc.run(doc.uuid, proj.uuid, doc.filename, doc.content || '', doc.created_at);
				}
			}
		}
	});

	run();
	return count;
}
