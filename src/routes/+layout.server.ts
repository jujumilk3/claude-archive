import type { LayoutServerLoad } from './$types';
import { getConversationCount, getConversationList } from '$lib/db/queries';

export const load: LayoutServerLoad = () => {
	const total = getConversationCount();
	const conversations = getConversationList(0, 50);

	return {
		initialConversations: conversations,
		totalConversations: total,
		hasMoreConversations: total > 50
	};
};
