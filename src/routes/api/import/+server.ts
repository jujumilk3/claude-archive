import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { detectFormat, ingestClaudeConversations, ingestOpenAIConversations, ingestProjectsJson } from '$lib/db/ingest';

export const POST: RequestHandler = async ({ request }) => {
	const formData = await request.formData();
	const conversationsFile = formData.get('conversations') as File | null;
	const projectsFile = formData.get('projects') as File | null;

	if (!conversationsFile && !projectsFile) {
		return json({ error: 'No files provided' }, { status: 400 });
	}

	const result = { conversations: 0, messages: 0, projects: 0, source: '' };

	if (conversationsFile) {
		const text = await conversationsFile.text();
		const format = detectFormat(text);

		if (format === 'openai') {
			const r = ingestOpenAIConversations(text);
			result.conversations = r.conversations;
			result.messages = r.messages;
			result.source = 'openai';
		} else {
			const r = ingestClaudeConversations(text);
			result.conversations = r.conversations;
			result.messages = r.messages;
			result.source = 'claude';
		}
	}

	if (projectsFile) {
		const text = await projectsFile.text();
		result.projects = ingestProjectsJson(text);
	}

	return json(result);
};
