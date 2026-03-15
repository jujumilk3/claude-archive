import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/db';

export const POST: RequestHandler = async () => {
	const db = getDb();

	db.transaction(() => {
		db.exec("DELETE FROM message");
		db.exec("DELETE FROM conversation");
		db.exec("DELETE FROM project_doc");
		db.exec("DELETE FROM project");
		db.exec("DELETE FROM ingest_log");
		db.exec("INSERT INTO message_fts(message_fts) VALUES('rebuild')");
	})();

	return json({ success: true });
};
