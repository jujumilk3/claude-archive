# Implementation Plan — Claude Archive Viewer

Read-only SvelteKit archive viewer for exported Claude.ai conversations.

---

## Completed Phases

All phases implemented. Tagged at `0.0.43`.

- **Phase 1: Foundation** — SvelteKit scaffold, SQLite schema + FTS5, data ingestion script
- **Phase 2: Layout & Theme** — 2-column dark layout, Tailwind v4 theme, sidebar toggle
- **Phase 3: Sidebar & Conversation List** — Paginated API, date-grouped list, infinite scroll, empty name fallback
- **Phase 4: Chat View** — Messages API, markdown rendering, code blocks, tool_use/tool_result collapsibles, 404 handling
- **Phase 5: Search** — FTS5 search API, debounced UI, message jump with highlight animation
- **Phase 6: Projects View** — Project list with doc count, inline detail expansion
- **Phase 7: Polish** — Keyboard shortcuts (⌘K, ⌘B, Escape), mobile responsive, hover timestamps, skeleton loading, scroll perf
- **Phase 8: Spec Compliance (Must-Have)** — Full markdown via `marked`, syntax highlighting via `highlight.js`, line numbers, search term highlighting, keyboard nav for search
- **Phase 9: Spec Compliance (Should-Have)** — Project doc markdown, search history, global Escape
- **Phase 10: Server-Side Data Loading** — SSR for layout + chat + sidebar hydration
- **Phase 11: Bug Fixes** — Dark `<mark>` styling, FTS5 special char escaping, bundle size optimization, `rb` alias fix, search infinite scroll
- **Phase 12: Final Should-Haves** — Ingest progress counter, file-level JSON error handling
- **Phase 13: Spec Compliance Fixes** — Custom error page (`+error.svelte`), project detail description in expanded panel, `users.json` spec inconsistency fix
- **Phase 14: Content Completeness** — Attachments/files rendering in messages, thinking block collapsible display, search result name fallback for unnamed conversations
- **Phase 15: Code Block Language Detection** — Auto-detected language label for unlabeled code blocks (uses highlight.js `highlightAuto` result instead of generic 'code')
- **Phase 16: Search Result Sender Label** — Display message sender (나/Claude) in search result cards per search spec
- **Phase 17: Search Test Coverage** — Extracted `escapeFts5Query` to `src/lib/search.ts`, added 17 tests for FTS5 query escaping and search integration (special chars, Korean text, phrase matching, snippet generation, joined queries)
- **Phase 18: Layout Spec Compliance** — Sidebar slide animation on desktop (CSS width transition instead of conditional render), chat header max-width aligned with message area (768px centered)
- **Phase 19: Bug Fixes** — Search fetch error handling (try/catch in debounced search), ⌘K focus timing (wait for sidebar transition before focusing), files display when attachments also present, highlight animation replay for same message
- **Phase 20: Data Access Layer** — Extracted duplicated SQL queries into `src/lib/db/queries.ts` shared module with typed interfaces; eliminated query drift risk between SSR layout loads and API routes for conversations, messages, and projects
- **Phase 21: Error Handling & Query Tests** — Added catch blocks to `loadMoreSearchResults` and `loadConversations` (consistent with Phase 19 fix); added 13 tests for data access layer (`queries.ts`) covering pagination, name fallback, project docs, and edge cases
- **Phase 22: API Robustness & Test Coverage** — Added try/catch error handling to all 4 API endpoints and 3 server load functions; added NaN/negative parameter guards to conversations and search endpoints (clamp offset ≥ 0, limit 1–100); expanded test suite from 45 to 58 tests covering markdown renderers (inline code, links, tables, empty input, escapeAttr), query field assertions, and highlightSearchTerms edge cases
- **Phase 23: Hardening & Architecture** — Unknown content block type fallback rendering (displays raw JSON in collapsible); `javascript:` URI blocking in markdown links; copy button double-click fix; `file_size === 0` display fix; `hasMore` magic number fix in layout server load; extracted search SQL into shared `queries.ts` layer (`searchMessages`); expanded test suite from 58 to 65 tests
- **Phase 24: Search Snippet XSS Fix** — FTS5 `snippet()` does not HTML-escape output; raw HTML in message text (e.g. `<script>`, `<img onerror=...>`) was rendered via `{@html}` in search results. Added `sanitizeSnippet()` to `src/lib/search.ts` that HTML-escapes snippet text while preserving `<mark>` tags. Applied in search API endpoint. Added 8 tests (unit + integration proving the XSS vector and fix). Test suite: 65 → 73 tests.
- **Phase 25: Markdown XSS Hardening & Search Transaction** — Escaped `detectedLang` in code block renderer to prevent XSS via malicious fenced code block language labels. Escaped `href` attribute in link renderer to prevent attribute injection via URLs containing double quotes. Wrapped `searchMessages` count+results queries in a SQLite transaction to prevent TOCTOU inconsistency. Added 2 tests (language label XSS, href attribute injection). Test suite: 73 → 75 tests.
- **Phase 26: API Route Handler Tests** — Added 25 tests for all 4 API endpoints (`/api/conversations`, `/api/conversations/:uuid/messages`, `/api/search`, `/api/projects/:uuid`). Tests cover parameter validation (offset/limit clamping, NaN handling), 404 responses for missing resources, 500 error handling, search query min-length guard, empty escaped query handling, FTS5 query wrapping, snippet sanitization, hasMore calculation, and response shape. Test suite: 75 → 100 tests.
- **Phase 27: API Consistency & Conversations Transaction** — Added missing `HttpError` re-throw guard to `conversations` and `search` API endpoint catch blocks (matching the pattern already used in `messages` and `projects` endpoints — without this guard, a SvelteKit `error()` thrown from a query helper would be silently swallowed and replaced with a generic 500). Created `getConversationListWithCount()` transactional query that wraps count + list in a single SQLite transaction to prevent TOCTOU inconsistency (same pattern applied to `searchMessages` in Phase 25). Updated both the API endpoint and layout server load to use the new function. Added 4 tests (HttpError re-throw for conversations and search, transactional query correctness). Test suite: 100 → 104 tests.
- **Phase 28: Security, Error Handling & Accessibility** — Escaped inline `codespan` text in markdown renderer to prevent XSS via malicious backtick content. Added `HttpError` re-throw guards to `+layout.server.ts` and `projects/+page.server.ts` catch blocks (completing the pattern across all server loads). Added error handling to project docs fetch with HTTP status check, catch block, and variable shadowing fix. Removed dead `totalConversations` prop from Sidebar. Added `aria-label` attributes to search inputs, clear buttons, and sidebar toggle for screen reader accessibility. Test suite: 104 → 106 tests.
- **Phase 29: Conversation Summary Display** — Surfaced the previously unused `summary` field in two places: (1) chat view header shows summary as a secondary line below the conversation title (conditionally, only when summary exists), (2) sidebar conversation items show summary as a native tooltip on hover. The `summary` field was already fetched by both `getConversationByUuid` and the conversations list API — this phase simply wires it into the UI. No new tests needed (pure template changes with existing data flow). Test suite: 106 tests.
- **Phase 30: Home Page Archive Statistics** — Replaced the static placeholder home page with a dynamic statistics dashboard. Added `getArchiveStats()` query to `queries.ts` that returns total conversations, messages, projects, and the date range of the archive in a single efficient query. Added `+page.server.ts` for the home route to load stats via SSR. Updated the home page UI to display three stat cards (대화/메시지/프로젝트 counts) with the accent color and the archive date range below. Gracefully falls back to the original "대화를 선택하세요" message if stats fail to load. Added 2 tests for `getArchiveStats`. Test suite: 106 → 108 tests.
- **Phase 31: Search AND Matching** — Changed multi-word search from exact phrase matching to word-level AND matching. Previously, searching "typescript error" only found the exact phrase; now it finds messages containing both "typescript" AND "error" anywhere in the text. Added `buildFts5Query()` to `search.ts` that escapes input, splits into words, and wraps each in FTS5 quotes (e.g. `"typescript" "error"`). Updated search API endpoint to use `buildFts5Query` instead of manual quote wrapping. The `highlightSearchTerms()` function in `markdown.ts` already highlights individual terms, so in-conversation highlighting works correctly with the new query format. Added 8 unit tests for `buildFts5Query` and 1 new integration test for cross-word AND matching. Test suite: 108 → 117 tests.
- **Phase 32: Server Load Function Tests** — Added 16 tests for all 4 SvelteKit server load functions (`+layout.server.ts`, home `+page.server.ts`, `/chat/[uuid]/+page.server.ts`, `/projects/+page.server.ts`). Tests cover: `hasMoreConversations` calculation (true/false/boundary at 50), graceful `stats: null` fallback on home page error, chat 404 for missing conversation, message fetch skipped on 404, HttpError re-throw guards across all loads, and 500 error propagation. These loads were previously untested despite containing error handling, data transformation, and HttpError re-throw logic. Test suite: 117 → 133 tests.
- **Phase 33: Navigation Loading & Accessibility** — Added animated progress bar during page navigation using SvelteKit's `$navigating` store (visible at top of content area during SSR page transitions). Fixed search history delete buttons being unreachable by keyboard (changed from `hidden`/`group-hover:block` to `opacity-0`/`focus:opacity-100`/`group-hover:opacity-100` so Tab key can reach them). Added `aria-label` to search history delete buttons for screen reader context. Added `aria-expanded` attribute to project collapsible toggle buttons to communicate open/closed state to assistive technologies. Test suite: 133 tests (no new tests — pure template/CSS changes).
- **Phase 34: Bug Fixes & Test Coverage** — Fixed projects page race condition where rapidly clicking between projects could show wrong project's docs (stale fetch response overwrites current state). Added `expandedUuid` guards after each `await` in `toggleProject()`. Fixed home page `+page.server.ts` missing `HttpError` re-throw guard (inconsistent with all other server loads — HttpErrors were silently swallowed as `stats: null`). Fixed `buildFts5Query` filtering single-character words (`length >= 2`) to match `highlightSearchTerms` behavior — prevents noisy FTS5 matches on single chars that wouldn't get highlighted anyway. Added 6 tests: projects API HttpError re-throw, `getProjectDocs` error path, search `hasMore=false`, home page HttpError re-throw, `buildFts5Query` single-char filtering (2 cases). Test suite: 133 → 139 tests.
- **Phase 35: UX Polish** — Three fixes: (1) Sidebar projects button now shows active/selected state when on `/projects` route (matching conversation highlight pattern). (2) Projects page distinguishes fetch errors from empty docs — shows "문서를 불러오는데 실패했습니다" error message instead of misleading "문서가 없습니다" on API failure. (3) Search shows immediate "검색 중..." feedback when typing (≥2 chars) instead of blank state during 300ms debounce + fetch; `isSearching` set before debounce timer, `searchPending` state tracks debounce/fetch phase. Test suite: 139 tests (pure template/state changes).
- **Phase 36: Markdown Export** — Added conversation export to Markdown. Created `src/lib/export.ts` with `exportConversationToMarkdown()` that converts conversation metadata + all message content blocks (text, thinking, tool_use, tool_result, attachments, files, unknown types) into a well-structured Markdown document. Added `downloadMarkdown()` for client-side file download and `conversationFilename()` for safe filename generation. Added "↓ MD" export button in chat view header (`chat/[uuid]/+page.svelte`). Added 24 tests covering: title/metadata rendering, sender labels (나/Claude), all content block types, attachments/files, fallback on invalid JSON, filename sanitization, and edge cases. Test suite: 139 → 163 tests.

