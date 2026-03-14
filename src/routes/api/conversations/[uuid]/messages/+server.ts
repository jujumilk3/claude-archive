import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getConversationByUuid, getMessagesByConversation } from '$lib/db/queries';

export const GET: RequestHandler = ({ params }) => {
	try {
		const conversation = getConversationByUuid(params.uuid);

		if (!conversation) {
			error(404, 'Conversation not found');
		}

		const messages = getMessagesByConversation(params.uuid);

		return json({
			conversation,
			messages
		});
	} catch (e) {
		if (typeof e === 'object' && e !== null && 'status' in e) throw e;
		console.error('Failed to fetch messages:', e);
		error(500, 'Internal server error');
	}
};
