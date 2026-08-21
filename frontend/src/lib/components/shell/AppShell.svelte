<script lang="ts">
	import type { Snippet } from 'svelte';

	import BottomNav from '$lib/components/shell/BottomNav.svelte';
	import SideRail from '$lib/components/shell/SideRail.svelte';
	import TopBar from '$lib/components/shell/TopBar.svelte';
	import { FEATURES } from '$lib/features';
	import type { Student } from '$lib/data/types';

	/**
	 * The persistent frame around every page: rail (desktop) or bottom bar
	 * (mobile), header, and the content region.
	 *
	 * In the Next app this was an `async` server component that awaited
	 * `getStudent()` mid-tree. SvelteKit has nowhere to await inside a component,
	 * and does not need one: the root `+layout.server.ts` loads the student and
	 * passes it in. Same data, fetched at the edge of the tree instead of inside
	 * it, which is where MIGRATION.md section 8 item 2 says it belongs.
	 *
	 * Kept as its own component rather than inlined into `+layout.svelte` so the
	 * layout stays about data and lifecycle while this stays about structure.
	 */
	let { student, children }: { student: Student; children: Snippet } = $props();
</script>

<div class="min-h-dvh bg-bg">
	<!-- First tab stop: lets keyboard users jump the whole nav. -->
	<a href="#main-content" class="skip-link">Skip to main content</a>

	<SideRail />

	<div class="lg:pl-rail">
		<TopBar {student} notificationCount={2} />

		<!-- The bottom padding clears the mobile nav bar, which is fixed over the
		     page. Above `lg` the bar is gone and the padding relaxes. -->
		<main
			id="main-content"
			tabindex="-1"
			class="mx-auto w-full max-w-6xl px-3 pt-4 pb-[calc(var(--thrive-bottomnav-height)+1rem)] sm:px-5 lg:pb-8"
		>
			{@render children()}
		</main>
	</div>

	<BottomNav />

	<!--
		Floating widgets mount here, last in the DOM so they land above the page
		without a z-index race, and so they are the final tab stops rather than
		something the keyboard has to pass through to reach the content.

		Hidden for now to simplify the UI. Flip FEATURES to true to bring back.
		The internals are a later phase; these are the mount points.
	-->
	{#if FEATURES.floatingTodo}
		<!-- QuickListWidget -->
	{/if}

	{#if FEATURES.floatingAssistant}
		<!-- AssistantWidget -->
	{/if}
</div>