- **Phase 37: i18n Component Migration & Tests** — Migrated all remaining hardcoded strings to i18n `$t()` calls across 3 components: `chat/[uuid]/+page.svelte` (4 Korean strings → `common.noTitle`, `chat.exportAriaLabel`, `chat.exportTitle`, `chat.noMessages`), `projects/+page.svelte` (12 strings including title, search, empty states, doc counts, loading, error messages; replaced hardcoded `toLocaleDateString('ko-KR')` with i18n `formatShortDate`), `Message.svelte` (5 English strings → `message.thinking`, `message.result`, `message.resultError`, `message.copy`, `message.copied`). Added 5 new `message.*` keys to `types.ts`, `ko.ts`, and `en.ts`. Added 26 i18n unit tests covering store reactivity, parameter interpolation, missing key fallback, all formatting helpers per locale, `senderLabel`, `availableLocales`, and locale file completeness. All components now fully use the i18n system. Test suite: 163 → 189 tests.

- **Phase 38: Settings Page** — Created `/settings` route with three sections: General (language dropdown using i18n system), Appearance (theme toggle Light/Dark/System with live switching + font size selector Small/Medium/Large), Data (Export All button via `/api/export` endpoint). Created `src/lib/stores/settings.ts` Svelte store managing theme and fontSize with localStorage persistence under `claude-archive-settings` key (merge-safe with existing i18n language field). Added light mode CSS color tokens via `[data-mode="light"]` selector in `app.css`. Added FOUC prevention inline script in `app.html` that reads settings and applies `data-mode` + font size before paint. System theme tracks OS preference via `matchMedia` listener. Reset-to-defaults button. Fixed pre-existing TypeScript error in home page (`newest_conversation` nullable check). Created `/api/export` endpoint for bulk markdown export. Test suite: 189 → 203 tests (14 new settings store tests covering load/save/defaults/validation/theme resolution/font size mapping/reset).

