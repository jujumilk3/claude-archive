import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getConversationList, getMessagesByConversation, getConversationByUuid } from '$lib/db/queries';
import { exportConversationToMarkdown } from '$lib/export';

export const GET: RequestHandler = async ({ url }) => {
	const loc = (url.searchParams.get('lang') as 'ko' | 'en') || 'en';

	try {
		const conversations = getConversationList(0, 100000);
		const parts: string[] = [];

		for (const conv of conversations) {
			const detail = getConversationByUuid(conv.uuid);
			if (!detail) continue;
			const messages = getMessagesByConversation(conv.uuid);
			const md = exportConversationToMarkdown(detail, messages, loc);
			parts.push(md);
		}

		const combined = parts.join('\n\n---\n\n');

		return new Response(combined, {
			headers: {
				'Content-Type': 'text/markdown; charset=utf-8',
				'Content-Disposition': 'attachment; filename="claude-archive-export.md"'
			}
		});
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		throw error(500, 'Export failed');
	}
};
