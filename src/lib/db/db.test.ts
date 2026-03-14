import { describe, it, expect, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const TEST_DB_PATH = path.resolve('data', 'test-archive.db');
const SCHEMA_PATH = path.resolve('src', 'lib', 'db', 'schema.sql');

describe('database schema', () => {
	let db: Database.Database;

	afterAll(() => {
		db?.close();
		if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
	});

	it('creates all tables from schema.sql', () => {
		db = new Database(TEST_DB_PATH);
		const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
		db.exec(schema);

		const tables = db
			.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
			.all() as { name: string }[];

		const tableNames = tables.map((t) => t.name);
		expect(tableNames).toContain('conversation');
		expect(tableNames).toContain('message');
		expect(tableNames).toContain('project');
		expect(tableNames).toContain('project_doc');
		expect(tableNames).toContain('ingest_log');
		expect(tableNames).toContain('message_fts');
	});

	it('inserts and queries conversations and messages', () => {
		db.prepare(
			`INSERT INTO conversation (uuid, name, summary, created_at, updated_at)
			 VALUES ('test-conv-1', 'Test Conversation', '', '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z')`
		).run();

		db.prepare(
			`INSERT INTO message (uuid, conversation_uuid, text, content_json, sender, created_at, message_order)
			 VALUES ('test-msg-1', 'test-conv-1', 'Hello world', '[]', 'human', '2025-01-01T00:00:00Z', 0)`
		).run();

		const messages = db
			.prepare('SELECT * FROM message WHERE conversation_uuid = ? ORDER BY message_order')
			.all('test-conv-1') as { uuid: string; text: string }[];

		expect(messages).toHaveLength(1);
		expect(messages[0].text).toBe('Hello world');
	});

	it('populates FTS index via trigger', () => {
		const results = db
			.prepare("SELECT * FROM message_fts WHERE message_fts MATCH 'hello'")
			.all();

		expect(results).toHaveLength(1);
	});

	it('inserts projects and docs', () => {
		db.prepare(
			`INSERT INTO project (uuid, name, description, created_at, updated_at)
			 VALUES ('test-proj-1', 'Test Project', 'A test', '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z')`
		).run();

		db.prepare(
			`INSERT INTO project_doc (uuid, project_uuid, filename, content, created_at)
			 VALUES ('test-doc-1', 'test-proj-1', 'README.md', '# Hello', '2025-01-01T00:00:00Z')`
		).run();

		const docs = db
			.prepare('SELECT * FROM project_doc WHERE project_uuid = ?')
			.all('test-proj-1') as { uuid: string; filename: string }[];

		expect(docs).toHaveLength(1);
		expect(docs[0].filename).toBe('README.md');
	});

	it('tracks ingestion in ingest_log', () => {
		db.prepare(
			`INSERT INTO ingest_log (filename, ingested_at, conversation_count, message_count)
			 VALUES ('test-batch', '2025-01-01T00:00:00Z', 10, 100)`
		).run();

		const log = db.prepare('SELECT * FROM ingest_log WHERE filename = ?').get('test-batch') as {
			conversation_count: number;
			message_count: number;
		};

		expect(log.conversation_count).toBe(10);
		expect(log.message_count).toBe(100);
	});
});

describe('ingested data', () => {
	const DB_PATH = path.resolve('data', 'archive.db');
	const hasDb = fs.existsSync(DB_PATH);

	it.skipIf(!hasDb)('has ingested data in archive.db', () => {
		const db = new Database(DB_PATH, { readonly: true });
		const convCount = (db.prepare('SELECT COUNT(*) as count FROM conversation').get() as { count: number }).count;
		const msgCount = (db.prepare('SELECT COUNT(*) as count FROM message').get() as { count: number }).count;
		const projCount = (db.prepare('SELECT COUNT(*) as count FROM project').get() as { count: number }).count;

		expect(convCount).toBeGreaterThan(0);
		expect(msgCount).toBeGreaterThan(0);
		expect(projCount).toBeGreaterThan(0);

		db.close();
	});
});