- **Phase 39: Design System & Code Quality** — Comprehensive design system overhaul plus code quality fixes. (1) **HSL Color Token System**: Replaced 8 hex CSS variables with full HSL-based system — added gray scale palette (`--_gray-0` through `--_gray-900`), `--_brand-clay`, and spec-exact semantic tokens for both light and dark modes. Light mode uses spec HSL values (e.g., `hsl(48 33.3% 97.1%)` for main background). Border tokens use 15% opacity per spec. (2) **Font System**: Added 6 `@font-face` declarations for Anthropic Sans/Serif/Mono (variable weights, normal + italic, `font-display: swap`). Created `--font-ui`, `--font-serif`, `--font-mono` CSS custom properties with Pretendard CJK fallback. (3) **Typography**: Applied spec-exact values — `.claude-response` (Serif 16px/24px/400), `.human-message` (Sans 16px/22.4px/430), `.sidebar-item` (Sans 12px/16px/430/32px height), `code`/`pre code` uses `--font-mono`. (4) **ContentBlock Dedup**: Extracted `ContentBlock` interface to `src/lib/types.ts`; both `export.ts` and `Message.svelte` import from shared module. (5) **Bug Fix**: Fixed undefined `hover:bg-bg-secondary` token in chat export button (changed to `hover:bg-bg-sidebar`). (6) **Test Quality**: `db.test.ts` uses `it.skipIf` for proper skip reporting; `search.test.ts` moved setup to `beforeAll`; `export.test.ts` added 2 English locale tests. Test suite: 203 → 204 tests.

