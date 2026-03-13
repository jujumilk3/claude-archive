import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getConversationCount, getConversationList } from '$lib/db/queries';

export const GET: RequestHandler = ({ url }) => {
	const offset = parseInt(url.searchParams.get('offset') || '0', 10);
	const limit = parseInt(url.searchParams.get('limit') || '50', 10);

	const total = getConversationCount();
	const conversations = getConversationList(offset, limit);

	return json({
		conversations,
		total,
		hasMore: offset + limit < total
	});
};
