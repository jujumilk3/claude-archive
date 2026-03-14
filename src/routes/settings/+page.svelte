<script lang="ts">
	import { goto } from '$app/navigation';
	import { invalidateAll } from '$app/navigation';
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

	let dragging = $state(false);
	let importing = $state(false);
	let importResult = $state('');
	let importError = $state('');
	let fileInput: HTMLInputElement;

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
		locale.set('en');
		applyFontSize('medium');
	}

	function handleDragOver(e: DragEvent) { e.preventDefault(); dragging = true; }
	function handleDragLeave() { dragging = false; }

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragging = false;
		if (e.dataTransfer?.files) await uploadFiles(e.dataTransfer.files);
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files) uploadFiles(input.files);
	}

	async function uploadFiles(files: FileList) {
		importing = true;
		importResult = '';
		importError = '';
		const formData = new FormData();
		for (const file of files) {
			if (file.name === 'conversations.json') formData.append('conversations', file);
			else if (file.name === 'projects.json') formData.append('projects', file);
		}
		if (!formData.has('conversations') && !formData.has('projects')) {
			importError = 'No valid files. Select conversations.json or projects.json.';
			importing = false;
			return;
		}
		try {
			const res = await fetch('/api/import', { method: 'POST', body: formData });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const result = await res.json();
			importResult = $t('import.success')
				.replace('{conversations}', String(result.conversations))
				.replace('{messages}', String(result.messages))
				.replace('{projects}', String(result.projects));
			await invalidateAll();
		} catch (e) {
			importError = e instanceof Error ? e.message : $t('import.error');
		} finally {
			importing = false;
		}
	}

	$effect(() => {
		const mode = $resolvedTheme;
		applyTheme(mode);
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

		<!-- Data Import -->
		<section class="mb-8">
			<h2 class="mb-4 border-b border-border pb-2 text-sm font-medium uppercase tracking-wider text-text-secondary">
				{$t('settings.data')}
			</h2>
			<div
				class="rounded-xl border-2 border-dashed p-6 transition-colors {dragging
					? 'border-accent bg-accent/5'
					: 'border-border hover:border-text-muted'}"
				role="button"
				tabindex="0"
				ondragover={handleDragOver}
				ondragleave={handleDragLeave}
				ondrop={handleDrop}
				onclick={() => fileInput.click()}
				onkeydown={(e) => { if (e.key === 'Enter') fileInput.click(); }}
			>
				<div class="flex items-center gap-3">
					<svg class="h-8 w-8 shrink-0 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
					</svg>
					<div>
						<p class="text-sm text-text-primary">{dragging ? $t('import.dropzoneActive') : $t('import.dropzone')}</p>
						<p class="mt-0.5 text-xs text-text-muted">{$t('import.hint')}</p>
					</div>
				</div>
				<input bind:this={fileInput} type="file" multiple accept=".json" onchange={handleFileSelect} class="hidden" />
			</div>
			{#if importing}
				<p class="mt-3 text-sm text-accent">{$t('import.importing')}</p>
			{/if}
			{#if importResult}
				<p class="mt-3 text-sm text-green-500">{importResult}</p>
			{/if}
			{#if importError}
				<p class="mt-3 text-sm text-red-400">{importError}</p>
			{/if}
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
