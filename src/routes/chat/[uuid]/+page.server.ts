import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getConversationByUuid, getMessagesByConversation } from '$lib/db/queries';

export const load: PageServerLoad = ({ params }) => {
	try {
		const conversation = getConversationByUuid(params.uuid);

		if (!conversation) {
			error(404, '대화를 찾을 수 없습니다');
		}

		const messages = getMessagesByConversation(params.uuid);

		return { conversation, messages };
	} catch (e) {
		if (typeof e === 'object' && e !== null && 'status' in e) throw e;
		console.error('Failed to load chat:', e);
		error(500, 'Failed to load chat');
	}
};
