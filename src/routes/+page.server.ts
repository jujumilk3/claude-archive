import type { PageServerLoad } from './$types';
import { getArchiveStats } from '$lib/db/queries';

export const load: PageServerLoad = () => {
	try {
		const stats = getArchiveStats();
		return { stats };
	} catch (e) {
		if (typeof e === 'object' && e !== null && 'status' in e) throw e;
		console.error('Failed to load archive stats:', e);
		return { stats: null };
	}
};
