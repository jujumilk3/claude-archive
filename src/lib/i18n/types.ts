export interface TranslationKeys {
	'common.loading': string;
	'common.noTitle': string;
	'common.senderHuman': string;
	'common.senderAssistant': string;
	'common.clearSearch': string;

	'sidebar.searchPlaceholder': string;
	'sidebar.searchAriaLabel': string;
	'sidebar.recentSearches': string;
	'sidebar.deleteHistoryAriaLabel': string;
	'sidebar.searching': string;
	'sidebar.noResults': string;
	'sidebar.resultCount': string;
	'sidebar.noConversations': string;
	'sidebar.projects': string;
	'sidebar.closeSidebar': string;
	'sidebar.openSidebar': string;
	'sidebar.openSidebarShortcut': string;
	'sidebar.closeSidebarShortcut': string;

	'date.today': string;
	'date.yesterday': string;
	'date.last7days': string;
	'date.last30days': string;

	'chat.noMessages': string;
	'chat.exportAriaLabel': string;
	'chat.exportTitle': string;
	'chat.notFound': string;

	'home.conversations': string;
	'home.messages': string;
	'home.projects': string;
	'home.selectConversation': string;

	'error.notFound': string;
	'error.goHome': string;

	'projects.title': string;
	'projects.searchPlaceholder': string;
	'projects.searchAriaLabel': string;
	'projects.count': string;
	'projects.noProjects': string;
	'projects.noMatch': string;
	'projects.docCount': string;
	'projects.docsFetchError': string;
	'projects.noDocs': string;

	'message.thinking': string;
	'message.result': string;
	'message.resultError': string;
	'message.copy': string;
	'message.copied': string;

	'export.createdAt': string;
	'export.updatedAt': string;

	'settings.back': string;
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
	'settings.fontSizeSmall': string;
	'settings.fontSizeMedium': string;
	'settings.fontSizeLarge': string;
	'settings.data': string;
	'settings.export': string;
	'settings.exportDesc': string;
	'settings.exportAll': string;
	'settings.reset': string;
}

export type TranslationKey = keyof TranslationKeys;
export type Locale = 'ko' | 'en';
export type Translations = Record<TranslationKey, string>;
