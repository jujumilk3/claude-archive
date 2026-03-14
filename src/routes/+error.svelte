<script lang="ts">
	import { page } from '$app/state';
	import { t } from '$lib/i18n';
</script>

<div class="flex h-full flex-1 items-center justify-center bg-bg-primary">
	<div class="text-center">
		<p class="text-6xl font-bold text-accent">{page.status}</p>
		<p class="mt-4 text-lg text-text-primary">{page.error?.message || $t('error.notFound')}</p>
		<a href="/" class="mt-6 inline-block text-sm text-accent hover:underline">{$t('error.goHome')}</a>
	</div>
</div>
