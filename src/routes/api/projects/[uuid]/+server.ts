import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProjectByUuid, getProjectDocs } from '$lib/db/queries';

export const GET: RequestHandler = ({ params }) => {
	try {
		const project = getProjectByUuid(params.uuid);

		if (!project) {
			error(404, 'Project not found');
		}

		const docs = getProjectDocs(params.uuid);

		return json({ project, docs });
	} catch (e) {
		if (typeof e === 'object' && e !== null && 'status' in e) throw e;
		console.error('Failed to fetch project:', e);
		error(500, 'Internal server error');
	}
};
