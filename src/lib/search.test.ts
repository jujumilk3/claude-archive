import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { escapeFts5Query, buildFts5Query, sanitizeSnippet } from './search';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

describe('escapeFts5Query', () => {
	it('passes through plain text unchanged', () => {
		expect(escapeFts5Query('hello world')).toBe('hello world');
	});

	it('strips double and single quotes', () => {
		expect(escapeFts5Query('"hello" \'world\'')).toBe('hello   world');
	});

	it('strips FTS5 operators: * ( ) ^ - :', () => {
		expect(escapeFts5Query('test*')).toBe('test');
		expect(escapeFts5Query('(group)')).toBe('group');
		expect(escapeFts5Query('^start')).toBe('start');
		expect(escapeFts5Query('a-b')).toBe('a b');
		expect(escapeFts5Query('col:value')).toBe('col value');
	});

	it('strips brackets, braces, tilde, plus, dot', () => {
		expect(escapeFts5Query('[test]')).toBe('test');
		expect(escapeFts5Query('{test}')).toBe('test');
		expect(escapeFts5Query('~near')).toBe('near');
		expect(escapeFts5Query('a+b')).toBe('a b');
		expect(escapeFts5Query('file.txt')).toBe('file txt');
	});

	it('returns empty string for all-special-char input', () => {
		expect(escapeFts5Query('***')).toBe('');
		expect(escapeFts5Query('"\'()')).toBe('');
	});

	it('trims leading and trailing whitespace', () => {
		expect(escapeFts5Query('  hello  ')).toBe('hello');
		expect(escapeFts5Query('*hello*')).toBe('hello');
	});

	it('preserves Korean text', () => {
		expect(escapeFts5Query('안녕하세요')).toBe('안녕하세요');
		expect(escapeFts5Query('검색 테스트')).toBe('검색 테스트');
	});

	it('handles mixed Korean and special characters', () => {
		expect(escapeFts5Query('"안녕" (세계)')).toBe('안녕   세계');
	});

	it('collapses special chars to spaces between words', () => {
		const result = escapeFts5Query('hello-world');
		expect(result).toBe('hello world');
	});
});

describe('buildFts5Query', () => {
	it('wraps single word in quotes', () => {
		expect(buildFts5Query('hello')).toBe('"hello"');
	});

	it('splits multi-word input into individual quoted terms', () => {
		expect(buildFts5Query('typescript error')).toBe('"typescript" "error"');
	});

	it('handles three or more words', () => {
		expect(buildFts5Query('react state management')).toBe('"react" "state" "management"');
	});

	it('returns null for empty input', () => {
		expect(buildFts5Query('')).toBeNull();
	});

	it('returns null for all-special-char input', () => {
		expect(buildFts5Query('***')).toBeNull();
	});

	it('strips special chars and builds query from remaining words', () => {
		expect(buildFts5Query('config.yaml settings')).toBe('"config" "yaml" "settings"');
	});

	it('handles Korean multi-word queries', () => {
		expect(buildFts5Query('검색 테스트')).toBe('"검색" "테스트"');
	});

	it('collapses extra whitespace', () => {
		expect(buildFts5Query('  hello   world  ')).toBe('"hello" "world"');
	});

	it('filters out single-character words (consistent with highlightSearchTerms)', () => {
		expect(buildFts5Query('a hello')).toBe('"hello"');
		expect(buildFts5Query('I am ok')).toBe('"am" "ok"');
	});

	it('returns null when all words are single characters', () => {
		expect(buildFts5Query('a b c')).toBeNull();
	});
});

describe('sanitizeSnippet', () => {
	it('preserves mark tags while escaping HTML', () => {
		const input = '<mark>hello</mark> world';
		expect(sanitizeSnippet(input)).toBe('<mark>hello</mark> world');
	});

	it('escapes script tags in snippet text', () => {
		const input = '<script>alert(1)</script> <mark>test</mark>';
		expect(sanitizeSnippet(input)).toBe('&lt;script&gt;alert(1)&lt;/script&gt; <mark>test</mark>');
	});

	it('escapes img onerror XSS', () => {
		const input = '<img src=x onerror=alert(1)> <mark>found</mark>';
		expect(sanitizeSnippet(input)).toBe('&lt;img src=x onerror=alert(1)&gt; <mark>found</mark>');
	});

	it('escapes ampersands and quotes', () => {
		const input = 'Tom &amp; Jerry "quoted" <mark>match</mark>';
		expect(sanitizeSnippet(input)).toBe('Tom &amp;amp; Jerry &quot;quoted&quot; <mark>match</mark>');
	});

	it('handles multiple mark tags', () => {
		const input = '<mark>first</mark> middle <mark>second</mark>';
		expect(sanitizeSnippet(input)).toBe('<mark>first</mark> middle <mark>second</mark>');
	});

	it('handles snippet with only text (no marks)', () => {
		const input = '...plain text snippet...';
		expect(sanitizeSnippet(input)).toBe('...plain text snippet...');
	});

	it('handles empty string', () => {
		expect(sanitizeSnippet('')).toBe('');
	});
});

