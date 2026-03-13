import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const TEMP_DATA_DIR = path.resolve('temp-data');
const DB_PATH = path.resolve('data', 'archive.db');
const SCHEMA_PATH = path.resolve('src', 'lib', 'db', 'schema.sql');

interface ContentBlock {
	type: 'text' | 'tool_use' | 'tool_result';
	text?: string;
	name?: string;
	input?: Record<string, unknown>;
	content?: Array<{ type: string; text: string; uuid?: string }> | string;
	is_error?: boolean;
	[key: string]: unknown;
}

interface ChatMessage {
	uuid: string;
	text: string;
	content: ContentBlock[];
	sender: 'human' | 'assistant';
	created_at: string;
	updated_at: string;
	attachments: unknown[];
	files: unknown[];
}

interface Conversation {
	uuid: string;
	name: string;
	summary: string;
	created_at: string;
	updated_at: string;
	account: { uuid: string };
	chat_messages: ChatMessage[];
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

function initDb(): Database.Database {
	const dir = path.dirname(DB_PATH);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	const db = new Database(DB_PATH);
	db.pragma('journal_mode = WAL');
	db.pragma('foreign_keys = ON');

	const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
	db.exec(schema);

	return db;
}

function findDataDirs(): string[] {
	if (!fs.existsSync(TEMP_DATA_DIR)) {
		console.error(`temp-data/ directory not found at ${TEMP_DATA_DIR}`);
		process.exit(1);
	}

	const entries = fs.readdirSync(TEMP_DATA_DIR, { withFileTypes: true });

	// Extract ZIPs that haven't been extracted yet
	for (const entry of entries) {
		if (entry.isFile() && entry.name.endsWith('.zip')) {
			const zipPath = path.join(TEMP_DATA_DIR, entry.name);
			const dirName = entry.name.replace('.zip', '');
			const dirPath = path.join(TEMP_DATA_DIR, dirName);

			if (!fs.existsSync(dirPath)) {
				console.log(`Extracting ${entry.name}...`);
				fs.mkdirSync(dirPath, { recursive: true });
				execSync(`unzip -o "${zipPath}" -d "${dirPath}"`, { stdio: 'pipe' });
			}
		}
	}

	// Find all data directories
	const refreshed = fs.readdirSync(TEMP_DATA_DIR, { withFileTypes: true });
	return refreshed
		.filter((e) => e.isDirectory() && e.name.startsWith('data-'))
		.map((e) => path.join(TEMP_DATA_DIR, e.name));
}

function hasToolUse(content: ContentBlock[]): boolean {
	return content.some((block) => block.type === 'tool_use');
}

function ingestConversations(db: Database.Database, filePath: string): { conversations: number; messages: number } {
	const raw = fs.readFileSync(filePath, 'utf-8');
	const conversations: Conversation[] = JSON.parse(raw);
	const total = conversations.length;

	const insertConv = db.prepare(`
		INSERT OR REPLACE INTO conversation (uuid, name, summary, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)
	`);

	const insertMsg = db.prepare(`
		INSERT OR REPLACE INTO message (uuid, conversation_uuid, text, content_json, sender, created_at, message_order, has_tool_use, attachments_json, files_json)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`);

	let convCount = 0;
	let msgCount = 0;

	const ingestAll = db.transaction(() => {
		for (const conv of conversations) {
			try {
				insertConv.run(
					conv.uuid,
					conv.name || '',
					conv.summary || '',
					conv.created_at,
					conv.updated_at
				);
				convCount++;

				if (convCount % 100 === 0 || convCount === total) {
					process.stdout.write(`\r  Processing conversations: ${convCount}/${total}`);
				}

				if (!conv.chat_messages) continue;

				for (let i = 0; i < conv.chat_messages.length; i++) {
					const msg = conv.chat_messages[i];
					try {
						insertMsg.run(
							msg.uuid,
							conv.uuid,
							msg.text || '',
							JSON.stringify(msg.content || []),
							msg.sender,
							msg.created_at,
							i,
							hasToolUse(msg.content || []) ? 1 : 0,
							JSON.stringify(msg.attachments || []),
							JSON.stringify(msg.files || [])
						);
						msgCount++;
					} catch (err) {
						console.error(`  Skipping message ${msg.uuid}: ${(err as Error).message}`);
					}
				}
			} catch (err) {
				console.error(`  Skipping conversation ${conv.uuid}: ${(err as Error).message}`);
			}
		}
	});

	ingestAll();
	if (total > 0) console.log();
	return { conversations: convCount, messages: msgCount };
}

function ingestProjects(db: Database.Database, filePath: string): number {
	const raw = fs.readFileSync(filePath, 'utf-8');
	const projects: Project[] = JSON.parse(raw);

	const insertProject = db.prepare(`
		INSERT OR REPLACE INTO project (uuid, name, description, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)
	`);

	const insertDoc = db.prepare(`
		INSERT OR REPLACE INTO project_doc (uuid, project_uuid, filename, content, created_at)
		VALUES (?, ?, ?, ?, ?)
	`);

	let count = 0;

	const ingestAll = db.transaction(() => {
		for (const proj of projects) {
			try {
				insertProject.run(
					proj.uuid,
					proj.name,
					proj.description || '',
					proj.created_at,
					proj.updated_at
				);
				count++;

				if (proj.docs) {
					for (const doc of proj.docs) {
						try {
							insertDoc.run(
								doc.uuid,
								proj.uuid,
								doc.filename,
								doc.content || '',
								doc.created_at
							);
						} catch (err) {
							console.error(`  Skipping doc ${doc.uuid}: ${(err as Error).message}`);
						}
					}
				}
			} catch (err) {
				console.error(`  Skipping project ${proj.uuid}: ${(err as Error).message}`);
			}
		}
	});

	ingestAll();
	return count;
}

function main() {
	console.log('Claude Archive Ingestion');
	console.log('========================');

	const db = initDb();

	const insertLog = db.prepare(`
		INSERT OR IGNORE INTO ingest_log (filename, ingested_at, conversation_count, message_count)
		VALUES (?, ?, ?, ?)
	`);

	const checkLog = db.prepare(`SELECT 1 FROM ingest_log WHERE filename = ?`);

	const dataDirs = findDataDirs();
	console.log(`Found ${dataDirs.length} data director${dataDirs.length === 1 ? 'y' : 'ies'}`);

	for (const dir of dataDirs) {
		const dirName = path.basename(dir);

		if (checkLog.get(dirName)) {
			console.log(`\nSkipping ${dirName} (already ingested)`);
			continue;
		}

		console.log(`\nProcessing ${dirName}...`);

		const conversationsFile = path.join(dir, 'conversations.json');
		const projectsFile = path.join(dir, 'projects.json');

		let convCount = 0;
		let msgCount = 0;
		let projCount = 0;

		if (fs.existsSync(conversationsFile)) {
			try {
				const result = ingestConversations(db, conversationsFile);
				convCount = result.conversations;
				msgCount = result.messages;
				console.log(`  Conversations: ${convCount}, Messages: ${msgCount}`);
			} catch (err) {
				console.error(`  Failed to parse ${conversationsFile}: ${(err as Error).message}`);
			}
		} else {
			console.log('  No conversations.json found');
		}

		if (fs.existsSync(projectsFile)) {
			try {
				projCount = ingestProjects(db, projectsFile);
				console.log(`  Projects: ${projCount}`);
			} catch (err) {
				console.error(`  Failed to parse ${projectsFile}: ${(err as Error).message}`);
			}
		} else {
			console.log('  No projects.json found');
		}

		insertLog.run(dirName, new Date().toISOString(), convCount, msgCount);
	}

	const totalConv = (db.prepare('SELECT COUNT(*) as count FROM conversation').get() as { count: number }).count;
	const totalMsg = (db.prepare('SELECT COUNT(*) as count FROM message').get() as { count: number }).count;
	const totalProj = (db.prepare('SELECT COUNT(*) as count FROM project').get() as { count: number }).count;

	console.log('\n========================');
	console.log(`Total: ${totalConv} conversations, ${totalMsg} messages, ${totalProj} projects`);

	db.close();
}

main();
