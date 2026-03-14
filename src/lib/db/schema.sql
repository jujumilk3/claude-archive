CREATE TABLE IF NOT EXISTS conversation (
  uuid TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'claude',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS message (
  uuid TEXT PRIMARY KEY,
  conversation_uuid TEXT NOT NULL REFERENCES conversation(uuid),
  text TEXT NOT NULL DEFAULT '',
  content_json TEXT NOT NULL DEFAULT '[]',
  sender TEXT NOT NULL CHECK(sender IN ('human', 'assistant')),
  created_at TEXT NOT NULL,
  message_order INTEGER NOT NULL,
  has_tool_use INTEGER NOT NULL DEFAULT 0,
  attachments_json TEXT NOT NULL DEFAULT '[]',
  files_json TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS project (
  uuid TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_doc (
  uuid TEXT PRIMARY KEY,
  project_uuid TEXT NOT NULL REFERENCES project(uuid),
  filename TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ingest_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL UNIQUE,
  ingested_at TEXT NOT NULL,
  conversation_count INTEGER NOT NULL DEFAULT 0,
  message_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_message_conversation ON message(conversation_uuid, message_order);
CREATE INDEX IF NOT EXISTS idx_conversation_updated ON conversation(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_created ON conversation(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_doc_project ON project_doc(project_uuid);

CREATE VIRTUAL TABLE IF NOT EXISTS message_fts USING fts5(
  text,
  content='message',
  content_rowid='rowid',
  tokenize='unicode61'
);

CREATE TRIGGER IF NOT EXISTS message_fts_insert AFTER INSERT ON message BEGIN
  INSERT INTO message_fts(rowid, text) VALUES (new.rowid, new.text);
END;

CREATE TRIGGER IF NOT EXISTS message_fts_delete AFTER DELETE ON message BEGIN
  INSERT INTO message_fts(message_fts, rowid, text) VALUES('delete', old.rowid, old.text);
END;

CREATE TRIGGER IF NOT EXISTS message_fts_update AFTER UPDATE ON message BEGIN
  INSERT INTO message_fts(message_fts, rowid, text) VALUES('delete', old.rowid, old.text);
  INSERT INTO message_fts(rowid, text) VALUES (new.rowid, new.text);
END;
