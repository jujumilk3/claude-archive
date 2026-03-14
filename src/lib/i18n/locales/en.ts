import type { Translations } from '../types';

const en: Translations = {
	'common.loading': 'Loading...',
	'common.noTitle': '(Untitled)',
	'common.senderHuman': 'Me',
	'common.senderAssistant': 'Claude',
	'common.clearSearch': 'Clear search',

	'sidebar.searchPlaceholder': 'Search... (⌘K)',
	'sidebar.searchAriaLabel': 'Search conversations',
	'sidebar.recentSearches': 'Recent searches',
	'sidebar.deleteHistoryAriaLabel': 'Delete search history for {term}',
	'sidebar.searching': 'Searching...',
	'sidebar.noResults': 'No search results',
	'sidebar.resultCount': '{count} results',
	'sidebar.noConversations': 'No conversations',
	'sidebar.projects': 'Projects',
	'sidebar.closeSidebar': 'Close sidebar',
	'sidebar.openSidebar': 'Open sidebar',
	'sidebar.openSidebarShortcut': 'Open sidebar (⌘B)',
	'sidebar.closeSidebarShortcut': 'Close sidebar (⌘B)',

	'date.today': 'Today',
	'date.yesterday': 'Yesterday',
	'date.last7days': 'Last 7 days',
	'date.last30days': 'Last 30 days',

	'chat.noMessages': 'This conversation has no messages',
	'chat.exportAriaLabel': 'Export conversation to Markdown',
	'chat.exportTitle': 'Export as Markdown',
	'chat.notFound': 'Conversation not found',

	'home.conversations': 'Conversations',
	'home.messages': 'Messages',
	'home.projects': 'Projects',
	'home.selectConversation': 'Select a conversation',

	'error.notFound': 'Page not found',
	'error.goHome': 'Go back to home',

	'projects.title': 'Projects',
	'projects.searchPlaceholder': 'Search projects...',
	'projects.searchAriaLabel': 'Search projects',
	'projects.count': '{count}',
	'projects.noProjects': 'No projects',
	'projects.noMatch': 'No matching projects',
	'projects.docCount': '{count} documents',
	'projects.docsFetchError': 'Failed to load documents',
	'projects.noDocs': 'No documents',

	'message.thinking': 'Thinking',
	'message.result': 'Result',
	'message.resultError': '(error)',
	'message.copy': 'Copy',
	'message.copied': 'Copied!',

	'export.createdAt': 'Created',
	'export.updatedAt': 'Updated',

	'settings.back': 'Back',
	'settings.title': 'Settings',
	'settings.general': 'General',
	'settings.language': 'Language',
	'settings.languageDesc': 'Select interface language',
	'settings.appearance': 'Appearance',
	'settings.theme': 'Theme',
	'settings.themeLight': 'Light',
	'settings.themeDark': 'Dark',
	'settings.themeSystem': 'System',
	'settings.fontSize': 'Font Size',
	'settings.fontSizeSmall': 'Small',
	'settings.fontSizeMedium': 'Medium',
	'settings.fontSizeLarge': 'Large',
	'settings.data': 'Data',
	'settings.export': 'Export',
	'settings.exportDesc': 'Download all conversations',
	'settings.exportAll': 'Export All',
	'settings.reset': 'Reset to defaults'
};

export default en;
