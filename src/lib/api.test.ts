import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/queries', () => ({
	getConversationCount: vi.fn(),
	getConversationList: vi.fn(),
	getConversationByUuid: vi.fn(),
	getMessagesByConversation: vi.fn(),
	getProjectByUuid: vi.fn(),
	getProjectDocs: vi.fn(),
	getProjectList: vi.fn(),
	searchMessages: vi.fn()
}));

vi.mock('$lib/search', () => ({
	escapeFts5Query: vi.fn((q: string) => q.replace(/['"*()[\]{}\-:^~+.]/g, ' ').trim()),
	sanitizeSnippet: vi.fn((s: string) => `sanitized:${s}`)
}));

vi.mock('@sveltejs/kit', () => ({
	json: (data: unknown) => {
		const body = JSON.stringify(data);
		return new Response(body, { headers: { 'content-type': 'application/json' } });
	},
	error: (status: number, message: string) => {
		const err = new Error(message) as Error & { status: number; body: { message: string } };
		err.status = status;
		err.body = { message };
		throw err;
	}
}));

function makeUrl(path: string, params: Record<string, string> = {}) {
	const url = new URL(`http://localhost${path}`);
	for (const [k, v] of Object.entries(params)) {
		url.searchParams.set(k, v);
	}
	return url;
}

async function parseJson(response: Response) {
	return JSON.parse(await response.text());
}

describe('GET /api/conversations', () => {
	let GET: (event: { url: URL }) => Response;
	let mockCount: ReturnType<typeof vi.fn>;
	let mockList: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.resetModules();

		const queries = await import('$lib/db/queries');
		mockCount = queries.getConversationCount as ReturnType<typeof vi.fn>;
		mockList = queries.getConversationList as ReturnType<typeof vi.fn>;

		mockCount.mockReturnValue(100);
		mockList.mockReturnValue([
			{ uuid: 'c1', name: 'Test', summary: '', created_at: '', updated_at: '', first_message_preview: null }
		]);

		const mod = await import('../routes/api/conversations/+server');
		GET = mod.GET as unknown as (event: { url: URL }) => Response;
	});

	it('returns conversations with default offset=0 and limit=50', async () => {
		const res = GET({ url: makeUrl('/api/conversations') });
		const data = await parseJson(res);

		expect(mockList).toHaveBeenCalledWith(0, 50);
		expect(data.total).toBe(100);
		expect(data.conversations).toHaveLength(1);
		expect(data.hasMore).toBe(true);
	});

	it('respects custom offset and limit params', async () => {
		mockCount.mockReturnValue(200);
		const res = GET({ url: makeUrl('/api/conversations', { offset: '20', limit: '30' }) });
		const data = await parseJson(res);

		expect(mockList).toHaveBeenCalledWith(20, 30);
		expect(data.hasMore).toBe(true);
	});

	it('clamps negative offset to 0', async () => {
		GET({ url: makeUrl('/api/conversations', { offset: '-5' }) });
		expect(mockList).toHaveBeenCalledWith(0, 50);
	});

	it('clamps limit above 100 to 100', async () => {
		GET({ url: makeUrl('/api/conversations', { limit: '500' }) });
		expect(mockList).toHaveBeenCalledWith(0, 100);
	});

	it('treats limit=0 as default (0 is falsy, falls back to 50)', async () => {
		GET({ url: makeUrl('/api/conversations', { limit: '0' }) });
		expect(mockList).toHaveBeenCalledWith(0, 50);
	});

	it('handles NaN offset gracefully', async () => {
		GET({ url: makeUrl('/api/conversations', { offset: 'abc' }) });
		expect(mockList).toHaveBeenCalledWith(0, 50);
	});

	it('handles NaN limit gracefully', async () => {
		GET({ url: makeUrl('/api/conversations', { limit: 'xyz' }) });
		expect(mockList).toHaveBeenCalledWith(0, 50);
	});

	it('calculates hasMore=false when at end', async () => {
		mockCount.mockReturnValue(1);
		const res = GET({ url: makeUrl('/api/conversations', { offset: '0', limit: '50' }) });
		const data = await parseJson(res);

		expect(data.hasMore).toBe(false);
	});

	it('throws 500 on database error', async () => {
		mockCount.mockImplementation(() => { throw new Error('DB down'); });

		expect(() => GET({ url: makeUrl('/api/conversations') })).toThrow();
		try {
			GET({ url: makeUrl('/api/conversations') });
		} catch (e: unknown) {
			const err = e as { status: number };
			expect(err.status).toBe(500);
		}
	});
});

describe('GET /api/conversations/:uuid/messages', () => {
	let GET: (event: { params: { uuid: string } }) => Response;
	let mockConv: ReturnType<typeof vi.fn>;
	let mockMsgs: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.resetModules();

		const queries = await import('$lib/db/queries');
		mockConv = queries.getConversationByUuid as ReturnType<typeof vi.fn>;
		mockMsgs = queries.getMessagesByConversation as ReturnType<typeof vi.fn>;

		mockConv.mockReturnValue({ uuid: 'c1', name: 'Test', summary: '', created_at: '', updated_at: '' });
		mockMsgs.mockReturnValue([{ uuid: 'm1', text: 'hi', sender: 'human' }]);

		const mod = await import('../routes/api/conversations/[uuid]/messages/+server');
		GET = mod.GET as unknown as (event: { params: { uuid: string } }) => Response;
	});

	it('returns conversation and messages', async () => {
		const res = GET({ params: { uuid: 'c1' } });
		const data = await parseJson(res);

		expect(data.conversation.uuid).toBe('c1');
		expect(data.messages).toHaveLength(1);
	});

	it('throws 404 for nonexistent conversation', () => {
		mockConv.mockReturnValue(undefined);

		try {
			GET({ params: { uuid: 'nonexistent' } });
			expect.fail('should have thrown');
		} catch (e: unknown) {
			const err = e as { status: number };
			expect(err.status).toBe(404);
		}
	});

	it('throws 500 on database error', () => {
		mockConv.mockImplementation(() => { throw new Error('DB error'); });

		try {
			GET({ params: { uuid: 'c1' } });
			expect.fail('should have thrown');
		} catch (e: unknown) {
			const err = e as { status: number };
			expect(err.status).toBe(500);
		}
	});

	it('re-throws HttpError from error() call', () => {
		const httpError = new Error('Not found') as Error & { status: number };
		httpError.status = 404;
		mockConv.mockReturnValue(undefined);

		try {
			GET({ params: { uuid: 'missing' } });
			expect.fail('should have thrown');
		} catch (e: unknown) {
			const err = e as { status: number };
			expect(err.status).toBe(404);
		}
	});
});

