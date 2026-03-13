# Database Schema

## What
SQLite 데이터베이스 스키마 설계. 대화, 메시지, 프로젝트 데이터를 저장하고 FTS5 전문 검색 인덱스를 제공.

## Why
구조화된 스키마로 효율적인 쿼리와 전문 검색을 지원한다. 사이드바 목록 조회, 대화 메시지 로딩, 키워드 검색 모두 빠르게 동작해야 한다.

## Acceptance Criteria

### Must Have
- [ ] conversation 테이블: uuid, name, summary, created_at, updated_at
- [ ] message 테이블: uuid, conversation_uuid, text, content_json, sender, created_at, message_order
- [ ] project 테이블: uuid, name, description, created_at, updated_at
- [ ] project_doc 테이블: uuid, project_uuid, filename, content
- [ ] FTS5 가상 테이블: message의 text 필드 기반 전문 검색
- [ ] conversation_uuid + message_order 복합 인덱스
- [ ] created_at 인덱스 (사이드바 정렬/그룹핑용)

### Should Have
- [ ] ingest_log 테이블: 처리된 ZIP 파일 추적 (파일명, 처리일시, 대화수)
- [ ] 메시지 순서 보장 (message_order 컬럼)

### Won't Have (This Iteration)
- [ ] 대화-프로젝트 연결 테이블 (데이터에 연결 정보 없음)
- [ ] 사용자 테이블 (단일 사용자 아카이브)

## Context

### Schema Design
```sql
CREATE TABLE conversation (
  uuid TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE message (
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

CREATE TABLE project (
  uuid TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE project_doc (
  uuid TEXT PRIMARY KEY,
  project_uuid TEXT NOT NULL REFERENCES project(uuid),
  filename TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE ingest_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL UNIQUE,
  ingested_at TEXT NOT NULL,
  conversation_count INTEGER NOT NULL DEFAULT 0,
  message_count INTEGER NOT NULL DEFAULT 0
);

-- Indexes
CREATE INDEX idx_message_conversation ON message(conversation_uuid, message_order);
CREATE INDEX idx_conversation_updated ON conversation(updated_at DESC);
CREATE INDEX idx_conversation_created ON conversation(created_at DESC);

-- FTS5 for full-text search
CREATE VIRTUAL TABLE message_fts USING fts5(
  text,
  content='message',
  content_rowid='rowid'
);
```

### Query Patterns
- **사이드바 목록**: `SELECT * FROM conversation ORDER BY updated_at DESC LIMIT 50 OFFSET ?`
- **대화 메시지**: `SELECT * FROM message WHERE conversation_uuid = ? ORDER BY message_order`
- **전문 검색**: `SELECT m.*, c.name FROM message_fts JOIN message m ... JOIN conversation c ... WHERE message_fts MATCH ?`

### Edge Cases
- **name이 빈 대화**: name이 ''인 경우 첫 번째 human 메시지의 앞부분을 fallback으로 사용
- **FTS 동기화**: 메시지 삽입 시 FTS 테이블 트리거로 자동 동기화

### Related Specs
- `data-pipeline.md` (이 스키마에 데이터를 채우는 파이프라인)
- `search.md` (FTS5를 활용하는 검색 기능)
- `sidebar.md` (conversation 테이블 쿼리)
