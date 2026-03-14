import { writable, derived } from 'svelte/store';
import type { TranslationKey, Locale, Translations } from './types';
import ko from './locales/ko';
import en from './locales/en';

const translations: Record<Locale, Translations> = { ko, en };

const SETTINGS_KEY = 'claude-archive-settings';

function loadLocale(): Locale {
	if (typeof localStorage === 'undefined') return 'ko';
	try {
		const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
		if (settings.language === 'ko' || settings.language === 'en') return settings.language;
	} catch {
		// fall through
	}
	return 'ko';
}

function saveLocale(loc: Locale): void {
	if (typeof localStorage === 'undefined') return;
	try {
		const raw = localStorage.getItem(SETTINGS_KEY);
		const settings = raw ? JSON.parse(raw) : {};
		settings.language = loc;
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
	} catch {
		// ignore
	}
}

export const locale = writable<Locale>(loadLocale());

locale.subscribe((loc) => saveLocale(loc));

export const t = derived(locale, ($locale) => {
	const strings = translations[$locale];
	const pluralRules = new Intl.PluralRules($locale);
	return (key: TranslationKey, params?: Record<string, string | number>): string => {
		let text = strings[key] ?? key;
		if (params && 'count' in params) {
			const category = pluralRules.select(Number(params.count));
			const pluralKey = `${key}_${category}` as TranslationKey;
			if (strings[pluralKey]) {
				text = strings[pluralKey];
			}
		}
		if (params) {
			for (const [k, v] of Object.entries(params)) {
				text = text.replaceAll(`{${k}}`, String(v));
			}
		}
		return text;
	};
});

export function formatDate(date: Date, loc: Locale, options?: Intl.DateTimeFormatOptions): string {
	return new Intl.DateTimeFormat(loc, options ?? { dateStyle: 'long' }).format(date);
}

export function formatMonthYear(date: Date, loc: Locale): string {
	return new Intl.DateTimeFormat(loc, { year: 'numeric', month: 'long' }).format(date);
}

export function formatNumber(n: number, loc: Locale): string {
	return new Intl.NumberFormat(loc).format(n);
}

export function formatTimestamp(isoDate: string, loc: Locale): string {
	return new Intl.DateTimeFormat(loc, {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	}).format(new Date(isoDate));
}

export function formatShortDate(isoDate: string, loc: Locale): string {
	return new Intl.DateTimeFormat(loc, {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	}).format(new Date(isoDate));
}

export function formatRelativeTime(date: Date, loc: Locale): string {
	const now = Date.now();
	const diffMs = date.getTime() - now;
	const absDiffSec = Math.abs(diffMs) / 1000;

	const units: [Intl.RelativeTimeFormatUnit, number][] = [
		['year', 365 * 24 * 60 * 60],
		['month', 30 * 24 * 60 * 60],
		['week', 7 * 24 * 60 * 60],
		['day', 24 * 60 * 60],
		['hour', 60 * 60],
		['minute', 60],
		['second', 1]
	];

	const rtf = new Intl.RelativeTimeFormat(loc, { numeric: 'auto' });

	for (const [unit, threshold] of units) {
		if (absDiffSec >= threshold) {
			const value = Math.round(diffMs / 1000 / threshold);
			return rtf.format(value, unit);
		}
	}

	return rtf.format(0, 'second');
}

export function senderLabel(sender: string, loc: Locale): string {
	return sender === 'human' ? translations[loc]['common.senderHuman'] : translations[loc]['common.senderAssistant'];
}

export function getTranslation(key: TranslationKey, loc: Locale, params?: Record<string, string | number>): string {
	const strings = translations[loc];
	let text = strings[key] ?? key;
	if (params && 'count' in params) {
		const rules = new Intl.PluralRules(loc);
		const category = rules.select(Number(params.count));
		const pluralKey = `${key}_${category}` as TranslationKey;
		if (strings[pluralKey]) {
			text = strings[pluralKey];
		}
	}
	if (params) {
		for (const [k, v] of Object.entries(params)) {
			text = text.replaceAll(`{${k}}`, String(v));
		}
	}
	return text;
}

export const availableLocales: { code: Locale; name: string }[] = [
	{ code: 'ko', name: '한국어' },
	{ code: 'en', name: 'English' }
];

export type { TranslationKey, Locale, Translations };
