import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getConversationCount, getConversationList } from '$lib/db/queries';

export const load: LayoutServerLoad = () => {
	try {
		const total = getConversationCount();
		const conversations = getConversationList(0, 50);

		return {
			initialConversations: conversations,
			totalConversations: total,
			hasMoreConversations: total > conversations.length
		};
	} catch (e) {
		console.error('Failed to load conversations:', e);
		error(500, 'Failed to load conversations');
	}
};
