import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProjectByUuid, getProjectDocs } from '$lib/db/queries';

export const GET: RequestHandler = ({ params }) => {
	const project = getProjectByUuid(params.uuid);

	if (!project) {
		error(404, 'Project not found');
	}

	const docs = getProjectDocs(params.uuid);

	return json({ project, docs });
};
