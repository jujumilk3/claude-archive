import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = path.resolve('data', 'archive.db');
const SCHEMA_PATH = path.resolve('src', 'lib', 'db', 'schema.sql');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
	if (_db) return _db;

	const dir = path.dirname(DB_PATH);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	_db = new Database(DB_PATH);
	_db.pragma('journal_mode = WAL');
	_db.pragma('foreign_keys = ON');

	const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
	_db.exec(schema);

	// Migration: add source column if missing
	const cols = _db.prepare("PRAGMA table_info(conversation)").all() as Array<{ name: string }>;
	if (!cols.some((c) => c.name === 'source')) {
		_db.exec("ALTER TABLE conversation ADD COLUMN source TEXT NOT NULL DEFAULT 'claude'");
	}

	return _db;
}

export function closeDb(): void {
	if (_db) {
		_db.close();
		_db = null;
	}
}
