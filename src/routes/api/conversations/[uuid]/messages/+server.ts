import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getConversationByUuid, getMessagesByConversation } from '$lib/db/queries';

export const GET: RequestHandler = ({ params }) => {
	const conversation = getConversationByUuid(params.uuid);

	if (!conversation) {
		error(404, 'Conversation not found');
	}

	const messages = getMessagesByConversation(params.uuid);

	return json({
		conversation,
		messages
	});
};
