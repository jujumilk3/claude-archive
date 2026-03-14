<script lang="ts">
	import { goto } from '$app/navigation';
	import { t, locale, availableLocales } from '$lib/i18n';
	import type { Locale } from '$lib/i18n';
	import {
		settings,
		resolvedTheme,
		applyTheme,
		applyFontSize,
		resetSettings,
		type Theme,
		type FontSize
	} from '$lib/stores/settings';

	const themeOptions: { value: Theme; labelKey: 'settings.themeLight' | 'settings.themeDark' | 'settings.themeSystem' }[] = [
		{ value: 'light', labelKey: 'settings.themeLight' },
		{ value: 'dark', labelKey: 'settings.themeDark' },
		{ value: 'system', labelKey: 'settings.themeSystem' }
	];

	const fontSizeOptions: { value: FontSize; labelKey: 'settings.fontSizeSmall' | 'settings.fontSizeMedium' | 'settings.fontSizeLarge' }[] = [
		{ value: 'small', labelKey: 'settings.fontSizeSmall' },
		{ value: 'medium', labelKey: 'settings.fontSizeMedium' },
		{ value: 'large', labelKey: 'settings.fontSizeLarge' }
	];

	let exporting = $state(false);
	let exportError = $state('');

	function setTheme(theme: Theme) {
		settings.update((s) => ({ ...s, theme }));
	}

	function setFontSize(fontSize: FontSize) {
		settings.update((s) => ({ ...s, fontSize }));
		applyFontSize(fontSize);
	}

	function setLanguage(lang: Locale) {
		locale.set(lang);
	}

	function handleReset() {
		resetSettings();
		locale.set('ko');
		applyTheme('dark');
		applyFontSize('medium');
	}

	async function handleExportAll() {
		exporting = true;
		exportError = '';
		try {
			const res = await fetch('/api/export');
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `claude-archive-export.md`;
			a.click();
			URL.revokeObjectURL(url);
		} catch (e) {
			exportError = e instanceof Error ? e.message : 'Export failed';
		} finally {
			exporting = false;
		}
	}

	$effect(() => {
		const mode = $resolvedTheme;
		applyTheme(mode);
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const handler = () => {
			if ($settings.theme === 'system') {
				applyTheme(mq.matches ? 'dark' : 'light');
			}
		};
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	});
</script>

<div class="flex h-full overflow-y-auto bg-bg-primary">
	<div class="mx-auto w-full max-w-2xl px-6 py-8">
		<div class="mb-8 flex items-center gap-3">
			<button
				onclick={() => history.back()}
				class="rounded-md p-1.5 text-text-secondary hover:bg-bg-sidebar hover:text-text-primary"
				aria-label={$t('settings.back')}
			>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M19 12H5M12 19l-7-7 7-7" />
				</svg>
			</button>
			<h1 class="text-xl font-semibold text-text-primary">{$t('settings.title')}</h1>
		</div>

		<!-- General -->
		<section class="mb-8">
			<h2 class="mb-4 border-b border-border pb-2 text-sm font-medium uppercase tracking-wider text-text-secondary">
				{$t('settings.general')}
			</h2>
			<div class="space-y-4">
				<div>
					<label for="language-select" class="block text-sm font-medium text-text-primary">
						{$t('settings.language')}
					</label>
					<p class="mb-2 text-xs text-text-secondary">{$t('settings.languageDesc')}</p>
					<select
						id="language-select"
						value={$locale}
						onchange={(e) => setLanguage(e.currentTarget.value as Locale)}
						class="w-full max-w-xs rounded-md border border-border bg-bg-sidebar px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
					>
						{#each availableLocales as loc}
							<option value={loc.code}>{loc.name}</option>
						{/each}
					</select>
				</div>
			</div>
		</section>

		<!-- Appearance -->
		<section class="mb-8">
			<h2 class="mb-4 border-b border-border pb-2 text-sm font-medium uppercase tracking-wider text-text-secondary">
				{$t('settings.appearance')}
			</h2>
			<div class="space-y-6">
				<div>
					<span class="mb-2 block text-sm font-medium text-text-primary">
						{$t('settings.theme')}
					</span>
					<div class="flex gap-1 rounded-lg border border-border p-1" role="radiogroup" aria-label={$t('settings.theme')}>
						{#each themeOptions as opt}
							<button
								role="radio"
								aria-checked={$settings.theme === opt.value}
								onclick={() => setTheme(opt.value)}
								class="flex-1 rounded-md px-4 py-2 text-sm transition-colors {$settings.theme === opt.value
									? 'bg-accent text-white'
									: 'text-text-secondary hover:bg-bg-sidebar hover:text-text-primary'}"
							>
								{$t(opt.labelKey)}
							</button>
						{/each}
					</div>
				</div>

				<div>
					<label for="fontsize-select" class="mb-2 block text-sm font-medium text-text-primary">
						{$t('settings.fontSize')}
					</label>
					<select
						id="fontsize-select"
						value={$settings.fontSize}
						onchange={(e) => setFontSize(e.currentTarget.value as FontSize)}
						class="w-full max-w-xs rounded-md border border-border bg-bg-sidebar px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
					>
						{#each fontSizeOptions as opt}
							<option value={opt.value}>{$t(opt.labelKey)}</option>
						{/each}
					</select>
				</div>
			</div>
		</section>

		<!-- Data -->
		<section class="mb-8">
			<h2 class="mb-4 border-b border-border pb-2 text-sm font-medium uppercase tracking-wider text-text-secondary">
				{$t('settings.data')}
			</h2>
			<div class="space-y-4">
				<div>
					<span class="block text-sm font-medium text-text-primary">
						{$t('settings.export')}
					</span>
					<p class="mb-2 text-xs text-text-secondary">{$t('settings.exportDesc')}</p>
					<button
						onclick={handleExportAll}
						disabled={exporting}
						class="rounded-md border border-border bg-bg-sidebar px-4 py-2 text-sm text-text-primary transition-colors hover:bg-bg-primary disabled:opacity-50"
					>
						{#if exporting}
							{$t('common.loading')}
						{:else}
							{$t('settings.exportAll')}
						{/if}
					</button>
					{#if exportError}
						<p class="mt-2 text-xs text-red-400">{exportError}</p>
					{/if}
				</div>
			</div>
		</section>

		<!-- Reset -->
		<div class="border-t border-border pt-6">
			<button
				onclick={handleReset}
				class="rounded-md border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:border-red-400 hover:text-red-400"
			>
				{$t('settings.reset')}
			</button>
		</div>
	</div>
</div>
