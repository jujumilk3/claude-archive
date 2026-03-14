# Design System - Claude.ai Pixel-Perfect 복제

## What
Claude.ai의 디자인 시스템(폰트, 색상, 간격, 레이아웃)을 pixel-perfect으로 복제하여 아카이브 뷰어에 적용하는 디자인 토큰 및 스타일 체계.

## Why
실제 Claude.ai에서 대화했던 경험과 동일한 시각적 환경을 제공하여 아카이브 열람 시 원본 대화와 자연스럽게 연결되는 경험을 만든다.

## Acceptance Criteria

### Must Have
- [ ] Anthropic Sans/Serif/Mono 폰트 로컬 호스팅 적용
- [ ] 라이트모드 + 다크모드 지원 (data-mode 속성 기반 전환)
- [ ] Claude.ai 동일 색상 토큰 시스템 (HSL 기반 시맨틱 변수)
- [ ] 메시지 타이포그래피 Claude.ai와 동일 (폰트, 크기, 행간, 자간, 굵기)
- [ ] 사이드바 레이아웃 Claude.ai와 동일 (288px 폭, 아이템 스타일)
- [ ] 컨텐츠 영역 max-width 768px, 가운데 정렬
- [ ] 사용자 메시지 버블 스타일 동일 (border-radius, padding, max-width)
- [ ] 헤더 높이 48px

### Should Have
- [ ] 코드 블록 스타일 Claude.ai와 동일
- [ ] 인라인 코드 스타일 동일
- [ ] 사이드바 hover/active 효과 동일
- [ ] 스크롤바 스타일 커스텀

### Won't Have (This Iteration)
- [ ] Artifact UI 복제
- [ ] 애니메이션/트랜지션 완전 동일화
- [ ] 반응형 브레이크포인트 완전 동일화

## Context

### Font System

Anthropic 자체 폰트 3종을 로컬 호스팅하여 사용:

| Font | Weight | 용도 |
|------|--------|------|
| Anthropic Sans | 300-800 (variable) | UI, 사용자 메시지, 사이드바 |
| Anthropic Serif | 300-800 (variable) | Claude 응답 본문 |
| Anthropic Mono | 400 | 코드 블록, 인라인 코드 |

```css
--font-ui: "Anthropic Sans", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
--font-serif: "Anthropic Serif", Georgia, "Times New Roman", serif;
--font-mono: "Anthropic Mono", ui-monospace, monospace;
```

woff2 파일은 `static/fonts/` 디렉터리에 배치:
- `anthropic-sans.woff2` (normal)
- `anthropic-sans-italic.woff2` (italic)
- `anthropic-serif.woff2` (normal)
- `anthropic-serif-italic.woff2` (italic)
- `anthropic-mono.woff2` (normal)
- `anthropic-mono-italic.woff2` (italic)

### Typography Tokens

**Claude 응답 텍스트 (Serif)**:
- font-family: var(--font-serif)
- font-size: 16px
- line-height: 24px (1.5)
- letter-spacing: normal
- font-weight: 400
- bold: font-weight 600

**사용자 메시지 텍스트 (Sans)**:
- font-family: var(--font-ui)
- font-size: 16px
- line-height: 22.4px (1.4)
- letter-spacing: normal
- font-weight: 430

**사이드바 아이템**:
- font-family: var(--font-ui)
- font-size: 12px
- line-height: 16px
- font-weight: 430
- 아이템 높이: 32px
- padding: 6px 16px

**Body 기본**:
- font-family: var(--font-ui)
- font-size: 16px
- line-height: 24px

### Color Token System (HSL 기반)

테마 전환은 `<html data-mode="light|dark">` 속성으로 제어.

#### Gray Scale (공통 팔레트)
```css
--_gray-0: 0 0% 100%;
--_gray-10: 60 14% 99%;
--_gray-20: 60 14% 97%;
--_gray-30: 60 10% 96%;
--_gray-40: 60 11% 95%;
--_gray-50: 45 12% 93%;
--_gray-100: 53 12% 87%;
--_gray-200: 55 9% 74%;
--_gray-350: 48 5% 57%;
--_gray-400: 45 3% 52%;
--_gray-500: 40 3% 42%;
--_gray-600: 45 3% 31%;
--_gray-700: 60 3% 21%;
--_gray-750: 60 2% 17%;
--_gray-800: 60 2% 12%;
--_gray-840: 60 2% 9%;
--_gray-860: 0 0% 7%;
--_gray-900: 0 0% 4%;
```

