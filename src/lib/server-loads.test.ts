import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/queries', () => ({
	getConversationListWithCount: vi.fn(),
	getConversationByUuid: vi.fn(),
	getMessagesByConversation: vi.fn(),
	getProjectList: vi.fn(),
	getArchiveStats: vi.fn()
}));

vi.mock('@sveltejs/kit', () => ({
	error: (status: number, message: string) => {
		const err = new Error(message) as Error & { status: number; body: { message: string } };
		err.status = status;
		err.body = { message };
		throw err;
	}
}));

describe('layout server load', () => {
	let load: (event?: unknown) => unknown;
	let mockListWithCount: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.resetModules();

		const queries = await import('$lib/db/queries');
		mockListWithCount = queries.getConversationListWithCount as ReturnType<typeof vi.fn>;

		mockListWithCount.mockReturnValue({
			conversations: Array.from({ length: 50 }, (_, i) => ({
				uuid: `c${i}`, name: `Conv ${i}`, summary: '', created_at: '', updated_at: '', first_message_preview: null
			})),
			total: 200
		});

		const mod = await import('../routes/+layout.server');
		load = mod.load as unknown as (event?: unknown) => unknown;
	});

	it('returns initial conversations with hasMore=true when more exist', () => {
		const result = load() as { initialConversations: unknown[]; totalConversations: number; hasMoreConversations: boolean };

		expect(mockListWithCount).toHaveBeenCalledWith(0, 50);
		expect(result.initialConversations).toHaveLength(50);
		expect(result.totalConversations).toBe(200);
		expect(result.hasMoreConversations).toBe(true);
	});

	it('returns hasMore=false when all conversations fit in first page', () => {
		mockListWithCount.mockReturnValue({
			conversations: [{ uuid: 'c1', name: 'Only one' }],
			total: 1
		});

		const result = load() as { hasMoreConversations: boolean };
		expect(result.hasMoreConversations).toBe(false);
	});

	it('returns hasMore=false when exactly 50 conversations exist', () => {
		const convs = Array.from({ length: 50 }, (_, i) => ({ uuid: `c${i}` }));
		mockListWithCount.mockReturnValue({ conversations: convs, total: 50 });

		const result = load() as { hasMoreConversations: boolean };
		expect(result.hasMoreConversations).toBe(false);
	});

	it('throws 500 on database error', () => {
		mockListWithCount.mockImplementation(() => { throw new Error('DB down'); });

		try {
			load();
			expect.fail('should have thrown');
		} catch (e: unknown) {
			const err = e as { status: number };
			expect(err.status).toBe(500);
		}
	});

	it('re-throws HttpError without wrapping', () => {
		const httpError = new Error('Service unavailable') as Error & { status: number };
		httpError.status = 503;
		mockListWithCount.mockImplementation(() => { throw httpError; });

		try {
			load();
			expect.fail('should have thrown');
		} catch (e: unknown) {
			const err = e as { status: number; message: string };
			expect(err.status).toBe(503);
			expect(err.message).toBe('Service unavailable');
		}
	});
});

describe('home page server load', () => {
	let load: (event?: unknown) => unknown;
	let mockStats: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.resetModules();

		const queries = await import('$lib/db/queries');
		mockStats = queries.getArchiveStats as ReturnType<typeof vi.fn>;

		mockStats.mockReturnValue({
			total_conversations: 150,
			total_messages: 5000,
			total_projects: 10,
			oldest_date: '2024-01-01',
			newest_date: '2025-03-01'
		});

		const mod = await import('../routes/+page.server');
		load = mod.load as unknown as (event?: unknown) => unknown;
	});

	it('returns stats on success', () => {
		const result = load() as { stats: { total_conversations: number } };

		expect(result.stats).toBeDefined();
		expect(result.stats.total_conversations).toBe(150);
	});

	it('returns null stats on error (graceful fallback)', () => {
		mockStats.mockImplementation(() => { throw new Error('DB error'); });

		const result = load() as { stats: null };
		expect(result.stats).toBeNull();
	});

	it('re-throws HttpError without wrapping', () => {
		const httpError = new Error('Service unavailable') as Error & { status: number };
		httpError.status = 503;
		mockStats.mockImplementation(() => { throw httpError; });

		try {
			load();
			expect.fail('should have thrown');
		} catch (e: unknown) {
			const err = e as { status: number };
			expect(err.status).toBe(503);
		}
	});
});

