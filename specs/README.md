# Claude Archive - Specifications Index

## Project Overview
Claude 웹에서 export한 대화 데이터를 기반으로, 실제 claude.ai와 거의 동일한 UI/UX로 과거 대화를 브라우징하고 검색할 수 있는 아카이브 뷰어.

## Tech Stack
- **Frontend**: SvelteKit + TypeScript
- **Database**: SQLite (better-sqlite3)
- **Styling**: Tailwind CSS (다크모드 only)
- **Data Pipeline**: 빌드타임 JSON → SQLite 전처리

## Active Specs

### Data Layer
- [Data Pipeline](data-pipeline.md) - JSON export → SQLite 전처리 및 증분 업데이트
- [Database Schema](database-schema.md) - SQLite 스키마 및 FTS5 인덱스 설계

### Core UI
- [Sidebar](sidebar.md) - 대화 목록 사이드바 (날짜별 그룹핑, 무한 스크롤)
- [Chat View](chat-view.md) - 대화 메시지 렌더링 (마크다운, 코드블록, tool 메시지)
- [Search](search.md) - Full-text 검색 및 메시지 레벨 점프

### Supporting
- [Projects View](projects-view.md) - 프로젝트 목록 표시
- [Layout & Routing](layout-routing.md) - 전체 레이아웃 및 SvelteKit 라우팅

## Parking Lot
- 시맨틱 검색 (임베딩 기반)
- 대화 즐겨찾기/태그
- 대화 내용 export (PDF, markdown)
- 프로젝트-대화 자동 매칭