---

## Remaining Work

Gaps between specs and implementation, ordered by priority. Specs for these features were added in commit `8772e34`.

### HIGH Priority — Core Functionality Gaps

- ~~**i18n: Remaining Component Migration**~~ ✅ Completed (Phase 37). All 3 components migrated: `chat/[uuid]/+page.svelte` (4 strings), `projects/+page.svelte` (12 strings + locale-aware date formatting), `Message.svelte` (5 strings). Added 5 new `message.*` translation keys to types, `ko.ts`, and `en.ts`.

- ~~**i18n: Test Coverage**~~ ✅ Completed (Phase 37). Added 26 tests covering: `t()` store reactivity on locale change, parameter interpolation, missing key fallback, `getTranslation` non-reactive API, `formatDate`/`formatMonthYear`/`formatNumber`/`formatTimestamp`/`formatShortDate` output per locale, `senderLabel` mapping, `availableLocales` shape, locale file completeness validation, and `message.*` key existence checks.

- ~~**Settings Page**~~ ✅ Completed (Phase 38). Created `/settings` route (General, Appearance, Data sections), `src/lib/stores/settings.ts` with localStorage persistence, light mode CSS tokens, FOUC prevention script, `/api/export` endpoint. Test suite: 189 → 203 tests.

### MEDIUM Priority — Design & Visual Fidelity

- ~~**Design System: Custom Fonts**~~ ✅ Completed (Phase 39). Added 6 `@font-face` declarations (Anthropic Sans/Serif/Mono, normal + italic, variable weights) with `font-display: swap`. Created CSS custom properties `--font-ui`, `--font-serif`, `--font-mono` with comprehensive fallback chains (Pretendard for CJK, system fonts). Applied `claude-response` class (Serif 16px/24px weight 400) to assistant messages and `human-message` class (Sans 16px/22.4px weight 430) to user messages. Sidebar items use `sidebar-item` class (Sans 12px/16px weight 430, 32px height). Font files go in `static/fonts/` when available; fallback chain ensures graceful degradation.

