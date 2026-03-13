import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getConversationCount, getConversationList } from '$lib/db/queries';

export const GET: RequestHandler = ({ url }) => {
	const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);
	const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10) || 50));

	try {
		const total = getConversationCount();
		const conversations = getConversationList(offset, limit);

		return json({
			conversations,
			total,
			hasMore: offset + limit < total
		});
	} catch (e) {
		console.error('Failed to fetch conversations:', e);
		error(500, 'Internal server error');
	}
};
