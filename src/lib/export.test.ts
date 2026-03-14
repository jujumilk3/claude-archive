import { describe, it, expect } from 'vitest';
import { exportConversationToMarkdown, conversationFilename } from './export';
import type { ConversationDetail, Message } from '$lib/db/queries';

function makeConversation(overrides: Partial<ConversationDetail> = {}): ConversationDetail {
	return {
		uuid: 'conv-1234',
		name: 'Test Conversation',
		summary: '',
		created_at: '2024-06-15T10:30:00Z',
		updated_at: '2024-06-15T11:00:00Z',
		...overrides
	};
}

function makeMessage(overrides: Partial<Message> = {}): Message {
	return {
		uuid: 'msg-1',
		text: 'Hello world',
		content_json: JSON.stringify([{ type: 'text', text: 'Hello world' }]),
		sender: 'human',
		created_at: '2024-06-15T10:30:00Z',
		message_order: 0,
		has_tool_use: 0,
		attachments_json: '[]',
		files_json: '[]',
		...overrides
	};
}

describe('exportConversationToMarkdown', () => {
	it('renders conversation title and metadata', () => {
		const md = exportConversationToMarkdown(makeConversation(), []);
		expect(md).toContain('# Test Conversation');
		expect(md).toContain('**생성일**');
		expect(md).toContain('**수정일**');
		expect(md).toContain('---');
	});

	it('renders untitled conversation fallback', () => {
		const md = exportConversationToMarkdown(makeConversation({ name: '' }), []);
		expect(md).toContain('# (제목 없음)');
	});

	it('renders summary as blockquote', () => {
		const md = exportConversationToMarkdown(
			makeConversation({ summary: 'A deep discussion about TypeScript' }),
			[]
		);
		expect(md).toContain('> A deep discussion about TypeScript');
	});

	it('omits summary blockquote when empty', () => {
		const md = exportConversationToMarkdown(makeConversation({ summary: '' }), []);
		expect(md).not.toContain('> ');
	});

	it('renders human message with sender label', () => {
		const md = exportConversationToMarkdown(makeConversation(), [
			makeMessage({
				sender: 'human',
				text: 'Hi there',
				content_json: JSON.stringify([{ type: 'text', text: 'Hi there' }])
			})
		]);
		expect(md).toContain('### 나 —');
		expect(md).toContain('Hi there');
	});

	it('renders assistant message with sender label', () => {
		const md = exportConversationToMarkdown(makeConversation(), [
			makeMessage({
				sender: 'assistant',
				text: 'Hello!',
				content_json: JSON.stringify([{ type: 'text', text: 'Hello!' }])
			})
		]);
		expect(md).toContain('### Claude —');
		expect(md).toContain('Hello!');
	});

	it('renders text content blocks', () => {
		const md = exportConversationToMarkdown(makeConversation(), [
			makeMessage({
				content_json: JSON.stringify([
					{ type: 'text', text: 'First paragraph' },
					{ type: 'text', text: 'Second paragraph' }
				])
			})
		]);
		expect(md).toContain('First paragraph');
		expect(md).toContain('Second paragraph');
	});

	it('renders thinking blocks as collapsible details', () => {
		const md = exportConversationToMarkdown(makeConversation(), [
			makeMessage({
				content_json: JSON.stringify([
					{ type: 'thinking', thinking: 'Let me consider...' }
				])
			})
		]);
		expect(md).toContain('<details>');
		expect(md).toContain('💭 Thinking');
		expect(md).toContain('Let me consider...');
		expect(md).toContain('</details>');
	});

	it('renders thinking block with text field fallback', () => {
		const md = exportConversationToMarkdown(makeConversation(), [
			makeMessage({
				content_json: JSON.stringify([
					{ type: 'thinking', text: 'Fallback thinking' }
				])
			})
		]);
		expect(md).toContain('Fallback thinking');
	});

	it('renders tool_use blocks with JSON input', () => {
		const md = exportConversationToMarkdown(makeConversation(), [
			makeMessage({
				content_json: JSON.stringify([
					{ type: 'tool_use', name: 'search', input: { query: 'test' } }
				])
			})
		]);
		expect(md).toContain('🔧 search');
		expect(md).toContain('"query": "test"');
		expect(md).toContain('```json');
	});

	it('renders tool_result blocks', () => {
		const md = exportConversationToMarkdown(makeConversation(), [
			makeMessage({
				content_json: JSON.stringify([
					{ type: 'tool_result', content: 'Found 3 results' }
				])
			})
		]);
		expect(md).toContain('📋 Result');
		expect(md).toContain('Found 3 results');
	});

	it('renders tool_result with error flag', () => {
		const md = exportConversationToMarkdown(makeConversation(), [
			makeMessage({
				content_json: JSON.stringify([
					{ type: 'tool_result', is_error: true, content: 'Not found' }
				])
			})
		]);
		expect(md).toContain('📋 Result (error)');
	});

	it('renders tool_result with array content', () => {
		const md = exportConversationToMarkdown(makeConversation(), [
			makeMessage({
				content_json: JSON.stringify([
					{ type: 'tool_result', content: [{ type: 'text', text: 'Line 1' }, { type: 'text', text: 'Line 2' }] }
				])
			})
		]);
		expect(md).toContain('Line 1\nLine 2');
	});

	it('renders unknown content types as JSON', () => {
		const md = exportConversationToMarkdown(makeConversation(), [
			makeMessage({
				content_json: JSON.stringify([
					{ type: 'custom_block', data: 'something' }
				])
			})
		]);
		expect(md).toContain('📦 custom_block');
		expect(md).toContain('"data": "something"');
	});

	it('falls back to text field on invalid content_json', () => {
		const md = exportConversationToMarkdown(makeConversation(), [
			makeMessage({ content_json: 'invalid json', text: 'Fallback text' })
		]);
		expect(md).toContain('Fallback text');
	});

	it('renders attachments with file info', () => {
		const md = exportConversationToMarkdown(makeConversation(), [
			makeMessage({
				attachments_json: JSON.stringify([
					{ file_name: 'doc.pdf', file_size: 1024, extracted_content: 'PDF content here' }
				])
			})
		]);
		expect(md).toContain('📎 **doc.pdf**');
		expect(md).toContain('1024 bytes');
		expect(md).toContain('PDF content here');
	});

	it('renders files list', () => {
		const md = exportConversationToMarkdown(makeConversation(), [
			makeMessage({
				files_json: JSON.stringify([
					{ file_name: 'main.ts' },
					{ file_name: 'utils.ts' }
				])
			})
		]);
		expect(md).toContain('📄 main.ts');
		expect(md).toContain('📄 utils.ts');
	});

	it('renders multiple messages in order', () => {
		const md = exportConversationToMarkdown(makeConversation(), [
			makeMessage({
				sender: 'human',
				text: 'Question',
				content_json: JSON.stringify([{ type: 'text', text: 'Question' }]),
				message_order: 0
			}),
			makeMessage({
				sender: 'assistant',
				text: 'Answer',
				content_json: JSON.stringify([{ type: 'text', text: 'Answer' }]),
				message_order: 1,
				uuid: 'msg-2'
			})
		]);
		const questionIdx = md.indexOf('Question');
		const answerIdx = md.indexOf('Answer');
		expect(questionIdx).toBeLessThan(answerIdx);
	});

	it('ends with a newline', () => {
		const md = exportConversationToMarkdown(makeConversation(), [makeMessage()]);
		expect(md.endsWith('\n')).toBe(true);
		expect(md.endsWith('\n\n')).toBe(false);
	});

	it('renders English locale labels when locale is en', () => {
		const md = exportConversationToMarkdown(makeConversation(), [
			makeMessage({ sender: 'human', text: 'Hi', content_json: JSON.stringify([{ type: 'text', text: 'Hi' }]) }),
			makeMessage({ sender: 'assistant', text: 'Hello!', content_json: JSON.stringify([{ type: 'text', text: 'Hello!' }]), uuid: 'msg-2' })
		], 'en');
		expect(md).toContain('### Me —');
		expect(md).toContain('### Claude —');
		expect(md).toContain('**Created**');
		expect(md).toContain('**Updated**');
	});

	it('renders untitled fallback in English locale', () => {
		const md = exportConversationToMarkdown(makeConversation({ name: '' }), [], 'en');
		expect(md).toContain('# (Untitled)');
	});
});

describe('conversationFilename', () => {
	it('uses conversation name as filename', () => {
		expect(conversationFilename('My Chat', 'abc-123')).toBe('My Chat.md');
	});

	it('falls back to uuid prefix when name is empty', () => {
		expect(conversationFilename('', 'abcdefgh-1234')).toBe('abcdefgh.md');
	});

	it('falls back to uuid prefix when name is undefined', () => {
		expect(conversationFilename(undefined, 'abcdefgh-1234')).toBe('abcdefgh.md');
	});

	it('sanitizes special characters in filename', () => {
		expect(conversationFilename('What/is "this"?', 'abc')).toBe('What_is _this__.md');
	});

	it('truncates long names to 100 characters', () => {
		const longName = 'A'.repeat(150);
		const filename = conversationFilename(longName, 'abc');
		expect(filename).toBe('A'.repeat(100) + '.md');
	});
});
