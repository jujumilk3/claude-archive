import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getConversationByUuid, getMessagesByConversation } from '$lib/db/queries';

export const load: PageServerLoad = ({ params }) => {
	const conversation = getConversationByUuid(params.uuid);

	if (!conversation) {
		error(404, '대화를 찾을 수 없습니다');
	}

	const messages = getMessagesByConversation(params.uuid);

	return { conversation, messages };
};
