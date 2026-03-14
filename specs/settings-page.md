# Settings Page

## What
앱 전체 설정을 관리하는 독립 페이지(/settings). 언어, 테마, 표시 설정 등 대화 기능과 무관한 설정 항목을 섹션별로 구분하여 제공.

## Why
사용자가 아카이브 뷰어를 자신의 선호에 맞게 커스터마이즈할 수 있어야 한다. 언어 전환과 테마 전환은 접근성과 사용 편의의 핵심 기능.

## Acceptance Criteria

### Must Have
- [ ] `/settings` 라우트로 접근 가능
- [ ] General 섹션: 언어 선택 (드롭다운)
- [ ] Appearance 섹션: 테마 선택 (Light / Dark / System)
- [ ] 설정 변경 시 즉시 적용 (프리뷰 반영)
- [ ] 설정값 localStorage에 자동 저장
- [ ] 사이드바에서 Settings 링크 접근 가능
- [ ] 뒤로가기 버튼 또는 네비게이션으로 이전 페이지 복귀

### Should Have
- [ ] Appearance 섹션: 폰트 크기 조절 (Small / Medium / Large)
- [ ] Data 섹션: 전체 내보내기 버튼
- [ ] 설정 초기화 (Reset to defaults) 버튼
- [ ] 키보드 접근성 (Tab 네비게이션, Enter 선택)

### Won't Have (This Iteration)
- [ ] 계정 관련 설정
- [ ] 알림 설정
- [ ] 키보드 단축키 커스터마이즈
- [ ] 데이터 삭제/관리

## Context

### User Flow
1. 사이드바 하단 또는 메뉴에서 "Settings" 클릭
2. `/settings` 페이지로 이동
3. 섹션별 설정 항목 확인 및 변경
4. 변경 즉시 반영 (별도 저장 버튼 없음)
5. 사이드바 또는 뒤로가기로 이전 페이지 복귀

### Page Layout
```
/settings
┌──────────────────────────────────┐
│  ← Settings                      │
│                                  │
│  ── General ───────────────────  │
│                                  │
│  Language                        │
│  Select interface language       │
│  ┌──────────────────────┐        │
│  │ 한국어            ▼  │        │
│  └──────────────────────┘        │
│                                  │
│  ── Appearance ────────────────  │
│                                  │
│  Theme                           │
│  ┌────────┬────────┬──────────┐  │
│  │ Light  │ Dark   │ System   │  │
│  └────────┴────────┴──────────┘  │
│                                  │
│  Font Size                       │
│  ┌──────────────────────┐        │
│  │ Medium            ▼  │        │
│  └──────────────────────┘        │
│                                  │
│  ── Data ──────────────────────  │
│                                  │
│  Export                          │
│  Download all conversations      │
│  ┌──────────────┐                │
│  │ Export All    │                │
│  └──────────────┘                │
│                                  │
│  ─────────────────────────────── │
│  Reset to defaults               │
└──────────────────────────────────┘
```

### Settings Schema (localStorage)
```typescript
interface AppSettings {
  language: 'ko' | 'en';  // 확장 가능
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
}

const DEFAULT_SETTINGS: AppSettings = {
  language: 'ko',
  theme: 'system',
  fontSize: 'medium',
};
```

localStorage key: `claude-archive-settings`

### Theme Selection Behavior
- **Light**: `data-mode="light"` 고정
- **Dark**: `data-mode="dark"` 고정
- **System**: `prefers-color-scheme` media query 따름, OS 변경 시 자동 반영

### Font Size Mapping
| Setting | Base Size | Scale |
|---------|-----------|-------|
| Small | 14px | 0.875 |
| Medium | 16px | 1.0 (기본) |
| Large | 18px | 1.125 |

### Edge Cases
- **localStorage 사용 불가**: 기본값으로 동작, 설정 저장 실패 시 무시
- **System 테마 + OS 전환**: matchMedia 이벤트 리스너로 실시간 반영
- **잘못된 localStorage 값**: 파싱 실패 시 기본값으로 폴백
- **SSR 시 테마 깜빡임**: `<head>` 인라인 스크립트로 data-mode 즉시 설정하여 FOUC 방지

### Route Structure 변경
```
src/routes/
├── settings/
│   ├── +page.svelte    # 설정 페이지 UI
│   └── +page.ts        # (필요시) 클라이언트 사이드 로직
```

### Related Specs
- `design-system-claude.md` (테마 색상 토큰)
- `language-i18n.md` (언어 전환 시스템)
- `layout-routing.md` (라우트 추가, 사이드바 링크)

## Examples

### Example 1: 테마를 Dark로 변경
1. Appearance 섹션의 Theme에서 "Dark" 클릭
2. 즉시 전체 UI가 다크모드로 전환
3. localStorage에 `{"theme": "dark", ...}` 저장
4. 다음 방문 시 다크모드 유지

### Example 2: 언어를 English로 변경
1. General 섹션의 Language에서 "English" 선택
2. 즉시 모든 UI 문자열이 영어로 전환
3. 날짜 포맷이 "Mar 14, 2026" 형식으로 변경
4. 숫자 포맷이 "1,234" (영어 locale)로 변경
