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

## Phase 9: Spec Compliance — Should-Have Gaps ✅

- [x] **9.1 Project doc markdown rendering** — Doc content rendered via `renderMarkdown()` instead of raw `<pre><code>`. Includes scoped markdown styles.
- [x] **9.2 Search history** — Remember recent search terms. Stored in localStorage (`claude-archive-search-history`), max 10 items. Dropdown appears when search input is focused with empty query. Individual items can be removed.
- [x] **9.3 Global Escape key** — Escape dismisses sidebar overlay on mobile and clears search from anywhere via `clearSearchState()` on Sidebar.

## Phase 10: Server-Side Data Loading ✅

- [x] **10.1 Layout server load** — `+layout.server.ts` loads initial 50 conversations server-side, eliminating skeleton flash on first render. Sidebar receives `initialConversations`, `totalConversations`, `hasMoreInitial` props.
- [x] **10.2 Chat page server load** — `chat/[uuid]/+page.server.ts` loads conversation metadata + messages server-side. Returns 404 error for invalid UUIDs. Chat page uses `PageProps` with server data — no client-side fetch needed.
- [x] **10.3 Sidebar hydration** — Sidebar initializes from server-provided data, falls back to client-side fetch if no initial data. Infinite scroll still fetches additional pages client-side via `/api/conversations`.

## Phase 11: Bug Fixes & Polish

- [x] **11.1 Dark-theme `<mark>` styling for search snippets** — FTS5 `snippet()` returns `<mark>` tags in sidebar search results. Browser default yellow background clashed with dark theme. Added global `mark` CSS in `app.css` matching the existing `search-highlight` color (rgba(218, 119, 86, 0.4)).
- [x] **11.2 FTS5 special character escaping** — `escapeFts5Query` only stripped `'"*()`. Added `[]{}`, `-`, `:`, `^`, `~` to prevent query syntax errors when users search for terms containing these characters.
- [x] **11.3 Bundle size optimization** — Replaced `highlight.js` full import (~190 languages, 1 MB chunk) with selective imports of 19 languages (bash, css, diff, go, graphql, ini, java, javascript, json, kotlin, markdown, python, rust, shell, sql, swift, typescript, xml, yaml) + common aliases. Eliminated Vite large chunk warning.
- [x] **11.4 Fix incorrect `rb` highlight.js alias** — `rb` (Ruby file extension) was incorrectly aliased to `rust`. Removed the alias since Ruby is not in the registered languages. Ruby code blocks tagged as `rb` will now fall back to auto-detection instead of being misclassified as Rust.
- [x] **11.5 Search results infinite scroll** — Search UI previously fetched only the first 20 results with no way to load more. Added offset-based pagination to search: `handleScroll` now triggers `loadMoreSearchResults()` when in search mode, appending additional pages. Includes loading indicator and proper state reset on clear.

## Phase 12: Remaining Should-Have Items

- [x] **12.1 Ingest progress counter** — Added per-conversation progress display (`Processing conversations: N/total`) to `scripts/ingest.ts`. Updates every 100 conversations and at completion. Uses `\r` for in-place terminal updates.
- [x] **12.2 File-level JSON parse error handling** — Wrapped `ingestConversations` and `ingestProjects` calls in try/catch in `main()`. A malformed `conversations.json` or `projects.json` now logs an error and continues processing remaining directories instead of aborting the entire ingest. Satisfies spec edge case: "깨진 JSON: 파싱 실패 시 해당 파일 건너뛰고 에러 로그".

### Remaining Should-Have Gaps (Low Priority)

- **Chat view skeleton UI** — Spec lists "메시지 로딩 시 스켈레톤 UI" as Should Have, but with server-side rendering (SSR) in Phase 10, chat data loads before the page renders — no client-side loading state occurs. This is effectively unnecessary.

### Spec Divergences (Intentional)

- **`highlight_ranges` in search API response** — Spec defines this field but it's unnecessary; the frontend uses FTS5 `<mark>` tags in the snippet string directly, which is simpler and sufficient.

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
