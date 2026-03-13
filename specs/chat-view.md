# Chat View

## What
선택된 대화의 메시지를 Claude 웹과 동일한 형태로 렌더링하는 메인 영역. 마크다운, 코드블록, tool_use/tool_result 메시지를 지원.

## Why
사용자가 과거 Claude 대화를 실제 claude.ai에서 보는 것과 동일한 경험으로 열람할 수 있어야 한다. 특히 코드 관련 대화가 많으므로 코드블록 렌더링 품질이 중요하다.

## Acceptance Criteria

### Must Have
- [ ] Claude 웹과 동일한 메시지 버블 레이아웃 (human: 우측 정렬, assistant: 좌측)
- [ ] 마크다운 렌더링: 헤딩, 볼드/이탤릭, 리스트, 링크, 인라인 코드, 테이블
- [ ] 코드블록: 구문 강조, 언어 라벨, 복사 버튼, 라인 넘버
- [ ] tool_use 메시지: 접기/펼치기 토글, tool 이름 표시, input JSON 표시
- [ ] tool_result 메시지: 접기/펼치기 토글, 결과 내용 표시
- [ ] 기본적으로 tool 메시지는 접힌 상태
- [ ] 메시지 간 자연스러운 간격과 구분
- [ ] 대화 상단에 대화 제목 표시

### Should Have
- [ ] 메시지 타임스탬프 표시 (hover 시)
- [ ] 코드블록 내 언어별 구문 강조 (Python, TypeScript, JavaScript, SQL, bash 등)
- [ ] 긴 대화에서의 스크롤 성능 최적화
- [ ] 메시지 로딩 시 스켈레톤 UI

### Won't Have (This Iteration)
- [ ] 메시지 편집/삭제
- [ ] 대화 이어서 계속하기 (새 메시지 전송)
- [ ] 아티팩트(artifact) 렌더링 (별도 패널)
- [ ] 이미지/파일 첨부 미리보기

## Context

### Message Rendering Flow
1. 대화 UUID로 메시지 목록 조회
2. 각 메시지의 `sender`에 따라 레이아웃 결정
3. `content` 배열 순회하며 type별 렌더링:
   - `text`: 마크다운으로 렌더링
   - `tool_use`: 접기/펼치기 블록으로 렌더링
   - `tool_result`: 접기/펼치기 블록으로 렌더링
4. 하나의 message 안에 여러 content가 있을 수 있음 (text + tool_use 혼합)

### Content Type Rendering

#### text
```svelte
<!-- 마크다운 렌더링 -->
<div class="prose prose-invert">
  {@html renderMarkdown(content.text)}
</div>
```

#### tool_use
```svelte
<!-- Claude 스타일 접기/펼치기 -->
<details class="tool-block">
  <summary>🔧 {content.name}</summary>
  <pre>{JSON.stringify(content.input, null, 2)}</pre>
</details>
```

#### tool_result
```svelte
<!-- 결과 접기/펼치기 -->
<details class="tool-result-block">
  <summary>📋 Result</summary>
  <div>{content.content}</div>
</details>
```

### Code Block Features
- 우측 상단: 언어 라벨 (예: "python", "typescript")
- 우측 상단: 복사 버튼 (클릭 시 클립보드 복사 + "Copied!" 피드백)
- 구문 강조: Shiki 또는 highlight.js 사용
- 다크 테마에 맞는 코드 컬러 스킴

### API Endpoints
```
GET /api/conversations/:uuid/messages
Response: {
  conversation: { uuid, name, created_at },
  messages: Array<{
    uuid, text, content_json, sender, created_at, message_order, has_tool_use
  }>
}
```

### Edge Cases
- **빈 대화**: "이 대화에는 메시지가 없습니다" 표시
- **매우 긴 코드블록**: 최대 높이 제한 + 스크롤
- **중첩 마크다운**: 리스트 안 코드블록 등 중첩 구조 처리
- **tool_use 연속**: assistant 메시지에 tool_use → tool_result → text 순서로 여러 content
- **한국어/영어 혼합**: 폰트가 양쪽 모두 깨끗하게 렌더링

### Related Specs
- `search.md` (검색 결과에서 특정 메시지로 점프)
- `sidebar.md` (대화 선택 시 이 뷰 로드)
- `layout-routing.md` (`/chat/:uuid` 라우트)
