# Layout & Routing

## What
SvelteKit 기반의 전체 앱 레이아웃과 라우팅 구조. Claude 웹과 동일한 사이드바 + 메인 컨텐츠 레이아웃.

## Why
Claude 웹과 동일한 네비게이션 패턴을 제공하여 사용자가 익숙하게 사용할 수 있어야 한다. URL 기반 라우팅으로 특정 대화를 북마크하거나 직접 접근 가능.

## Acceptance Criteria

### Must Have
- [ ] 사이드바(좌측) + 메인 컨텐츠(우측) 2컬럼 레이아웃
- [ ] `/` → 홈 (대화 미선택 상태, 빈 메인 영역)
- [ ] `/chat/:uuid` → 특정 대화 표시
- [ ] `/chat/:uuid?highlight=:messageUuid` → 특정 메시지로 점프
- [ ] 다크모드 전용 테마 (Claude 다크 테마 색상)
- [ ] 사이드바 접기/펼치기 토글 버튼

### Should Have
- [ ] `/projects` → 프로젝트 목록 뷰
- [ ] 모바일 반응형 (사이드바 오버레이)
- [ ] 키보드 단축키: `Cmd+K` (검색), `Cmd+B` (사이드바 토글)

### Won't Have (This Iteration)
- [ ] 다중 탭/패널
- [ ] 라이트모드
- [ ] 설정 페이지

## Context

### Route Structure
```
src/routes/
├── +layout.svelte          # 사이드바 + 메인 영역 레이아웃
├── +layout.server.ts       # 사이드바용 초기 대화 목록 로드
├── +page.svelte            # 홈 (대화 미선택)
├── chat/
│   └── [uuid]/
│       ├── +page.svelte    # 대화 뷰
│       └── +page.server.ts # 대화 메시지 로드
├── projects/
│   ├── +page.svelte        # 프로젝트 목록
│   └── +page.server.ts     # 프로젝트 데이터 로드
└── api/
    ├── conversations/+server.ts  # 사이드바 대화 목록 API
    ├── search/+server.ts         # 검색 API
    └── conversations/[uuid]/messages/+server.ts  # 대화 메시지 API
```

### Color Scheme (Claude Dark Theme)
```css
--bg-primary: #2b2a27;      /* 메인 배경 */
--bg-sidebar: #1f1f1e;      /* 사이드바 배경 */
--bg-message-human: #3d3929; /* 사용자 메시지 배경 */
--text-primary: #ececec;     /* 기본 텍스트 */
--text-secondary: #a3a3a3;   /* 보조 텍스트 */
--accent: #da7756;           /* Claude 오렌지 액센트 */
--border: #3e3e3a;           /* 구분선 */
--code-bg: #1e1e1e;          /* 코드 블록 배경 */
```

### Layout Behavior
- 사이드바 기본 너비: 260px
- 사이드바 접힌 상태: 0px (완전 숨김)
- 메인 컨텐츠: 최대 너비 제한 (768px), 가운데 정렬
- 메시지 영역: 상하 스크롤, 하단에서 시작하지 않음 (아카이브이므로 상단부터)

### Edge Cases
- **존재하지 않는 UUID**: `/chat/invalid-uuid` → 404 페이지 또는 "대화를 찾을 수 없습니다"
- **사이드바 토글 상태**: localStorage에 저장하여 새로고침 시 유지
- **브라우저 뒤로가기**: SvelteKit 기본 히스토리 동작

### Related Specs
- `sidebar.md` (좌측 사이드바 컴포넌트)
- `chat-view.md` (우측 메인 영역 컴포넌트)
- `projects-view.md` (프로젝트 라우트)
