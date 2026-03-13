# Implementation Plan — Claude Archive Viewer

Read-only SvelteKit archive viewer for exported Claude.ai conversations.
Sorted by implementation priority (dependency order).

---

## Phase 1: Foundation ✅

- [x] **1.1 Scaffold SvelteKit project** — SvelteKit + TypeScript + Tailwind CSS v4. Configs: `svelte.config.js`, `tsconfig.json`, `vite.config.ts`, `package.json`. Uses `@tailwindcss/vite` plugin, `vitest` for tests.
- [x] **1.2 Database schema & connection** — `src/lib/db/schema.sql` with all tables (conversation, message, project, project_doc, ingest_log), FTS5 virtual table with unicode61 tokenizer, sync triggers. `src/lib/db/index.ts` singleton connection with WAL mode.
- [x] **1.3 Data ingestion script** — `scripts/ingest.ts` via `npm run ingest`. Auto-detects ZIPs in `temp-data/`, extracts, parses JSON, inserts with UUID dedup (INSERT OR REPLACE). Incremental via `ingest_log`. Result: 2101 conversations, 11682 messages, 33 projects.

## Phase 2: Layout & Theme (partial)

- [x] **2.1 Global layout** — `src/routes/+layout.svelte` with flex layout shell. Dark-mode-only. Color tokens in `app.css` via Tailwind v4 `@theme`.
- [x] **2.2 Tailwind theme config** — Tailwind v4 via `@tailwindcss/vite` + `@theme` block in `app.css`. Claude dark colors as custom properties. Korean/English font stack.
- [x] **2.3 Root page** — `src/routes/+page.svelte` with welcome/empty state ("대화를 선택하세요").
- [ ] **2.4 Sidebar integration** — Wire sidebar into layout with collapse/expand toggle + localStorage persistence. (Depends on Phase 3.)

## Phase 3: Sidebar & Conversation List

- [ ] **3.1 Conversations API** — `src/routes/api/conversations/+server.ts` — `GET /api/conversations?offset=0&limit=50`. Returns paginated conversation list sorted by `updated_at DESC`. Include `first_message_preview` for conversations with empty names.
- [ ] **3.2 Sidebar component** — `src/lib/components/Sidebar.svelte`. Date-grouped conversation list (오늘, 어제, 지난 7일, 지난 30일, then by month in Korean). Infinite scroll loading next 50. Active conversation highlighting. Click navigates to `/chat/:uuid`.
- [ ] **3.3 Empty name fallback** — First 50 chars of first human message as conversation title when `name` is empty.

## Phase 4: Chat View

- [ ] **4.1 Messages API** — `src/routes/api/conversations/[uuid]/messages/+server.ts` — Returns conversation metadata + all messages ordered by `message_order`.
- [ ] **4.2 Chat page** — `src/routes/chat/[uuid]/+page.svelte` + `+page.server.ts`. Loads conversation and renders message list. Conversation title at top.
- [ ] **4.3 Message rendering** — `src/lib/components/Message.svelte`. Human messages right-aligned, assistant left-aligned. Render `content_json` array handling all types:
  - `text`: Markdown rendering with `prose prose-invert` styling (headings, bold/italic, lists, links, inline code, tables)
  - `tool_use`: Collapsible `<details>`, collapsed by default, shows tool name + JSON input
  - `tool_result`: Collapsible `<details>`, collapsed by default, shows result content
- [ ] **4.4 Code blocks** — Syntax highlighting (Shiki or highlight.js, dark theme). Language label top-right. Copy button with "Copied!" feedback. Support Python, TypeScript, JavaScript, SQL, bash. Max height with scroll for very long blocks.
- [ ] **4.5 Edge cases** — Empty conversation message ("이 대화에는 메시지가 없습니다"). Invalid UUID → 404 page. Mixed Korean/English text rendering.

## Phase 5: Search

- [ ] **5.1 Search API** — `src/routes/api/search/+server.ts` — FTS5 MATCH query with snippet extraction (`<mark>` highlights). Returns conversation_uuid, conversation_name, message_uuid, sender, snippet, created_at. Paginated (limit 20). Escape special chars. Consider unicode61 tokenizer for Korean.
- [ ] **5.2 Search UI** — Search input at top of sidebar. `Cmd+K` shortcut to focus. 300ms debounce. Results mode replaces conversation list in sidebar. Each result shows conversation title + highlighted snippet. ESC/X to dismiss and restore normal list. Empty state when no results. Min query length: 2 chars.
- [ ] **5.3 Message jump** — URL param `?highlight=:messageUuid`. After conversation loads, `scrollIntoView({ behavior: 'smooth', block: 'center' })` to target message. Background highlight animation fading out after 2s. Highlight search terms within in-conversation view.

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