describe('GET /api/search', () => {
	let GET: (event: { url: URL }) => Response;
	let mockSearch: ReturnType<typeof vi.fn>;
	let mockSanitize: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.resetModules();

		const queries = await import('$lib/db/queries');
		mockSearch = queries.searchMessages as ReturnType<typeof vi.fn>;
		mockSearch.mockReturnValue({
			results: [{ message_uuid: 'm1', snippet: '<mark>test</mark> raw' }],
			total: 1
		});

		const search = await import('$lib/search');
		mockSanitize = search.sanitizeSnippet as ReturnType<typeof vi.fn>;

		const mod = await import('../routes/api/search/+server');
		GET = mod.GET as unknown as (event: { url: URL }) => Response;
	});

	it('returns empty results for query shorter than 2 characters', async () => {
		const res = GET({ url: makeUrl('/api/search', { q: 'a' }) });
		const data = await parseJson(res);

		expect(data.results).toEqual([]);
		expect(data.total).toBe(0);
		expect(mockSearch).not.toHaveBeenCalled();
	});

	it('returns empty results for empty query', async () => {
		const res = GET({ url: makeUrl('/api/search', { q: '' }) });
		const data = await parseJson(res);

		expect(data.results).toEqual([]);
		expect(data.total).toBe(0);
	});

	it('returns empty results when escaped query is empty', async () => {
		const res = GET({ url: makeUrl('/api/search', { q: '***' }) });
		const data = await parseJson(res);

		expect(data.results).toEqual([]);
		expect(data.total).toBe(0);
		expect(mockSearch).not.toHaveBeenCalled();
	});

	it('sanitizes snippets in results', async () => {
		const res = GET({ url: makeUrl('/api/search', { q: 'test query' }) });
		const data = await parseJson(res);

		expect(mockSanitize).toHaveBeenCalledWith('<mark>test</mark> raw');
		expect(data.results[0].snippet).toContain('sanitized:');
	});

	it('wraps escaped query in double quotes for FTS5', async () => {
		GET({ url: makeUrl('/api/search', { q: 'hello world' }) });

		expect(mockSearch).toHaveBeenCalledWith('"hello world"', 0, 20);
	});

	it('respects offset and limit params', async () => {
		GET({ url: makeUrl('/api/search', { q: 'test', offset: '10', limit: '5' }) });

		expect(mockSearch).toHaveBeenCalledWith(expect.any(String), 10, 5);
	});

	it('clamps search offset and limit', async () => {
		GET({ url: makeUrl('/api/search', { q: 'test', offset: '-5', limit: '200' }) });

		expect(mockSearch).toHaveBeenCalledWith(expect.any(String), 0, 100);
	});

	it('calculates hasMore correctly', async () => {
		mockSearch.mockReturnValue({ results: [{ snippet: 'x' }], total: 50 });
		const res = GET({ url: makeUrl('/api/search', { q: 'test', offset: '0', limit: '20' }) });
		const data = await parseJson(res);

		expect(data.hasMore).toBe(true);
	});

	it('throws 500 on search error', () => {
		mockSearch.mockImplementation(() => { throw new Error('FTS error'); });

		try {
			GET({ url: makeUrl('/api/search', { q: 'test' }) });
			expect.fail('should have thrown');
		} catch (e: unknown) {
			const err = e as { status: number };
			expect(err.status).toBe(500);
		}
	});
});

