# Search

## What
대화 내용 전체를 대상으로 하는 Full-text 검색. 검색 결과에서 특정 메시지 위치로 직접 점프 가능.

## Why
2,100+개 대화에서 과거에 논의했던 코드, 아이디어, 솔루션을 빠르게 찾을 수 있어야 한다. 대화 제목만으로는 내용을 기억하기 어려우므로 전문 검색이 필수.

## Acceptance Criteria

### Must Have
- [ ] 사이드바 상단 검색 입력 필드 (Claude 웹과 동일한 위치)
- [ ] SQLite FTS5 기반 전문 검색
- [ ] 검색 결과: 대화 제목 + 매칭된 메시지 미리보기 (전후 맥락 포함)
- [ ] 검색 결과 클릭 시 해당 대화의 해당 메시지 위치로 스크롤 + 하이라이트
- [ ] 검색어 하이라이트 (결과 목록 및 대화 내 모두)
- [ ] 디바운스 적용 (타이핑 후 300ms 대기 후 검색)
- [ ] 결과 없을 때 빈 상태 표시

### Should Have
- [ ] 검색 결과 수 표시
- [ ] 키보드 네비게이션 (Enter로 첫 결과 이동, 화살표로 결과 탐색)
- [ ] 검색 히스토리 (최근 검색어 기억)

### Won't Have (This Iteration)
- [ ] 날짜/sender 필터 조합
- [ ] 시맨틱/유사도 검색
- [ ] 정규식 검색
- [ ] 검색 결과 내 추가 필터링

## Context

### User Flow
1. 사이드바 상단 검색 아이콘 클릭 또는 `Cmd+K` 단축키
2. 검색어 입력 → 300ms 디바운스 후 검색 실행
3. 사이드바가 검색 결과 모드로 전환
4. 결과 목록: 대화 제목 + 매칭된 메시지 snippet
5. 결과 클릭 → `/chat/:uuid?highlight=:messageUuid` 로 이동
6. 해당 메시지로 스크롤 + 배경색 하이라이트 애니메이션
7. 검색 취소 (ESC 또는 X 버튼) → 기존 사이드바 목록 복원

### Search API
```
GET /api/search?q=검색어&offset=0&limit=20
Response: {
  results: Array<{
    conversation_uuid: string,
    conversation_name: string,
    message_uuid: string,
    message_sender: string,
    snippet: string,        // 매칭 전후 맥락 포함 텍스트
    highlight_ranges: Array<[start, end]>,
    created_at: string
  }>,
  total: number,
  hasMore: boolean
}
```

### FTS5 Query
```sql
SELECT
  m.uuid as message_uuid,
  m.conversation_uuid,
  c.name as conversation_name,
  snippet(message_fts, 0, '<mark>', '</mark>', '...', 32) as snippet,
  m.sender,
  m.created_at
FROM message_fts
JOIN message m ON m.rowid = message_fts.rowid
JOIN conversation c ON c.uuid = m.conversation_uuid
WHERE message_fts MATCH ?
ORDER BY rank
LIMIT ? OFFSET ?
```

### Message Jump Mechanism
1. URL에 `?highlight=messageUuid` 쿼리 파라미터
2. 대화 로드 후 해당 UUID의 메시지 DOM 엘리먼트 찾기
3. `scrollIntoView({ behavior: 'smooth', block: 'center' })` 실행
4. 해당 메시지에 하이라이트 배경색 애니메이션 (2초 후 fade out)

### Edge Cases
- **한국어 검색**: FTS5의 한국어 토크나이징 한계 → trigram 토크나이저 또는 unicode61 사용 고려
- **매우 짧은 검색어**: 2글자 이상만 검색 실행
- **특수문자 검색**: FTS5 쿼리 이스케이프 처리
- **검색 결과 0건**: "검색 결과가 없습니다" + 다른 검색어 제안 없음 (단순)
- **동일 대화 내 다수 매칭**: 대화당 여러 결과 각각 표시

### Related Specs
- `database-schema.md` (FTS5 테이블 정의)
- `sidebar.md` (검색 UI 위치)
- `chat-view.md` (메시지 점프 및 하이라이트)
