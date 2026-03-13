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

## Phase 6: Projects View

- [ ] **6.1 Projects page** — `src/routes/projects/+page.svelte` + `+page.server.ts`. List all projects with name, description, creation date. Click to expand/navigate to detail view showing description + docs list.
- [ ] **6.2 Project detail** — Show each attached doc with filename and content. Markdown rendering for doc content.

## Phase 7: Polish & Should-Haves

- [ ] **7.1 Keyboard shortcuts** — `Cmd+K` (search focus), `Cmd+B` (sidebar toggle)
- [ ] **7.2 Mobile responsive** — Sidebar as overlay on narrow screens
- [ ] **7.3 Message timestamps** — Show on hover
- [ ] **7.4 Skeleton loading UI** — Loading states for conversation list and chat view
- [ ] **7.5 Search enhancements** — Result count display, keyboard navigation (arrows + Enter), search history
- [ ] **7.6 Scroll performance** — Optimize for long conversations (virtualized list if needed)
- [ ] **7.7 Project search/filter** — Filter projects by name

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
