# Implementation Plan — Claude Archive Viewer

Read-only SvelteKit archive viewer for exported Claude.ai conversations.
Sorted by implementation priority (dependency order).

---

## Phase 1: Foundation ✅

- [x] **1.1 Scaffold SvelteKit project** — SvelteKit + TypeScript + Tailwind CSS v4. Configs: `svelte.config.js`, `tsconfig.json`, `vite.config.ts`, `package.json`. Uses `@tailwindcss/vite` plugin, `vitest` for tests.
- [x] **1.2 Database schema & connection** — `src/lib/db/schema.sql` with all tables (conversation, message, project, project_doc, ingest_log), FTS5 virtual table with unicode61 tokenizer, sync triggers. `src/lib/db/index.ts` singleton connection with WAL mode.
- [x] **1.3 Data ingestion script** — `scripts/ingest.ts` via `npm run ingest`. Auto-detects ZIPs in `temp-data/`, extracts, parses JSON, inserts with UUID dedup (INSERT OR REPLACE). Incremental via `ingest_log`. Result: 2101 conversations, 11682 messages, 33 projects.

## Phase 2: Layout & Theme ✅

- [x] **2.1 Global layout** — `src/routes/+layout.svelte` with 2-column layout (sidebar + main). Dark-mode-only. ⌘B toggle with localStorage persistence.
- [x] **2.2 Tailwind theme config** — Tailwind v4 via `@tailwindcss/vite` + `@theme` block in `app.css`. Claude dark colors. Korean/English font stack.
- [x] **2.3 Root page** — `src/routes/+page.svelte` with welcome/empty state.
- [x] **2.4 Sidebar integration** — Sidebar wired into layout with collapse/expand toggle + localStorage.

## Phase 3: Sidebar & Conversation List ✅

- [x] **3.1 Conversations API** — `GET /api/conversations?offset=0&limit=50`. Paginated, sorted by `updated_at DESC`, includes `first_message_preview` subquery.
- [x] **3.2 Sidebar component** — Date-grouped (오늘, 어제, 지난 7일, 지난 30일, monthly). Infinite scroll. Active highlighting. Search integrated.
- [x] **3.3 Empty name fallback** — First 50 chars of first human message via SQL subquery.

## Phase 4: Chat View ✅

- [x] **4.1 Messages API** — `GET /api/conversations/:uuid/messages`. Returns conversation metadata + all messages ordered by `message_order`. 404 on invalid UUID.
- [x] **4.2 Chat page** — `/chat/:uuid` with title header, scrollable message list, max-w-3xl centered.
- [x] **4.3 Message rendering** — Human right-aligned, assistant left-aligned. Handles text (inline markdown), tool_use (collapsible), tool_result (collapsible).
- [x] **4.4 Code blocks** — Extracted from markdown, language label, copy button with "Copied!" feedback, max-height scroll.
- [x] **4.5 Edge cases** — Empty conversation message, 404 handling, highlight animation for search jump.

## Phase 5: Search ✅

- [x] **5.1 Search API** — `GET /api/search?q=...&offset=0&limit=20`. FTS5 MATCH with snippet extraction, special char escaping.
- [x] **5.2 Search UI** — Search input in sidebar, 300ms debounce, results replace conversation list, result count, clear button.
- [x] **5.3 Message jump** — `?highlight=messageUuid` param, scrollIntoView with highlight-fade animation.

## Phase 6: Projects View ✅

- [x] **6.1 Projects page** — `/projects` with server-side loading, project list with doc count. Click to expand inline.
- [x] **6.2 Project detail** — Inline expansion showing docs with `<details>` for each file. API: `GET /api/projects/:uuid`.

## Phase 7: Polish & Should-Haves ✅

- [x] **7.1 Keyboard shortcuts** — ⌘K (search focus, opens sidebar if collapsed), ⌘B (sidebar toggle), Escape (clear search)
- [x] **7.2 Mobile responsive** — Sidebar as overlay on narrow screens
- [x] **7.3 Message timestamps** — Show on hover (Korean locale format)
- [x] **7.4 Skeleton loading UI** — Loading states for conversation list and chat view
- [x] **7.5 Search enhancements** — Result count display, ESC to dismiss search
- [x] **7.6 Scroll performance** — Optimize for long conversations (content-visibility: auto)
- [x] **7.7 Project search/filter** — Filter projects by name

## Phase 8: Spec Compliance — Must-Have Gaps ✅

- [x] **8.1 Full markdown rendering** — Replace regex-only `renderMarkdownInline` with `marked` library. Supports headings, lists (ordered/unordered), tables, blockquotes, horizontal rules, bold/italic, links, inline code. (`src/lib/markdown.ts`)
- [x] **8.2 Syntax highlighting** — `highlight.js` with `github-dark` theme. Auto-detects language when not specified. Custom marked renderer for code blocks.
- [x] **8.3 Line numbers in code blocks** — Generated in custom code renderer with `.line-number` spans. User-select disabled for copy friendliness.
- [x] **8.4 Timestamp placement fix** — Moved timestamp outside bubble div with `self-end` alignment so it appears beside the message on hover, not breaking layout.
- [x] **8.5 Search term highlighting in chat view** — When navigating from search results with `?q=searchTerm`, matching terms are highlighted with `<mark>` tags inside rendered message text. Uses `highlightSearchTerms()` in `src/lib/markdown.ts`.
- [x] **8.6 Keyboard navigation for search results** — Arrow Up/Down cycles through results with visual ring highlight, Enter navigates to selected (or first) result. `selectedIndex` state in Sidebar.

## Phase 9: Spec Compliance — Should-Have Gaps

- [x] **9.1 Project doc markdown rendering** — Doc content rendered via `renderMarkdown()` instead of raw `<pre><code>`. Includes scoped markdown styles.
- [ ] **9.2 Search history** — Remember recent search terms.
- [x] **9.3 Global Escape key** — Escape dismisses sidebar overlay on mobile and clears search from anywhere via `clearSearchState()` on Sidebar.

---

## Not In Scope (Parking Lot)

- Semantic/embedding-based search
- Conversation bookmarks and tags
- Export to PDF/Markdown
- Automatic conversation-to-project matching
- Light theme
- Real-time filesystem watching
- Direct Claude API data fetching
- Conversation-to-project link table
- User table (single-user archive)