describe('GET /api/projects/:uuid', () => {
	let GET: (event: { params: { uuid: string } }) => Response;
	let mockProject: ReturnType<typeof vi.fn>;
	let mockDocs: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.resetModules();

		const queries = await import('$lib/db/queries');
		mockProject = queries.getProjectByUuid as ReturnType<typeof vi.fn>;
		mockDocs = queries.getProjectDocs as ReturnType<typeof vi.fn>;

		mockProject.mockReturnValue({ uuid: 'p1', name: 'Proj', description: 'Desc' });
		mockDocs.mockReturnValue([{ uuid: 'd1', filename: 'README.md', content: '# Hi' }]);

		const mod = await import('../routes/api/projects/[uuid]/+server');
		GET = mod.GET as unknown as (event: { params: { uuid: string } }) => Response;
	});

	it('returns project with docs', async () => {
		const res = GET({ params: { uuid: 'p1' } });
		const data = await parseJson(res);

		expect(data.project.uuid).toBe('p1');
		expect(data.docs).toHaveLength(1);
		expect(data.docs[0].filename).toBe('README.md');
	});

	it('throws 404 for nonexistent project', () => {
		mockProject.mockReturnValue(undefined);

		try {
			GET({ params: { uuid: 'nonexistent' } });
			expect.fail('should have thrown');
		} catch (e: unknown) {
			const err = e as { status: number };
			expect(err.status).toBe(404);
		}
	});

	it('throws 500 on database error', () => {
		mockProject.mockImplementation(() => { throw new Error('DB error'); });

		try {
			GET({ params: { uuid: 'p1' } });
			expect.fail('should have thrown');
		} catch (e: unknown) {
			const err = e as { status: number };
			expect(err.status).toBe(500);
		}
	});
});