- ~~**Design System: Full Color Token System**~~ ✅ Completed (Phase 39). Migrated `app.css` from 8 hex CSS variables to full HSL-based system per spec. Added complete gray scale palette (`--_gray-0` through `--_gray-900`) and `--_brand-clay` to `:root`. Dark mode semantic tokens reference gray scale variables. Light mode uses spec-exact HSL values (e.g., `--bg-primary: hsl(48 33.3% 97.1%)`, `--text-primary: hsl(60 2.6% 7.6%)`). Border tokens use 15% opacity as specified. Added `--text-muted` token for inactive text. Skeleton shimmer uses theme-aware `--skeleton-mid` variable. Mark highlight uses brand-clay token.

- ~~**Design System: Typography Tokens**~~ ✅ Completed (Phase 39). Applied spec-exact typography values: `.claude-response` (Serif 16px/24px weight 400, bold 600), `.human-message` (Sans 16px/22.4px weight 430), `.sidebar-item` (Sans 12px/16px weight 430, height 32px), body default (Sans 16px/24px). Code blocks use `--font-mono`. All values match `specs/design-system-claude.md` exactly.

### LOW Priority — Polish & Consistency

- ~~**Design System: Light Mode**~~ ✅ Completed (Phase 39). Light mode now uses spec-exact HSL values from `specs/design-system-claude.md`. Token values updated to match: `--bg-primary: hsl(48 33.3% 97.1%)` (warm off-white rgb 250,249,245), `--bg-message-human: hsl(48 25% 92.2%)` (rgb 240,238,230), `--text-primary: hsl(60 2.6% 7.6%)` (rgb 20,20,19), border at 15% opacity. Depends on Phase 39 color token system (now complete).

- **Svelte API Consistency** — Mixed Svelte 4/5 API usage across components. `chat/[uuid]/+page.svelte` and `Sidebar.svelte` use `$app/stores` (Svelte 4 pattern), while `+error.svelte` uses `$app/state` (Svelte 5 runes). Should standardize on one approach across all components.

- ~~**ContentBlock Interface Duplication**~~ ✅ Completed (Phase 39). Extracted `ContentBlock` interface to `src/lib/types.ts`. Both `src/lib/export.ts` and `src/lib/components/Message.svelte` now import from the shared module.

- ~~**Test Quality Issues**~~ ✅ Completed (Phase 39). (1) `db.test.ts` now uses `it.skipIf(!hasDb)` for proper vitest skip reporting instead of silent return. (2) `search.test.ts` FTS5 integration moved setup from first `it` block to `beforeAll`. (3) `export.test.ts` added 2 tests exercising `'en'` locale parameter (English sender labels, metadata labels, untitled fallback). Test suite: 203 → 204 tests.

---

## Notes

### Spec Divergences (Intentional)

- **`highlight_ranges` in search API response** — Spec defines this field but the frontend uses FTS5 `<mark>` tags in the snippet string directly, which is simpler and sufficient.
- **Sidebar date grouping uses `updated_at`** — Spec says `created_at` for date groups but sorts by `updated_at`. Using `updated_at` for both is consistent and better UX (recently active conversations appear in "오늘").
- **Chat view skeleton UI** — Unnecessary with SSR (Phase 10); data loads before page renders.
- **`creator` in project API response** — Spec defines a `creator` object but the DB schema has no `user` table (users.json is ignored per data-pipeline spec); field omitted.

### Implementation Order Notes

- i18n component migration can proceed immediately — the infrastructure is already in place.
- Settings page depends on i18n being fully migrated (language selector must use the i18n system).
- Light mode depends on both the settings page (theme toggle UI) and the full color token system (light-mode semantic tokens). It should be tackled last.
- Custom fonts and color tokens can be done independently of each other and of the settings/i18n work.

---

## Not In Scope (Parking Lot)

- Semantic/embedding-based search
- Conversation bookmarks and tags
- Export to PDF (Markdown export implemented in Phase 36)
- Automatic conversation-to-project matching
- Real-time filesystem watching
- Direct Claude API data fetching
