import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getProjectList } from '$lib/db/queries';

export const load: PageServerLoad = () => {
	try {
		const projects = getProjectList();
		return { projects };
	} catch (e) {
		if (typeof e === 'object' && e !== null && 'status' in e) throw e;
		console.error('Failed to load projects:', e);
		error(500, 'Failed to load projects');
	}
};
