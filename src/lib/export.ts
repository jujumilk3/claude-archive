import type { ConversationDetail, Message } from '$lib/db/queries';
import { getTranslation, formatTimestamp, senderLabel } from '$lib/i18n';
import type { Locale } from '$lib/i18n';

interface ContentBlock {
	type: string;
	text?: string;
	name?: string;
	input?: Record<string, unknown>;
	content?: Array<{ type: string; text: string }> | string;
	is_error?: boolean;
	thinking?: string;
}

function getToolResultText(block: ContentBlock): string {
	if (typeof block.content === 'string') return block.content;
	if (Array.isArray(block.content)) {
		return block.content.map((c) => c.text || '').join('\n');
	}
	return '';
}

function renderContentBlock(block: ContentBlock): string {
	if (block.type === 'text' && block.text) {
		return block.text;
	}

	if (block.type === 'thinking') {
		const text = block.thinking || block.text || '';
		return `<details>\n<summary>💭 Thinking</summary>\n\n${text}\n\n</details>`;
	}

	if (block.type === 'tool_use') {
		const input = block.input ? JSON.stringify(block.input, null, 2) : '{}';
		return `<details>\n<summary>🔧 ${block.name || 'tool'}</summary>\n\n\`\`\`json\n${input}\n\`\`\`\n\n</details>`;
	}

	if (block.type === 'tool_result') {
		const text = getToolResultText(block);
		const errorTag = block.is_error ? ' (error)' : '';
		const nameTag = block.name ? `: ${block.name}` : '';
		return `<details>\n<summary>📋 Result${errorTag}${nameTag}</summary>\n\n\`\`\`\n${text}\n\`\`\`\n\n</details>`;
	}

	return `<details>\n<summary>📦 ${block.type}${block.name ? `: ${block.name}` : ''}</summary>\n\n\`\`\`json\n${JSON.stringify(block, null, 2)}\n\`\`\`\n\n</details>`;
}

function parseAttachments(json: string): Array<{ file_name: string; file_size?: number; extracted_content?: string }> {
	try {
		const parsed = JSON.parse(json);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function parseFiles(json: string): Array<{ file_name: string }> {
	try {
		const parsed = JSON.parse(json);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function renderMessage(msg: Message, loc: Locale): string {
	const parts: string[] = [];

	parts.push(`### ${senderLabel(msg.sender, loc)} — ${formatTimestamp(msg.created_at, loc)}`);
	parts.push('');

	const attachments = parseAttachments(msg.attachments_json);
	if (attachments.length > 0) {
		for (const att of attachments) {
			parts.push(`📎 **${att.file_name}**${att.file_size ? ` (${att.file_size} bytes)` : ''}`);
			if (att.extracted_content) {
				parts.push('');
				parts.push('```');
				parts.push(att.extracted_content);
				parts.push('```');
			}
			parts.push('');
		}
	}

	const files = parseFiles(msg.files_json);
	if (files.length > 0) {
		parts.push(files.map((f) => `📄 ${f.file_name}`).join(' · '));
		parts.push('');
	}

	let contentBlocks: ContentBlock[];
	try {
		const parsed = JSON.parse(msg.content_json);
		contentBlocks = Array.isArray(parsed) && parsed.length > 0 ? parsed : [{ type: 'text', text: msg.text }];
	} catch {
		contentBlocks = [{ type: 'text', text: msg.text }];
	}

	for (const block of contentBlocks) {
		const rendered = renderContentBlock(block);
		if (rendered) {
			parts.push(rendered);
			parts.push('');
		}
	}

	return parts.join('\n');
}

export function exportConversationToMarkdown(conversation: ConversationDetail, messages: Message[], loc: Locale = 'ko'): string {
	const parts: string[] = [];

	parts.push(`# ${conversation.name || getTranslation('common.noTitle', loc)}`);
	parts.push('');

	if (conversation.summary) {
		parts.push(`> ${conversation.summary}`);
		parts.push('');
	}

	parts.push(`- **${getTranslation('export.createdAt', loc)}**: ${formatTimestamp(conversation.created_at, loc)}`);
	parts.push(`- **${getTranslation('export.updatedAt', loc)}**: ${formatTimestamp(conversation.updated_at, loc)}`);
	parts.push('');
	parts.push('---');
	parts.push('');

	for (const msg of messages) {
		parts.push(renderMessage(msg, loc));
	}

	return parts.join('\n').trimEnd() + '\n';
}

export function downloadMarkdown(filename: string, content: string): void {
	const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

export function conversationFilename(name: string | undefined, uuid: string): string {
	const base = name?.trim()
		? name.trim().replace(/[/\\?%*:|"<>]/g, '_').substring(0, 100)
		: uuid.substring(0, 8);
	return `${base}.md`;
}
