<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="flex h-full flex-1 items-center justify-center bg-bg-primary">
	<div class="text-center">
		<p class="text-6xl font-bold text-accent">{page.status}</p>
		<p class="mt-4 text-lg text-text-primary">{page.error?.message || '페이지를 찾을 수 없습니다'}</p>
		<a href="/" class="mt-6 inline-block text-sm text-accent hover:underline">홈으로 돌아가기</a>
	</div>
</div>
