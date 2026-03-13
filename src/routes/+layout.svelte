<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<div class="flex h-screen overflow-hidden">
	{@render children()}
</div>