describe('FTS5 search integration', () => {
	const TEST_DB_PATH = path.resolve('data', 'test-fts5.db');
	const SCHEMA_PATH = path.resolve('src', 'lib', 'db', 'schema.sql');
	let db: Database.Database;

	beforeAll(() => {
		db = new Database(TEST_DB_PATH);
		const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
		db.exec(schema);

		db.prepare(
			`INSERT INTO conversation (uuid, name, summary, created_at, updated_at)
			 VALUES ('conv-1', 'Test Conv', '', '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z')`
		).run();

		const insertMsg = db.prepare(
			`INSERT INTO message (uuid, conversation_uuid, text, content_json, sender, created_at, message_order)
			 VALUES (?, 'conv-1', ?, '[]', ?, '2025-01-01T00:00:00Z', ?)`
		);

		insertMsg.run('msg-1', 'Hello world from the user', 'human', 0);
		insertMsg.run('msg-2', 'Here is a Python function for sorting', 'assistant', 1);
		insertMsg.run('msg-3', '한국어 검색 테스트 메시지입니다', 'human', 2);
		insertMsg.run('msg-4', 'The file config.yaml has settings', 'assistant', 3);
		insertMsg.run('msg-5', 'Special chars: $100 price (20% off)', 'human', 4);
	});

	afterAll(() => {
		db?.close();
		if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
	});

	it('finds multi-word AND matches using buildFts5Query', () => {
		const query = buildFts5Query('Hello world')!;
		expect(query).toBe('"Hello" "world"');
		const results = db
			.prepare(`SELECT * FROM message_fts WHERE message_fts MATCH ?`)
			.all(query);
		expect(results.length).toBeGreaterThan(0);
	});

	it('finds words in any order with AND matching', () => {
		const query = buildFts5Query('sorting Python')!;
		expect(query).toBe('"sorting" "Python"');
		const results = db
			.prepare(`SELECT * FROM message_fts WHERE message_fts MATCH ?`)
			.all(query);
		expect(results.length).toBe(1);
	});

	it('finds single word matches', () => {
		const query = buildFts5Query('Python')!;
		const results = db
			.prepare(`SELECT * FROM message_fts WHERE message_fts MATCH ?`)
			.all(query);
		expect(results.length).toBe(1);
	});

	it('finds Korean text', () => {
		const query = buildFts5Query('검색')!;
		const results = db
			.prepare(`SELECT * FROM message_fts WHERE message_fts MATCH ?`)
			.all(query);
		expect(results.length).toBe(1);
	});

	it('handles queries with special characters safely', () => {
		const query = buildFts5Query('config.yaml')!;
		expect(query).toBe('"config" "yaml"');
		const results = db
			.prepare(`SELECT * FROM message_fts WHERE message_fts MATCH ?`)
			.all(query);
		expect(results.length).toBe(1);
	});

	it('handles all-special-char query without error', () => {
		const query = buildFts5Query('***');
		expect(query).toBeNull();
	});

	it('generates snippets with mark tags', () => {
		const query = buildFts5Query('Python')!;
		const results = db
			.prepare(
				`SELECT snippet(message_fts, 0, '<mark>', '</mark>', '...', 32) as snippet
				 FROM message_fts WHERE message_fts MATCH ?`
			)
			.all(query) as { snippet: string }[];
		expect(results.length).toBe(1);
		expect(results[0].snippet).toContain('<mark>');
		expect(results[0].snippet).toContain('</mark>');
	});

	it('proves raw FTS5 snippets pass through HTML and sanitizeSnippet fixes it', () => {
		db.prepare(
			`INSERT INTO message (uuid, conversation_uuid, text, content_json, sender, created_at, message_order)
			 VALUES ('msg-xss', 'conv-1', 'Check <img src=x onerror=alert(1)> injection test', '[]', 'human', '2025-01-01T00:00:00Z', 5)`
		).run();

		const query = buildFts5Query('injection')!;
		const results = db
			.prepare(
				`SELECT snippet(message_fts, 0, '<mark>', '</mark>', '...', 32) as snippet
				 FROM message_fts WHERE message_fts MATCH ?`
			)
			.all(query) as { snippet: string }[];
		expect(results.length).toBe(1);
		expect(results[0].snippet).toContain('<img');
		const sanitized = sanitizeSnippet(results[0].snippet);
		expect(sanitized).not.toContain('<img');
		expect(sanitized).toContain('&lt;img');
		expect(sanitized).toContain('<mark>injection</mark>');
	});

	it('returns results joined with conversation data', () => {
		const query = buildFts5Query('Hello')!;
		const results = db
			.prepare(
				`SELECT m.uuid, m.sender, c.name as conversation_name
				 FROM message_fts
				 JOIN message m ON m.rowid = message_fts.rowid
				 JOIN conversation c ON c.uuid = m.conversation_uuid
				 WHERE message_fts MATCH ?`
			)
			.all(query) as { uuid: string; sender: string; conversation_name: string }[];
		expect(results.length).toBe(1);
		expect(results[0].uuid).toBe('msg-1');
		expect(results[0].sender).toBe('human');
		expect(results[0].conversation_name).toBe('Test Conv');
	});
});
