import { writable, derived } from 'svelte/store';

export type Theme = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'medium' | 'large';

export interface AppSettings {
	theme: Theme;
	fontSize: FontSize;
}

const SETTINGS_KEY = 'claude-archive-settings';

const DEFAULT_SETTINGS: AppSettings = {
	theme: 'system',
	fontSize: 'medium'
};

const VALID_THEMES: Theme[] = ['light', 'dark', 'system'];
const VALID_FONT_SIZES: FontSize[] = ['small', 'medium', 'large'];

const FONT_SIZE_MAP: Record<FontSize, string> = {
	small: '14px',
	medium: '16px',
	large: '18px'
};

function loadSettings(): AppSettings {
	if (typeof localStorage === 'undefined') return { ...DEFAULT_SETTINGS };
	try {
		const raw = localStorage.getItem(SETTINGS_KEY);
		if (!raw) return { ...DEFAULT_SETTINGS };
		const parsed = JSON.parse(raw);
		return {
			theme: VALID_THEMES.includes(parsed.theme) ? parsed.theme : DEFAULT_SETTINGS.theme,
			fontSize: VALID_FONT_SIZES.includes(parsed.fontSize) ? parsed.fontSize : DEFAULT_SETTINGS.fontSize
		};
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
}

function saveToStorage(settings: AppSettings): void {
	if (typeof localStorage === 'undefined') return;
	try {
		const raw = localStorage.getItem(SETTINGS_KEY);
		const existing = raw ? JSON.parse(raw) : {};
		existing.theme = settings.theme;
		existing.fontSize = settings.fontSize;
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(existing));
	} catch {
		// ignore
	}
}

function getSystemTheme(): 'light' | 'dark' {
	if (typeof window === 'undefined') return 'dark';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const settings = writable<AppSettings>(loadSettings());

export const resolvedTheme = derived(settings, ($settings) => {
	if ($settings.theme === 'system') return getSystemTheme();
	return $settings.theme;
});

settings.subscribe((s) => saveToStorage(s));

export function applyTheme(mode: 'light' | 'dark'): void {
	if (typeof document === 'undefined') return;
	document.documentElement.setAttribute('data-mode', mode);
}

export function applyFontSize(size: FontSize): void {
	if (typeof document === 'undefined') return;
	document.documentElement.style.fontSize = FONT_SIZE_MAP[size] || '16px';
}

export function resetSettings(): void {
	settings.set({ ...DEFAULT_SETTINGS });
}

export { DEFAULT_SETTINGS, FONT_SIZE_MAP };
