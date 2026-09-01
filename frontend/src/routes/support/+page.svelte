<script lang="ts">
	import PagePlaceholder from '$lib/components/PagePlaceholder.svelte';

	/**
	 * Support. A stub, and honest about it.
	 *
	 * It exists because the rail's foot links here: a nav item pointing at a route
	 * that does not exist is exactly the failure `PagePlaceholder`'s own throw is
	 * designed to make loud, and shipping the link without the route would have
	 * traded a loud failure for a quiet 404.
	 */
</script>

<PagePlaceholder href="/support" />
