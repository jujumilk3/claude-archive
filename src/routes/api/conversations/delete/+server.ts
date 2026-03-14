import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/db';

export const POST: RequestHandler = async ({ request }) => {
	const { uuids } = await request.json() as { uuids: string[] };

	if (!Array.isArray(uuids) || uuids.length === 0) {
		return json({ error: 'No uuids provided' }, { status: 400 });
	}

	const db = getDb();
	const placeholders = uuids.map(() => '?').join(',');

	const run = db.transaction(() => {
		db.prepare(`DELETE FROM message WHERE conversation_uuid IN (${placeholders})`).run(...uuids);
		db.prepare(`DELETE FROM conversation WHERE uuid IN (${placeholders})`).run(...uuids);
	});

	run();

	return json({ deleted: uuids.length });
};
