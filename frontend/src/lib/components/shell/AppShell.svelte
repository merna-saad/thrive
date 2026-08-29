<script lang="ts">
	import type { Snippet } from 'svelte';

	import BottomNav from '$lib/components/shell/BottomNav.svelte';
	import SideRail from '$lib/components/shell/SideRail.svelte';
	import TopBar from '$lib/components/shell/TopBar.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
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
	 *
	 * `currentTerm` is a STRING rather than the whole timeline, and threading it
	 * through here rather than letting `TopBar` reach for a store is the same
	 * view-model rule the rest of the app follows: a component receives what it
	 * renders. It is `null` before the program starts or after the finish line,
	 * which the bar handles by rendering nothing.
	 */
	let {
		student,
		currentTerm,
		children
	}: { student: Student; currentTerm: string | null; children: Snippet } = $props();
</script>

<div class="min-h-dvh bg-bg">
	<!-- First tab stop: lets keyboard users jump the whole nav. -->
	<a href="#main-content" class="skip-link">Skip to main content</a>

	<SideRail />

	<div class="lg:pl-rail">
		<TopBar {student} {currentTerm} notificationCount={2} />

		<!-- The bottom padding clears the mobile nav bar, which is fixed OVER the
		     page, so on mobile it is the bar's height plus the page's gutter. Above
		     `lg` there is no bar and the gutter is the whole padding.
		     Both halves now come from `--thrive-page-gutter-bottom` rather than one
		     being a bare `pb-8`: 32px of desktop padding was buying nothing under a
		     page whose last element is already a bordered panel, and it cost every
		     route. -->
		<!--
			NO MAX-WIDTH HERE ANY MORE.

			`max-w-6xl` used to live on this element, which made one number the measure
			of every route in the app — so a page that wanted more room could not have
			it without widening Home by accident. The shell now provides the gutters
			and each page names its own measure with `max-w-page`. Every route lands on
			that one today, `/calendar` included — but the point of naming it per page
			stands: how wide a page should be is a property of what is on it, not of
			the frame around it — and prose inside it is capped
			separately with `max-w-measure`, because a paragraph does not want the
			width a month grid does.

			THE SIDE GUTTER IS THE SHELL'S JOB, and it widens at `lg`.

			`px-3 sm:px-5` below that, unchanged, because a phone has no width to give
			away. `lg:px-page-x` (40px) above it, which is what keeps content off the
			edges at 1512 where the caps do not bite. The caps and the gutter are two
			separate knobs: a gutter alone does not solve a 2560px monitor and a cap
			alone does not solve a 1512px one.

			AND THE TOP GUTTER IS THE SPACE ABOVE THE PAGE HEADING, which is why it
			took `--thrive-page-rhythm` on 2026-08-29 in place of `pt-4 lg:pt-3`. It
			is the one instance of that rhythm no page can own, because the first
			thing on every route is its `h1` and the air above it belongs to the
			frame. The token carries its own breakpoint, so the `lg:` variant is gone
			rather than retuned.

			THIS IS THE ONE PIECE OF THE SPACING PASS HOME ALSO GETS, and it was
			measured rather than waved through. Home is the only route with a
			fits-one-screen contract (see `--thrive-card-body-cap`), so the extra top
			padding was checked against it at 1512x1330, before and after:

			  /                1132 -> 1144   (+12, 186px of headroom left)
			  /calendar        1161 -> 1186
			  /appointments     514 ->  548
			  /ask/resources    668 ->  696
			  /classes          229 ->  253

			Measured as the bottom of the lowest painted element, NOT
			`documentElement.scrollHeight` -- that is clamped to the viewport when the
			content fits, so it reports 1330 for every route and cannot answer this
			question at all. The first attempt used it and learned nothing.

			Home's two scrolling card bodies (321>281 and 388>281) are identical
			before and after, so this did not eat into the cap's margin either.
		-->
		<main
			id="main-content"
			tabindex="-1"
			class="w-full px-3 pt-page-rhythm pb-[calc(var(--thrive-bottomnav-height)+var(--thrive-page-gutter-bottom))] sm:px-5 lg:px-page-x lg:pb-page-bottom"
		>
			{@render children()}
		</main>
	</div>

	<BottomNav />

	<!-- Mounted always, on every route, and its text is the only thing that
	     changes. A live region populated in the same tick it is created announces
	     unreliably -- see the note in the component. -->
	<Toast />

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
