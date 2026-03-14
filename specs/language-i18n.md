# Language & i18n

## What
UI 문자열과 날짜/숫자 포맷을 사용자 선택 언어에 맞게 전환하는 다국어 시스템. 처음에는 한국어/영어를 지원하되, 언어 파일만 추가하면 확장 가능한 구조.

## Why
글로벌 사용자 또는 영어 선호 사용자가 아카이브 뷰어를 편하게 사용할 수 있어야 한다. 대화 내용 자체는 번역하지 않지만, UI 크롬(라벨, 버튼, 메뉴 등)은 선택 언어로 표시.

## Acceptance Criteria

### Must Have
- [ ] 한국어(ko), English(en) 2개 언어 지원
- [ ] 모든 UI 문자열을 번역 키로 관리 (하드코딩 제거)
- [ ] 언어 전환 시 UI 문자열 즉시 반영
- [ ] 날짜 포맷 locale 연동 (ko: "3월 14일", en: "Mar 14")
- [ ] 숫자 포맷 locale 연동 (ko: "1,234", en: "1,234")
- [ ] 날짜 그룹핑 라벨 번역 ("오늘"/"Today", "어제"/"Yesterday" 등)
- [ ] 언어 파일만 추가하면 새 언어 지원 가능한 구조

### Should Have
- [ ] 상대 시간 표현 locale 연동 ("2시간 전" / "2 hours ago")
- [ ] 복수형 처리 (영어: "1 conversation" vs "2 conversations")
- [ ] 언어 선택 시 해당 언어의 네이티브 이름 표시 ("한국어", "English")

### Won't Have (This Iteration)
- [ ] 대화 내용 자동 번역
- [ ] RTL 언어 지원
- [ ] 브라우저 언어 자동 감지 (설정 페이지에서 수동 선택)

## Context

### Translation File Structure
```
src/lib/i18n/
├── index.ts           # i18n 유틸리티 (t 함수, locale 관리)
├── locales/
│   ├── ko.ts          # 한국어 번역
│   └── en.ts          # 영어 번역
└── types.ts           # 번역 키 타입 정의
```

### Translation Key Schema
```typescript
interface TranslationKeys {
  // Sidebar
  'sidebar.search': string;
  'sidebar.searchPlaceholder': string;
  'sidebar.projects': string;
  'sidebar.settings': string;
  'sidebar.noConversations': string;
  'sidebar.recentSearches': string;

  // Date groups
  'date.today': string;
  'date.yesterday': string;
  'date.last7days': string;
  'date.last30days': string;

  // Chat view
  'chat.thinking': string;
  'chat.result': string;
  'chat.copied': string;
  'chat.copyCode': string;
  'chat.export': string;
  'chat.exportMarkdown': string;

  // Projects
  'projects.title': string;
  'projects.searchPlaceholder': string;
  'projects.documents': string;

  // Home
  'home.conversations': string;
  'home.messages': string;
  'home.projects': string;

  // Settings
  'settings.title': string;
  'settings.general': string;
  'settings.language': string;
  'settings.languageDesc': string;
  'settings.appearance': string;
  'settings.theme': string;
  'settings.themeLight': string;
  'settings.themeDark': string;
  'settings.themeSystem': string;
  'settings.fontSize': string;
  'settings.data': string;
  'settings.export': string;
  'settings.exportDesc': string;
  'settings.exportAll': string;
  'settings.reset': string;

  // Common
  'common.loading': string;
  'common.error': string;
  'common.notFound': string;
}
```

### i18n Utility API
```typescript
// Svelte store 기반
import { locale, t } from '$lib/i18n';

// 컴포넌트에서 사용
$t('sidebar.search')           // "검색" 또는 "Search"
$t('home.conversations')       // "대화" 또는 "Conversations"

// 날짜 포맷
formatDate(date, $locale)      // "3월 14일" 또는 "Mar 14"
formatRelativeTime(date, $locale)  // "2시간 전" 또는 "2 hours ago"

// 숫자 포맷
formatNumber(1234, $locale)    // "1,234"
```

### Locale-Aware Formatting

**날짜**: `Intl.DateTimeFormat` 사용
```typescript
// ko: "2026년 3월 14일"
// en: "March 14, 2026"
new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date)

// 사이드바 그룹 헤더용 (월별)
// ko: "2026년 3월"
// en: "March 2026"
new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(date)
```

**숫자**: `Intl.NumberFormat` 사용
```typescript
// ko, en 모두: "1,234"
new Intl.NumberFormat(locale).format(1234)
```

**상대 시간**: `Intl.RelativeTimeFormat` 사용
```typescript
// ko: "2시간 전"
// en: "2 hours ago"
new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-2, 'hour')
```

### Adding a New Language

새 언어 추가 절차:
1. `src/lib/i18n/locales/ja.ts` 파일 생성
2. `TranslationKeys` 인터페이스의 모든 키에 대한 번역 제공
3. `src/lib/i18n/index.ts`에 import 추가
4. 설정 페이지 언어 목록에 자동 반영

### Edge Cases
- **번역 키 누락**: 키 자체를 fallback으로 표시 (`sidebar.search` → `"sidebar.search"`)
- **대화 내용 혼합 언어**: 대화 내용은 번역하지 않음, UI 크롬만 전환
- **날짜 그룹핑 라벨**: "오늘"/"어제" 등은 번역 키로 관리하되, 월별 그룹은 Intl API로 자동 생성
- **긴 번역 텍스트**: 영어가 한국어보다 길 수 있음 → UI가 텍스트 길이에 유연해야 함

### Related Specs
- `settings-page.md` (언어 선택 UI)
- `sidebar.md` (날짜 그룹 라벨, 검색 placeholder 등 번역 대상)
- `chat-view.md` (Thinking, Result 등 라벨 번역 대상)

## Examples

### Example 1: 한국어 사이드바
```
검색... (⌘K)
──────────────
오늘
  Claude 채팅 기록 보관 프로젝트...
어제
  Git SSH host key verification...
지난 7일
  macOS dotfiles 자동 동기화...
──────────────
프로젝트
설정
```

### Example 2: English 사이드바
```
Search... (⌘K)
──────────────
Today
  Claude 채팅 기록 보관 프로젝트...
Yesterday
  Git SSH host key verification...
Last 7 days
  macOS dotfiles 자동 동기화...
──────────────
Projects
Settings
```

(대화 제목은 원본 그대로, UI 라벨만 전환)

### Example 3: 날짜 포맷 차이
| Locale | 짧은 날짜 | 긴 날짜 | 월별 그룹 |
|--------|-----------|---------|-----------|
| ko | 3월 14일 | 2026년 3월 14일 | 2026년 3월 |
| en | Mar 14 | March 14, 2026 | March 2026 |
