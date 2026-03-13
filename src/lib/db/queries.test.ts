import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { vi } from 'vitest';

const TEST_DB_PATH = path.resolve('data', 'test-queries.db');
const SCHEMA_PATH = path.resolve('src', 'lib', 'db', 'schema.sql');

let db: Database.Database;

vi.mock('$lib/db', () => ({
	getDb: () => db
}));

describe('data access layer', () => {
	beforeAll(async () => {
		db = new Database(TEST_DB_PATH);
		const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
		db.exec(schema);

		const insertConv = db.prepare(
			`INSERT INTO conversation (uuid, name, summary, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?)`
		);
		const insertMsg = db.prepare(
			`INSERT INTO message (uuid, conversation_uuid, text, content_json, sender, created_at, message_order, attachments_json, files_json)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
		);
		const insertProject = db.prepare(
			`INSERT INTO project (uuid, name, description, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?)`
		);
		const insertDoc = db.prepare(
			`INSERT INTO project_doc (uuid, project_uuid, filename, content, created_at)
			 VALUES (?, ?, ?, ?, ?)`
		);

		insertConv.run('conv-a', 'Alpha Chat', 'summary-a', '2025-03-01T00:00:00Z', '2025-03-10T00:00:00Z');
		insertConv.run('conv-b', '', '', '2025-02-01T00:00:00Z', '2025-03-05T00:00:00Z');
		insertConv.run('conv-c', 'Gamma Chat', '', '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z');

		insertMsg.run('msg-1', 'conv-a', 'Hello from user', '[]', 'human', '2025-03-01T00:00:00Z', 0, '[]', '[]');
		insertMsg.run('msg-2', 'conv-a', 'Hello from assistant', '[]', 'assistant', '2025-03-01T00:01:00Z', 1, '[]', '[]');
		insertMsg.run('msg-3', 'conv-b', 'First message in unnamed conv', '[]', 'human', '2025-02-01T00:00:00Z', 0, '[]', '[]');
		insertMsg.run('msg-4', 'conv-b', 'Response in unnamed', '[]', 'assistant', '2025-02-01T00:01:00Z', 1, '[]', '[]');

		insertProject.run('proj-1', 'My Project', 'A test project', '2025-01-01T00:00:00Z', '2025-03-01T00:00:00Z');
		insertProject.run('proj-2', 'Empty Project', '', '2025-02-01T00:00:00Z', '2025-02-01T00:00:00Z');

		insertDoc.run('doc-1', 'proj-1', 'README.md', '# Hello World', '2025-01-01T00:00:00Z');
		insertDoc.run('doc-2', 'proj-1', 'spec.md', 'Spec content', '2025-01-02T00:00:00Z');
	});

	afterAll(() => {
		db?.close();
		if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
	});

	it('getConversationCount returns total conversations', async () => {
		const { getConversationCount } = await import('./queries');
		expect(getConversationCount()).toBe(3);
	});

	it('getConversationList returns conversations ordered by updated_at desc', async () => {
		const { getConversationList } = await import('./queries');
		const list = getConversationList(0, 10);

		expect(list).toHaveLength(3);
		expect(list[0].uuid).toBe('conv-a');
		expect(list[1].uuid).toBe('conv-b');
		expect(list[2].uuid).toBe('conv-c');
	});

	it('getConversationList respects offset and limit', async () => {
		const { getConversationList } = await import('./queries');
		const page1 = getConversationList(0, 2);
		const page2 = getConversationList(2, 2);

		expect(page1).toHaveLength(2);
		expect(page2).toHaveLength(1);
		expect(page1[0].uuid).toBe('conv-a');
		expect(page2[0].uuid).toBe('conv-c');
	});

	it('getConversationList includes first_message_preview for unnamed conversations', async () => {
		const { getConversationList } = await import('./queries');
		const list = getConversationList(0, 10);

		const unnamed = list.find((c) => c.uuid === 'conv-b');
		expect(unnamed).toBeDefined();
		expect(unnamed!.name).toBe('');
		expect(unnamed!.first_message_preview).toBe('First message in unnamed conv');
	});

	it('getConversationByUuid returns conversation detail', async () => {
		const { getConversationByUuid } = await import('./queries');
		const conv = getConversationByUuid('conv-a');

		expect(conv).toBeDefined();
		expect(conv!.uuid).toBe('conv-a');
		expect(conv!.name).toBe('Alpha Chat');
		expect(conv!.created_at).toBe('2025-03-01T00:00:00Z');
	});

	it('getConversationByUuid returns undefined for nonexistent uuid', async () => {
		const { getConversationByUuid } = await import('./queries');
		expect(getConversationByUuid('nonexistent')).toBeUndefined();
	});

	it('getMessagesByConversation returns messages in order', async () => {
		const { getMessagesByConversation } = await import('./queries');
		const messages = getMessagesByConversation('conv-a');

		expect(messages).toHaveLength(2);
		expect(messages[0].uuid).toBe('msg-1');
		expect(messages[0].sender).toBe('human');
		expect(messages[1].uuid).toBe('msg-2');
		expect(messages[1].sender).toBe('assistant');
	});

	it('getMessagesByConversation returns empty array for nonexistent conversation', async () => {
		const { getMessagesByConversation } = await import('./queries');
		expect(getMessagesByConversation('nonexistent')).toEqual([]);
	});

	it('getProjectList returns projects with doc counts ordered by updated_at desc', async () => {
		const { getProjectList } = await import('./queries');
		const projects = getProjectList();

		expect(projects).toHaveLength(2);
		expect(projects[0].uuid).toBe('proj-1');
		expect(projects[0].doc_count).toBe(2);
		expect(projects[1].uuid).toBe('proj-2');
		expect(projects[1].doc_count).toBe(0);
	});

	it('getProjectByUuid returns project detail', async () => {
		const { getProjectByUuid } = await import('./queries');
		const proj = getProjectByUuid('proj-1');

		expect(proj).toBeDefined();
		expect(proj!.name).toBe('My Project');
		expect(proj!.description).toBe('A test project');
	});

	it('getProjectByUuid returns undefined for nonexistent uuid', async () => {
		const { getProjectByUuid } = await import('./queries');
		expect(getProjectByUuid('nonexistent')).toBeUndefined();
	});

	it('getProjectDocs returns docs ordered by created_at', async () => {
		const { getProjectDocs } = await import('./queries');
		const docs = getProjectDocs('proj-1');

		expect(docs).toHaveLength(2);
		expect(docs[0].filename).toBe('README.md');
		expect(docs[0].content).toBe('# Hello World');
		expect(docs[1].filename).toBe('spec.md');
	});

	it('getProjectDocs returns empty array for project with no docs', async () => {
		const { getProjectDocs } = await import('./queries');
		expect(getProjectDocs('proj-2')).toEqual([]);
	});

	it('getMessagesByConversation returns all expected fields', async () => {
		const { getMessagesByConversation } = await import('./queries');
		const messages = getMessagesByConversation('conv-a');
		const msg = messages[0];

		expect(msg).toHaveProperty('uuid');
		expect(msg).toHaveProperty('text');
		expect(msg).toHaveProperty('content_json');
		expect(msg).toHaveProperty('sender');
		expect(msg).toHaveProperty('created_at');
		expect(msg).toHaveProperty('message_order');
		expect(msg).toHaveProperty('has_tool_use');
		expect(msg).toHaveProperty('attachments_json');
		expect(msg).toHaveProperty('files_json');
	});

	it('getConversationList includes first_message_preview for named conversations', async () => {
		const { getConversationList } = await import('./queries');
		const list = getConversationList(0, 10);

		const named = list.find((c) => c.uuid === 'conv-a');
		expect(named).toBeDefined();
		expect(named!.name).toBe('Alpha Chat');
		expect(named!.first_message_preview).toBe('Hello from user');
	});

	it('getProjectByUuid returns all expected fields', async () => {
		const { getProjectByUuid } = await import('./queries');
		const proj = getProjectByUuid('proj-1');

		expect(proj).toBeDefined();
		expect(proj).toHaveProperty('uuid');
		expect(proj).toHaveProperty('name');
		expect(proj).toHaveProperty('description');
		expect(proj).toHaveProperty('created_at');
		expect(proj).toHaveProperty('updated_at');
	});

	it('getProjectDocs returns all expected fields', async () => {
		const { getProjectDocs } = await import('./queries');
		const docs = getProjectDocs('proj-1');
		const doc = docs[0];

		expect(doc).toHaveProperty('uuid');
		expect(doc).toHaveProperty('filename');
		expect(doc).toHaveProperty('content');
		expect(doc).toHaveProperty('created_at');
	});
});
