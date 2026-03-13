import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/db';

export const GET: RequestHandler = ({ params }) => {
	const db = getDb();

	const project = db
		.prepare('SELECT uuid, name, description, created_at, updated_at FROM project WHERE uuid = ?')
		.get(params.uuid);

	if (!project) {
		error(404, 'Project not found');
	}

	const docs = db
		.prepare(
			`SELECT uuid, filename, content, created_at
			 FROM project_doc
			 WHERE project_uuid = ?
			 ORDER BY created_at`
		)
		.all(params.uuid);

	return json({ project, docs });
};
