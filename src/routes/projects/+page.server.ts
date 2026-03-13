import { getDb } from '$lib/db';
import type { PageServerLoad } from './$types';

interface Project {
	uuid: string;
	name: string;
	description: string;
	created_at: string;
	updated_at: string;
	doc_count: number;
}

export const load: PageServerLoad = () => {
	const db = getDb();

	const projects = db
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

	return { projects };
};
