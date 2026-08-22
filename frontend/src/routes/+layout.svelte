<script lang="ts">
	import '../app.css';

	import AppShell from '$lib/components/shell/AppShell.svelte';
	import { hydrateStores } from '$lib/overrideStore.svelte';
	import { hydrateTaskNotes } from '$lib/taskNotes.svelte';
	import { applyTheme, theme } from '$lib/theme';
	import { SITE_DESCRIPTION, pageTitle } from '$lib/title';

	let { data, children } = $props();

	/**
	 * THE ONE PLACE THE STORES HYDRATE.
	 *
	 * `$effect` runs after mount and only in the browser, which is exactly the
	 * contract the store layer was built against: server and first client render
	 * both see no overrides, and the student's own edits land on the render after
	 * this fires. Hydration strategy A -- the same brief un-personalised flash the
	 * Next app has.
	 *
	 * Do not move this into a component, and do not add a second call. A surface
	 * that later wants to wait for personalised data should read a flag derived
	 * from here rather than hydrating again.
	 *
	 * `hydrateTaskNotes` is separate because notes are not an override store and
	 * so are not in the registry -- see the note at the top of taskNotes.
	 */
	$effect(() => {
		hydrateStores();
		hydrateTaskNotes();
	});

	/**
	 * THE THEME, ONTO THE DOCUMENT.
	 *
	 * A SECOND effect rather than a line in the one above, because the two do
	 * different things and want different dependencies. That one is a one-shot: it
	 * loads storage on mount and must not re-run. This one has to re-run every
	 * time the choice changes, which is what reading `theme()` inside it arranges.
	 * Merging them would either re-hydrate on every toggle or freeze the attribute
	 * at its mount value, and both are silent.
	 *
	 * Effect ordering is not relied on. If this runs before the stores hydrate it
	 * reads `system`, writes no attribute, and the CSS is already doing exactly
	 * that -- then it runs again with the real choice. There is no state in which
	 * a wrong attribute is written.
	 *
	 * This is also the whole of hydration strategy A for the theme: the browser
	 * has already resolved `prefers-color-scheme` from `app.css` before any of
	 * this runs, so a student on the default never waits for it. See `theme.ts`.
	 */
	$effect(() => {
		applyTheme(theme());
	});
</script>

<svelte:head>
	<!-- The default title. Each route sets its own through `pageTitle`, which
	     reproduces Next's "%s · THRIVE" template. -->
	<title>{pageTitle()}</title>
	<meta name="description" content={SITE_DESCRIPTION} />
</svelte:head>

<AppShell student={data.student} currentTerm={data.timeline.currentTerm}>
	{@render children()}
</AppShell>
