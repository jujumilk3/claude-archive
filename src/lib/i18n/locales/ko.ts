import type { Translations } from '../types';

const ko: Translations = {
	'common.loading': '로딩 중...',
	'common.noTitle': '(제목 없음)',
	'common.senderHuman': '나',
	'common.senderAssistant': 'Claude',
	'common.clearSearch': '검색 지우기',

	'sidebar.searchPlaceholder': '검색... (⌘K)',
	'sidebar.searchAriaLabel': '대화 검색',
	'sidebar.recentSearches': '최근 검색',
	'sidebar.deleteHistoryAriaLabel': '{term} 검색 기록 삭제',
	'sidebar.searching': '검색 중...',
	'sidebar.noResults': '검색 결과가 없습니다',
	'sidebar.resultCount': '{count}개 결과',
	'sidebar.resultCount_one': '{count}개 결과',
	'sidebar.noConversations': '대화가 없습니다',
	'sidebar.projects': '프로젝트',
	'sidebar.closeSidebar': '사이드바 닫기',
	'sidebar.openSidebar': '사이드바 열기',
	'sidebar.openSidebarShortcut': '사이드바 열기 (⌘B)',
	'sidebar.closeSidebarShortcut': '사이드바 닫기 (⌘B)',

	'date.today': '오늘',
	'date.yesterday': '어제',
	'date.last7days': '지난 7일',
	'date.last30days': '지난 30일',

	'chat.noMessages': '이 대화에는 메시지가 없습니다',
	'chat.exportAriaLabel': '대화를 Markdown으로 내보내기',
	'chat.exportTitle': 'Markdown으로 내보내기',
	'chat.notFound': '대화를 찾을 수 없습니다',

	'home.conversations': '대화',
	'home.messages': '메시지',
	'home.projects': '프로젝트',
	'home.selectConversation': '대화를 선택하세요',

	'error.notFound': '페이지를 찾을 수 없습니다',
	'error.goHome': '홈으로 돌아가기',

	'projects.title': '프로젝트',
	'projects.searchPlaceholder': '프로젝트 검색...',
	'projects.searchAriaLabel': '프로젝트 검색',
	'projects.count': '{count}개',
	'projects.noProjects': '프로젝트가 없습니다',
	'projects.noMatch': '일치하는 프로젝트가 없습니다',
	'projects.docCount': '{count}개 문서',
	'projects.docCount_one': '{count}개 문서',
	'projects.docsFetchError': '문서를 불러오는데 실패했습니다',
	'projects.noDocs': '문서가 없습니다',

	'message.thinking': '사고 중',
	'message.result': '결과',
	'message.resultError': '(오류)',
	'message.copy': '복사',
	'message.copied': '복사됨!',

	'export.createdAt': '생성일',
	'export.updatedAt': '수정일',

	'settings.back': '뒤로',
	'settings.title': '설정',
	'settings.general': '일반',
	'settings.language': '언어',
	'settings.languageDesc': '인터페이스 언어를 선택하세요',
	'settings.appearance': '외관',
	'settings.theme': '테마',
	'settings.themeLight': '라이트',
	'settings.themeDark': '다크',
	'settings.themeSystem': '시스템',
	'settings.fontSize': '글꼴 크기',
	'settings.fontSizeSmall': '작게',
	'settings.fontSizeMedium': '보통',
	'settings.fontSizeLarge': '크게',
	'settings.data': '데이터',
	'settings.export': '내보내기',
	'settings.exportDesc': '모든 대화를 다운로드합니다',
	'settings.exportAll': '전체 내보내기',
	'settings.reset': '설정 초기화'
};

export default ko;
