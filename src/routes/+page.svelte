<script lang="ts">
	import { t, locale, formatDate, formatNumber } from '$lib/i18n';
	import { goto, invalidateAll } from '$app/navigation';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let dragging = $state(false);
	let importing = $state(false);
	let importResult = $state('');
	let importError = $state('');
	let fileInput: HTMLInputElement;

	const hasData = $derived(data.stats && data.stats.total_conversations > 0);

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragging = true;
	}

	function handleDragLeave() {
		dragging = false;
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragging = false;
		if (e.dataTransfer?.files) {
			await uploadFiles(e.dataTransfer.files);
		}
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files) {
			uploadFiles(input.files);
		}
	}

	async function uploadFiles(files: FileList) {
		importing = true;
		importResult = '';
		importError = '';

		const formData = new FormData();
		for (const file of files) {
			if (file.name === 'conversations.json') {
				formData.append('conversations', file);
			} else if (file.name === 'projects.json') {
				formData.append('projects', file);
			}
		}

		if (!formData.has('conversations') && !formData.has('projects')) {
			importError = 'No valid files found. Please select conversations.json or projects.json.';
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
</script>

<div class="flex h-full items-center justify-center bg-bg-primary">
	<div class="w-full max-w-lg px-6 text-center">
		<h1 class="text-2xl font-semibold text-text-primary">Claude Archive</h1>

		{#if hasData}
			<div class="mt-6 grid grid-cols-3 gap-6">
				<div class="rounded-lg border border-border px-6 py-4">
					<p class="text-2xl font-bold text-accent">{formatNumber(data.stats.total_conversations, $locale)}</p>
					<p class="mt-1 text-sm text-text-secondary">{$t('home.conversations')}</p>
				</div>
				<div class="rounded-lg border border-border px-6 py-4">
					<p class="text-2xl font-bold text-accent">{formatNumber(data.stats.total_messages, $locale)}</p>
					<p class="mt-1 text-sm text-text-secondary">{$t('home.messages')}</p>
				</div>
				<div class="rounded-lg border border-border px-6 py-4">
					<p class="text-2xl font-bold text-accent">{formatNumber(data.stats.total_projects, $locale)}</p>
					<p class="mt-1 text-sm text-text-secondary">{$t('home.projects')}</p>
				</div>
			</div>
			{#if data.stats.oldest_conversation && data.stats.newest_conversation}
				<p class="mt-4 text-sm text-text-secondary">
					{formatDate(new Date(data.stats.oldest_conversation), $locale)} — {formatDate(new Date(data.stats.newest_conversation), $locale)}
				</p>
			{/if}
		{:else}
			<p class="mt-3 text-sm text-text-secondary leading-relaxed">
				{$t('import.description')}
			</p>
		{/if}

		<div
			class="mt-8 rounded-xl border-2 border-dashed transition-colors {dragging
				? 'border-accent bg-accent/5'
				: 'border-border hover:border-text-muted'} {hasData ? 'p-6' : 'p-10'}"
			role="button"
			tabindex="0"
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			onclick={() => fileInput.click()}
			onkeydown={(e) => { if (e.key === 'Enter') fileInput.click(); }}
		>
			<svg class="mx-auto h-8 w-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
			</svg>
			<p class="mt-2 text-sm text-text-secondary">
				{dragging ? $t('import.dropzoneActive') : $t('import.dropzone')}
			</p>
			<input
				bind:this={fileInput}
				type="file"
				multiple
				accept=".json"
				onchange={handleFileSelect}
				class="hidden"
			/>
		</div>

		<p class="mt-3 text-xs text-text-muted">{$t('import.hint')}</p>

		{#if importing}
			<p class="mt-4 text-sm text-accent">{$t('import.importing')}</p>
		{/if}
		{#if importResult}
			<p class="mt-4 text-sm text-green-500">{importResult}</p>
		{/if}
		{#if importError}
			<p class="mt-4 text-sm text-red-400">{importError}</p>
		{/if}
	</div>
</div>
