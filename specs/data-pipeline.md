# Data Pipeline

## What
Claude export ZIP 파일에서 JSON을 추출하고 SQLite 데이터베이스로 변환하는 전처리 파이프라인. 새로운 export 데이터가 추가되면 자동으로 감지하여 증분 업데이트.

## Why
165MB+ JSON을 런타임에 직접 처리하면 성능이 나빠진다. 빌드타임에 SQLite로 변환하면 빠른 검색과 페이지네이션이 가능하고, FTS5로 전문 검색도 지원할 수 있다.

## Acceptance Criteria

### Must Have
- [ ] `temp-data/` 디렉토리의 ZIP 파일을 자동 감지하고 압축 해제
- [ ] `conversations.json`, `projects.json`, `users.json`을 파싱하여 SQLite에 삽입
- [ ] 이미 처리된 데이터는 건너뛰기 (UUID 기반 중복 방지)
- [ ] 새로운 ZIP 파일 추가 시 기존 DB에 증분 업데이트
- [ ] 대화 메시지의 content 배열 내 text/tool_use/tool_result를 올바르게 파싱
- [ ] 빌드 스크립트로 실행 가능 (`npm run ingest` 또는 유사)

### Should Have
- [ ] 처리 진행률 표시 (N/총 대화수)
- [ ] 에러 발생 시 해당 대화 건너뛰고 계속 처리 + 로그 출력

### Won't Have (This Iteration)
- [ ] 실시간 파일 와칭 (파일시스템 watcher)
- [ ] Claude API를 통한 직접 데이터 가져오기

## Context

### Data Flow
1. 사용자가 claude.ai에서 데이터 export → ZIP 파일 다운로드
2. ZIP을 `temp-data/` 디렉토리에 배치
3. `npm run ingest` 실행
4. 스크립트가 ZIP 감지 → 압축 해제 → JSON 파싱 → SQLite 삽입
5. SvelteKit 앱이 생성된 SQLite DB를 읽어서 서빙

### Source Data Structure
```
temp-data/
├── data-YYYY-MM-DD-HH-mm-ss-batch-NNNN.zip
└── data-YYYY-MM-DD-HH-mm-ss-batch-NNNN/
    ├── conversations.json  # ~165MB, 2100+ conversations
    ├── projects.json       # ~400KB, 33 projects
    └── users.json          # ~166B, user info
```

### conversations.json Structure
```json
[
  {
    "uuid": "string",
    "name": "string",
    "summary": "string",
    "created_at": "ISO8601",
    "updated_at": "ISO8601",
    "account": { "uuid": "string" },
    "chat_messages": [
      {
        "uuid": "string",
        "text": "string (plain text)",
        "content": [
          { "type": "text", "text": "string" },
          { "type": "tool_use", "name": "string", "input": {} },
          { "type": "tool_result", "content": "string" }
        ],
        "sender": "human | assistant",
        "created_at": "ISO8601",
        "updated_at": "ISO8601",
        "attachments": [],
        "files": []
      }
    ]
  }
]
```

### Edge Cases
- **빈 대화**: chat_messages가 비어있는 대화는 DB에 저장하되 사이드바에서 별도 처리
- **중복 ZIP**: 같은 데이터가 여러 ZIP에 포함될 수 있음 → UUID로 중복 방지
- **깨진 JSON**: 파싱 실패 시 해당 파일 건너뛰고 에러 로그
- **대용량 메시지**: 일부 메시지의 content가 매우 클 수 있음 (코드 전체 포함 등)

### Related Specs
- `database-schema.md` (이 파이프라인이 생성하는 스키마)
