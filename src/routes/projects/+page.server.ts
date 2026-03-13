import type { PageServerLoad } from './$types';
import { getProjectList } from '$lib/db/queries';

export const load: PageServerLoad = () => {
	const projects = getProjectList();
	return { projects };
};
