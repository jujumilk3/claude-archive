import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	locale,
	t,
	formatDate,
	formatMonthYear,
	formatNumber,
	formatTimestamp,
	formatShortDate,
	formatRelativeTime,
	senderLabel,
	getTranslation,
	availableLocales
} from './index';
import type { TranslationKey } from './types';
import ko from './locales/ko';
import en from './locales/en';

beforeEach(() => {
	locale.set('ko');
});

describe('t store', () => {
	it('returns Korean translations by default', () => {
		const $t = get(t);
		expect($t('common.loading')).toBe('로딩 중...');
		expect($t('common.noTitle')).toBe('(제목 없음)');
	});

	it('switches to English when locale changes', () => {
		locale.set('en');
		const $t = get(t);
		expect($t('common.loading')).toBe('Loading...');
		expect($t('common.noTitle')).toBe('(Untitled)');
	});

	it('interpolates parameters', () => {
		const $t = get(t);
		expect($t('sidebar.resultCount', { count: 42 })).toBe('42개 결과');
		locale.set('en');
		const $tEn = get(t);
		expect($tEn('sidebar.resultCount', { count: 42 })).toBe('42 results');
	});

	it('returns key as fallback for missing translations', () => {
		const $t = get(t);
		const bogusKey = 'nonexistent.key' as TranslationKey;
		expect($t(bogusKey)).toBe('nonexistent.key');
	});

	it('is reactive to locale changes', () => {
		let $t = get(t);
		expect($t('chat.noMessages')).toBe('이 대화에는 메시지가 없습니다');
		locale.set('en');
		$t = get(t);
		expect($t('chat.noMessages')).toBe('This conversation has no messages');
	});
});

describe('getTranslation', () => {
	it('returns translation for given locale without store', () => {
		expect(getTranslation('common.loading', 'ko')).toBe('로딩 중...');
		expect(getTranslation('common.loading', 'en')).toBe('Loading...');
	});

	it('interpolates parameters', () => {
		expect(getTranslation('projects.docCount', 'ko', { count: 5 })).toBe('5개 문서');
		expect(getTranslation('projects.docCount', 'en', { count: 5 })).toBe('5 documents');
	});

	it('returns key for missing translation', () => {
		const bogusKey = 'missing.key' as TranslationKey;
		expect(getTranslation(bogusKey, 'ko')).toBe('missing.key');
	});
});

describe('formatDate', () => {
	const date = new Date('2026-03-14T10:30:00Z');

	it('formats with Korean locale', () => {
		const result = formatDate(date, 'ko');
		expect(result).toContain('2026');
		expect(result).toContain('3');
		expect(result).toContain('14');
	});

	it('formats with English locale', () => {
		const result = formatDate(date, 'en');
		expect(result).toContain('2026');
		expect(result).toContain('March');
		expect(result).toContain('14');
	});

	it('accepts custom DateTimeFormatOptions', () => {
		const result = formatDate(date, 'en', { dateStyle: 'short' });
		expect(result).toContain('3/14/26');
	});
});

describe('formatMonthYear', () => {
	const date = new Date('2026-07-15T00:00:00Z');

	it('formats Korean month-year', () => {
		const result = formatMonthYear(date, 'ko');
		expect(result).toContain('2026');
		expect(result).toContain('7월');
	});

	it('formats English month-year', () => {
		const result = formatMonthYear(date, 'en');
		expect(result).toContain('July');
		expect(result).toContain('2026');
	});
});

describe('formatNumber', () => {
	it('formats numbers with Korean locale', () => {
		expect(formatNumber(1234567, 'ko')).toBe('1,234,567');
	});

	it('formats numbers with English locale', () => {
		expect(formatNumber(1234567, 'en')).toBe('1,234,567');
	});

	it('handles zero', () => {
		expect(formatNumber(0, 'ko')).toBe('0');
	});
});

describe('formatTimestamp', () => {
	it('includes date and time components for Korean', () => {
		const result = formatTimestamp('2026-03-14T09:30:00Z', 'ko');
		expect(result).toContain('2026');
		expect(result).toContain('03');
		expect(result).toContain('14');
	});

	it('includes date and time components for English', () => {
		const result = formatTimestamp('2026-03-14T09:30:00Z', 'en');
		expect(result).toContain('2026');
		expect(result).toContain('03');
		expect(result).toContain('14');
	});
});

describe('formatShortDate', () => {
	it('formats Korean short date', () => {
		const result = formatShortDate('2026-03-14T00:00:00Z', 'ko');
		expect(result).toContain('2026');
		expect(result).toContain('3');
		expect(result).toContain('14');
	});

	it('formats English short date', () => {
		const result = formatShortDate('2026-03-14T00:00:00Z', 'en');
		expect(result).toContain('March');
		expect(result).toContain('14');
		expect(result).toContain('2026');
	});
});

describe('formatRelativeTime', () => {
	it('formats hours ago in Korean', () => {
		const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
		const result = formatRelativeTime(twoHoursAgo, 'ko');
		expect(result).toContain('2');
		expect(result).toContain('시간');
	});

	it('formats hours ago in English', () => {
		const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
		const result = formatRelativeTime(twoHoursAgo, 'en');
		expect(result).toContain('2');
		expect(result).toContain('hours');
	});

	it('formats days ago', () => {
		const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
		const result = formatRelativeTime(threeDaysAgo, 'en');
		expect(result).toContain('3');
		expect(result).toContain('day');
	});

	it('formats minutes ago', () => {
		const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
		const result = formatRelativeTime(fiveMinAgo, 'en');
		expect(result).toContain('5');
		expect(result).toContain('minute');
	});
});

describe('senderLabel', () => {
	it('returns Korean labels', () => {
		expect(senderLabel('human', 'ko')).toBe('나');
		expect(senderLabel('assistant', 'ko')).toBe('Claude');
	});

	it('returns English labels', () => {
		expect(senderLabel('human', 'en')).toBe('Me');
		expect(senderLabel('assistant', 'en')).toBe('Claude');
	});
});

describe('availableLocales', () => {
	it('contains ko and en', () => {
		expect(availableLocales).toHaveLength(2);
		expect(availableLocales.find((l) => l.code === 'ko')?.name).toBe('한국어');
		expect(availableLocales.find((l) => l.code === 'en')?.name).toBe('English');
	});
});

describe('locale files completeness', () => {
	const koKeys = Object.keys(ko) as TranslationKey[];
	const enKeys = Object.keys(en) as TranslationKey[];

	it('ko and en have the same keys', () => {
		expect(koKeys.sort()).toEqual(enKeys.sort());
	});

	it('no translation value is empty string', () => {
		for (const key of koKeys) {
			expect(ko[key], `ko.${key} should not be empty`).not.toBe('');
			expect(en[key], `en.${key} should not be empty`).not.toBe('');
		}
	});

	it('message keys exist in both locales', () => {
		const messageKeys: TranslationKey[] = [
			'message.thinking',
			'message.result',
			'message.resultError',
			'message.copy',
			'message.copied'
		];
		for (const key of messageKeys) {
			expect(ko[key], `ko missing ${key}`).toBeDefined();
			expect(en[key], `en missing ${key}`).toBeDefined();
		}
	});
});
