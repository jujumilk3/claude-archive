# Claude Archive

A self-hosted archive viewer for exported Claude and ChatGPT conversations. Browse, search, and read your past chats with a UI that closely mirrors claude.ai.

## Features

- **Multi-source import** — supports both Claude and OpenAI ChatGPT exports (auto-detected)
- **Web upload** — drag-and-drop or click to upload `conversations.json` directly in the browser
- **Conversation browser** — sidebar with date-grouped chat list, infinite scroll
- **Message viewer** — full markdown rendering, syntax-highlighted code blocks, collapsible tool_use/tool_result
- **Full-text search** — FTS5-powered search across all messages and titles with jump-to-message
- **Multi-select delete** — edit mode to select and bulk-delete conversations
- **Claude-accurate styling** — dark/light theme, serif response font, matching typography and spacing
- **Keyboard shortcuts** — `Cmd+B` toggle sidebar, `Cmd+K` focus search, `Esc` close
- **i18n** — English and Korean UI

## Tech Stack

- **SvelteKit** + TypeScript
- **SQLite** (better-sqlite3) with FTS5 full-text search
- **Tailwind CSS v4**
- **highlight.js** (Atom One Dark / Claude Light themes)
- Fonts: Inter, Source Serif 4, JetBrains Mono (via fontsource)

## Getting Started

### Prerequisites

- Node.js 22+

### Setup

```bash
git clone https://github.com/jujumilk3/claude-archive.git
cd claude-archive
npm install
```

### Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Import Data

1. **Claude**: Go to [claude.ai](https://claude.ai) → Settings → Export Data → Download
2. **ChatGPT**: Go to [chatgpt.com](https://chatgpt.com) → Settings → Data Controls → Export Data

Then upload `conversations.json` via the web UI (drag-and-drop or file picker on the home page). The format is auto-detected.

You can re-import at any time — existing conversations are updated by UUID, new ones are added.

### Build

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
  routes/
    +layout.svelte        # Sidebar + main content layout
    +page.svelte          # Home (stats + import)
    chat/[uuid]/          # Conversation view
    settings/             # Settings page
    projects/             # Projects list
    api/
      import/             # POST upload endpoint
      conversations/      # List + delete
      search/             # FTS5 search
  lib/
    components/           # Sidebar, Message, SourceLogo
    stores/               # Settings store (theme, font size)
    i18n/                 # English/Korean translations
    db/                   # SQLite queries, schema, ingest
    markdown.ts           # Marked + highlight.js renderer
```

## Configuration

Settings are available at `/settings`:

- **Theme** — Light / Dark / System
- **Font size** — Small / Medium / Large
- **Language** — English / Korean

## License

MIT
