# Sidebar

## What
Claude 웹과 동일한 형태의 좌측 사이드바. 대화 목록을 날짜별로 그룹핑하여 표시하고, 무한 스크롤로 추가 로드.

## Why
사용자가 과거 대화를 시간순으로 빠르게 탐색할 수 있어야 한다. Claude 웹의 익숙한 패턴을 그대로 사용하여 학습 비용을 없앤다.

## Acceptance Criteria

### Must Have
- [ ] Claude 웹과 동일한 사이드바 레이아웃 (좌측 고정, 대화 목록)
- [ ] 날짜별 그룹핑: "오늘", "어제", "지난 7일", "지난 30일", 이후 월별
- [ ] 각 대화 항목에 대화 제목(name) 표시
- [ ] 현재 선택된 대화 하이라이트
- [ ] 무한 스크롤 (스크롤 시 다음 50개 로드)
- [ ] 사이드바 접기/펼치기 토글
- [ ] 대화 클릭 시 `/chat/:uuid`로 네비게이션

### Should Have
- [ ] 대화 제목이 비어있을 때 첫 메시지 내용으로 대체 표시
- [ ] 사이드바 상단에 검색 입력 필드 (Search 스펙과 연결)
- [ ] 모바일 반응형 (작은 화면에서 오버레이)

### Won't Have (This Iteration)
- [ ] 대화 삭제/이름 변경 (읽기 전용 아카이브)
- [ ] 드래그 앤 드롭 정렬
- [ ] 대화 고정(pin) 기능

## Context

### User Flow
1. 앱 로드 → 사이드바에 최근 50개 대화 표시 (updated_at 내림차순)
2. 스크롤 다운 → 하단 도달 시 다음 50개 자동 로드
3. 대화 클릭 → 우측에 해당 대화 메시지 표시, 사이드바에서 활성 표시
4. 검색 입력 → 검색 결과 모드로 전환 (Search 스펙 참조)

### Date Grouping Logic
```
오늘: created_at이 오늘
어제: created_at이 어제
지난 7일: 2~7일 전
지난 30일: 8~30일 전
이후: 월별 그룹 (예: "2025년 3월", "2025년 2월", ...)
```

### API Endpoints
```
GET /api/conversations?offset=0&limit=50
Response: {
  conversations: Array<{ uuid, name, summary, created_at, updated_at, first_message_preview }>,
  total: number,
  hasMore: boolean
}
```

### Edge Cases
- **빈 대화 제목**: name이 빈 문자열이면 첫 human 메시지의 앞 50자를 표시
- **대화 0개**: "대화가 없습니다" 빈 상태 표시
- **동일 날짜 대화 다수**: 그룹 내에서 updated_at 내림차순 정렬

### Related Specs
- `search.md` (사이드바 상단 검색 필드)
- `chat-view.md` (대화 선택 시 우측 뷰)
- `layout-routing.md` (사이드바 위치 및 반응형)
