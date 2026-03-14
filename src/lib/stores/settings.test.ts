import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

const SETTINGS_KEY = 'claude-archive-settings';

let mockStorage: Record<string, string> = {};

vi.stubGlobal('localStorage', {
	getItem: (key: string) => mockStorage[key] ?? null,
	setItem: (key: string, value: string) => { mockStorage[key] = value; },
	removeItem: (key: string) => { delete mockStorage[key]; }
});

vi.stubGlobal('window', {
	matchMedia: (query: string) => ({
		matches: query.includes('dark'),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn()
	})
});

vi.stubGlobal('document', {
	documentElement: {
		setAttribute: vi.fn(),
		style: { fontSize: '' }
	}
});

describe('settings store', () => {
	beforeEach(async () => {
		mockStorage = {};
		vi.resetModules();
	});

	async function importSettings() {
		return await import('./settings');
	}

	it('loads default settings when localStorage is empty', async () => {
		const { settings } = await importSettings();
		const s = get(settings);
		expect(s.theme).toBe('system');
		expect(s.fontSize).toBe('medium');
	});

	it('loads settings from localStorage', async () => {
		mockStorage[SETTINGS_KEY] = JSON.stringify({ theme: 'dark', fontSize: 'large', language: 'en' });
		const { settings } = await importSettings();
		const s = get(settings);
		expect(s.theme).toBe('dark');
		expect(s.fontSize).toBe('large');
	});

	it('falls back to defaults on invalid theme value', async () => {
		mockStorage[SETTINGS_KEY] = JSON.stringify({ theme: 'invalid', fontSize: 'small' });
		const { settings } = await importSettings();
		const s = get(settings);
		expect(s.theme).toBe('system');
		expect(s.fontSize).toBe('small');
	});

	it('falls back to defaults on invalid fontSize value', async () => {
		mockStorage[SETTINGS_KEY] = JSON.stringify({ theme: 'light', fontSize: 'huge' });
		const { settings } = await importSettings();
		const s = get(settings);
		expect(s.theme).toBe('light');
		expect(s.fontSize).toBe('medium');
	});

	it('falls back to defaults on corrupted JSON', async () => {
		mockStorage[SETTINGS_KEY] = 'not-json';
		const { settings } = await importSettings();
		const s = get(settings);
		expect(s.theme).toBe('system');
		expect(s.fontSize).toBe('medium');
	});

	it('saves settings to localStorage on update', async () => {
		const { settings } = await importSettings();
		settings.set({ theme: 'dark', fontSize: 'large' });
		const stored = JSON.parse(mockStorage[SETTINGS_KEY]);
		expect(stored.theme).toBe('dark');
		expect(stored.fontSize).toBe('large');
	});

	it('preserves language field when saving', async () => {
		mockStorage[SETTINGS_KEY] = JSON.stringify({ language: 'en' });
		const { settings } = await importSettings();
		settings.set({ theme: 'light', fontSize: 'small' });
		const stored = JSON.parse(mockStorage[SETTINGS_KEY]);
		expect(stored.language).toBe('en');
		expect(stored.theme).toBe('light');
		expect(stored.fontSize).toBe('small');
	});

	it('resolvedTheme returns dark when system prefers dark', async () => {
		const { settings, resolvedTheme } = await importSettings();
		settings.set({ theme: 'system', fontSize: 'medium' });
		expect(get(resolvedTheme)).toBe('dark');
	});

	it('resolvedTheme returns the explicit theme when not system', async () => {
		const { settings, resolvedTheme } = await importSettings();
		settings.set({ theme: 'light', fontSize: 'medium' });
		expect(get(resolvedTheme)).toBe('light');
	});

	it('applyTheme sets data-mode attribute', async () => {
		const { applyTheme } = await importSettings();
		applyTheme('light');
		expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-mode', 'light');
	});

	it('applyFontSize sets document font size', async () => {
		const { applyFontSize } = await importSettings();
		applyFontSize('small');
		expect(document.documentElement.style.fontSize).toBe('14px');
		applyFontSize('medium');
		expect(document.documentElement.style.fontSize).toBe('16px');
		applyFontSize('large');
		expect(document.documentElement.style.fontSize).toBe('18px');
	});

	it('resetSettings restores defaults', async () => {
		const { settings, resetSettings } = await importSettings();
		settings.set({ theme: 'dark', fontSize: 'large' });
		resetSettings();
		const s = get(settings);
		expect(s.theme).toBe('system');
		expect(s.fontSize).toBe('medium');
	});

	it('FONT_SIZE_MAP has correct values', async () => {
		const { FONT_SIZE_MAP } = await importSettings();
		expect(FONT_SIZE_MAP).toEqual({
			small: '14px',
			medium: '16px',
			large: '18px'
		});
	});

	it('DEFAULT_SETTINGS has correct values', async () => {
		const { DEFAULT_SETTINGS } = await importSettings();
		expect(DEFAULT_SETTINGS).toEqual({
			theme: 'system',
			fontSize: 'medium'
		});
	});
});