describe('chat page server load', () => {
	let load: (event: { params: { uuid: string } }) => unknown;
	let mockConv: ReturnType<typeof vi.fn>;
	let mockMsgs: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.resetModules();
		vi.clearAllMocks();

		const queries = await import('$lib/db/queries');
		mockConv = queries.getConversationByUuid as ReturnType<typeof vi.fn>;
		mockMsgs = queries.getMessagesByConversation as ReturnType<typeof vi.fn>;

		mockConv.mockReturnValue({ uuid: 'c1', name: 'Test Chat', summary: 'A summary', created_at: '2025-01-01', updated_at: '2025-01-02' });
		mockMsgs.mockReturnValue([
			{ uuid: 'm1', text: 'Hello', sender: 'human', message_order: 0 },
			{ uuid: 'm2', text: 'Hi there', sender: 'assistant', message_order: 1 }
		]);

		const mod = await import('../routes/chat/[uuid]/+page.server');
		load = mod.load as unknown as (event: { params: { uuid: string } }) => unknown;
	});

	it('returns conversation and messages', () => {
		const result = load({ params: { uuid: 'c1' } }) as { conversation: { uuid: string }; messages: unknown[] };

		expect(result.conversation.uuid).toBe('c1');
		expect(result.messages).toHaveLength(2);
	});

	it('throws 404 for nonexistent conversation', () => {
		mockConv.mockReturnValue(undefined);

		try {
			load({ params: { uuid: 'nonexistent' } });
			expect.fail('should have thrown');
		} catch (e: unknown) {
			const err = e as { status: number };
			expect(err.status).toBe(404);
		}
	});

	it('does not fetch messages when conversation not found', () => {
		mockConv.mockReturnValue(undefined);

		try { load({ params: { uuid: 'missing' } }); } catch { /* expected */ }
		expect(mockMsgs).not.toHaveBeenCalled();
	});

	it('throws 500 on database error', () => {
		mockConv.mockImplementation(() => { throw new Error('DB error'); });

		try {
			load({ params: { uuid: 'c1' } });
			expect.fail('should have thrown');
		} catch (e: unknown) {
			const err = e as { status: number };
			expect(err.status).toBe(500);
		}
	});

	it('re-throws HttpError without wrapping', () => {
		const httpError = new Error('Not found') as Error & { status: number };
		httpError.status = 404;
		mockConv.mockReturnValue(undefined);

		try {
			load({ params: { uuid: 'missing' } });
			expect.fail('should have thrown');
		} catch (e: unknown) {
			const err = e as { status: number };
			expect(err.status).toBe(404);
		}
	});

	it('re-throws HttpError from getMessagesByConversation', () => {
		const httpError = new Error('Internal') as Error & { status: number };
		httpError.status = 503;
		mockMsgs.mockImplementation(() => { throw httpError; });

		try {
			load({ params: { uuid: 'c1' } });
			expect.fail('should have thrown');
		} catch (e: unknown) {
			const err = e as { status: number };
			expect(err.status).toBe(503);
		}
	});
});

describe('projects page server load', () => {
	let load: (event?: unknown) => unknown;
	let mockProjectList: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.resetModules();

		const queries = await import('$lib/db/queries');
		mockProjectList = queries.getProjectList as ReturnType<typeof vi.fn>;

		mockProjectList.mockReturnValue([
			{ uuid: 'p1', name: 'Project 1', description: 'Desc', doc_count: 3, created_at: '', updated_at: '' },
			{ uuid: 'p2', name: 'Project 2', description: null, doc_count: 0, created_at: '', updated_at: '' }
		]);

		const mod = await import('../routes/projects/+page.server');
		load = mod.load as unknown as (event?: unknown) => unknown;
	});

	it('returns project list', () => {
		const result = load() as { projects: unknown[] };

		expect(result.projects).toHaveLength(2);
	});

	it('throws 500 on database error', () => {
		mockProjectList.mockImplementation(() => { throw new Error('DB error'); });

		try {
			load();
			expect.fail('should have thrown');
		} catch (e: unknown) {
			const err = e as { status: number };
			expect(err.status).toBe(500);
		}
	});

	it('re-throws HttpError without wrapping', () => {
		const httpError = new Error('Unavailable') as Error & { status: number };
		httpError.status = 503;
		mockProjectList.mockImplementation(() => { throw httpError; });

		try {
			load();
			expect.fail('should have thrown');
		} catch (e: unknown) {
			const err = e as { status: number };
			expect(err.status).toBe(503);
		}
	});
});