#### Semantic Tokens - Light Mode
```css
--bg-000: 0 0% 100%;                /* 순백 */
--bg-100: 48 33.3% 97.1%;           /* 메인 배경 rgb(250,249,245) */
--bg-200: 53 28.6% 94.5%;           /* 약간 어두운 배경 */
--bg-300: 48 25% 92.2%;             /* 사용자 버블 배경 rgb(240,238,230) */
--bg-400: 50 20.7% 88.6%;           /* 더 어두운 배경 */
--text-100: 60 2.6% 7.6%;           /* 기본 텍스트 rgb(20,20,19) */
--text-200: 60 2.5% 23.3%;          /* 보조 텍스트 */
--text-400: 51 3.1% 43.7%;          /* 비활성 텍스트 */
--border-100: 30 3.3% 11.8%;        /* 테두리 (15% 투명도로 사용) */
--accent-brand: 15 63.1% 59.6%;     /* Claude 오렌지 */
```

#### Semantic Tokens - Dark Mode
```css
--bg-000: var(--_gray-750);          /* rgb(43,43,41) 근접 */
--bg-100: var(--_gray-800);          /* 메인 배경 rgb(38,38,36) */
--bg-200: var(--_gray-840);          /* 약간 어두운 */
--bg-300: var(--_gray-860);          /* 사용자 버블 배경 rgb(20,20,19) */
--bg-400: var(--_gray-900);          /* 가장 어두운 */
--text-100: var(--_gray-20);         /* 기본 텍스트 rgb(250,249,245) */
--text-200: var(--_gray-200);        /* 보조 텍스트 */
--text-400: var(--_gray-350);        /* 비활성 텍스트 */
--border-100: var(--_gray-100);      /* 테두리 (15% 투명도로 사용) */
--accent-brand: var(--_brand-clay);  /* Claude 오렌지 동일 */
```

#### Additional Color Scales (추출 완료)
- `--_brand-clay`: 14.8 63.1% 59.6%
- `--_red-*`: 0~900 단계 (danger용)
- `--_orange-*`: 0~900 단계
- `--_yellow-*`: 0~900 단계 (warning용)
- `--_green-*`: 0~900 단계 (success용)
- `--_blue-*`: 0~900 단계 (accent용)
- `--_violet-*`: 0~900 단계 (pro accent용)
- `--_magenta-*`: 0~900 단계
- `--_aqua-*`: 0~900 단계

### Layout Dimensions

| Element | Value |
|---------|-------|
| 사이드바 폭 | 288px |
| 사이드바 border-right | 0.5px solid (border-100 at 15% opacity) |
| 컨텐츠 max-width | 768px (max-w-3xl) |
| 헤더 높이 | 48px |
| 사용자 버블 border-radius | 12px |
| 사용자 버블 padding | 10px 16px |
| 사용자 버블 max-width | 85% |
| 메시지 턴 간격 | margin-bottom: 4px |
| 사이드바 아이템 높이 | 32px |

### Theme Switching Mechanism

```html
<!-- Light mode (기본) -->
<html data-mode="light">

<!-- Dark mode -->
<html data-mode="dark">
```

CSS 구조:
```css
:root {
  /* 공통 팔레트 (gray, red, orange 등) */
}

[data-mode="light"], :root {
  /* 라이트모드 시맨틱 토큰 */
}

[data-mode="dark"] {
  /* 다크모드 시맨틱 토큰 오버라이드 */
}
```

### Edge Cases
- **시스템 테마 감지**: `prefers-color-scheme` media query로 초기값 결정 (사용자 설정 우선)
- **폰트 로딩 실패**: fallback 폰트 체인으로 graceful degradation
- **FOUC 방지**: `<head>`에서 localStorage 읽어 data-mode 즉시 설정

### Related Specs
- `settings-page.md` (테마 전환 UI)
- `layout-routing.md` (레이아웃 구조 업데이트 필요)
- `sidebar.md` (사이드바 스타일 업데이트)
- `chat-view.md` (메시지 스타일 업데이트)

## Examples

### Example 1: 라이트모드 Claude 응답
- 배경: rgb(250, 249, 245) - 따뜻한 오프화이트
- 텍스트: rgb(20, 20, 19) - 거의 검정
- 폰트: Anthropic Serif 16px/24px weight 400
- 볼드: Anthropic Serif weight 600

### Example 2: 다크모드 사용자 메시지
- 버블 배경: rgb(20, 20, 19) - 거의 검정
- 텍스트: rgb(250, 249, 245) - 거의 흰색
- 폰트: Anthropic Sans 16px/22.4px weight 430
- border-radius: 12px

## Open Questions
- [ ] 한국어 텍스트에서 Anthropic Sans/Serif의 CJK 글리프 지원 여부 확인 필요 (미지원 시 fallback 폰트 전략)
