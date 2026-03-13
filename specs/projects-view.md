# Projects View

## What
Claude 프로젝트 목록을 표시하는 별도 뷰. 프로젝트명, 설명, 첨부 문서를 읽기 전용으로 열람.

## Why
사용자가 과거에 만들었던 프로젝트와 그 컨텍스트(설명, docs)를 다시 확인할 수 있어야 한다. 대화와의 직접 연결은 데이터에 없으므로 목록 열람만 제공.

## Acceptance Criteria

### Must Have
- [ ] 프로젝트 목록 표시 (이름, 설명, 생성일)
- [ ] 프로젝트 클릭 시 상세 뷰 (설명 + 첨부 docs 목록)
- [ ] 각 doc의 filename과 content 표시
- [ ] 사이드바 또는 네비게이션에서 프로젝트 뷰로 전환 가능

### Should Have
- [ ] 프로젝트 검색/필터
- [ ] doc content의 마크다운 렌더링

### Won't Have (This Iteration)
- [ ] 프로젝트-대화 연결/매칭
- [ ] 프로젝트 생성/수정

## Context

### Data Structure
```json
{
  "uuid": "string",
  "name": "프로젝트명",
  "description": "프로젝트 설명",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "creator": { "uuid": "string", "full_name": "string" },
  "docs": [
    { "uuid": "string", "filename": "string", "content": "string", "created_at": "ISO8601" }
  ]
}
```

### Related Specs
- `layout-routing.md` (프로젝트 뷰 라우트)
