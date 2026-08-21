<script lang="ts">
	import { pageTitle } from '$lib/title';

	/**
	 * Home, as a heading only.
	 *
	 * The real dashboard is six providers, a greeting computed from the server
	 * clock, and five cards -- all of it Phase 5 or later. What is here is enough
	 * to prove the shell and navigation work end to end.
	 *
	 * Deliberately NOT PagePlaceholder: Home is not an unbuilt section, it is the
	 * one page the whole app is arranged around, and labelling it "coming next"
	 * alongside the genuine stubs would misrepresent where the work is.
	 */
</script>

<svelte:head><title>{pageTitle()}</title></svelte:head>

<div class="space-y-3">
	<header>
		<p class="font-mono text-3xs tracking-wider text-muted-ink uppercase">
			home · your day at a glance
		</p>
		<!-- font-bold at the call site. The Next h1 here is the greeting inside the
		     panel, at weight 400 -- one of the twelve in defect 4. -->
		<h1 class="mt-1 text-3xl font-bold text-ink">THRIVE</h1>
		<p class="mt-1.5 max-w-prose text-sm text-body">
			One calm view of your MSBA program: classes, deadlines, degree progress, and what to do
			next.
		</p>
	</header>

	<div data-tone="sunken" class="thrive-panel px-4 py-8 text-center">
		<p class="text-base text-ink">The dashboard lands in a later phase.</p>
		<p class="mx-auto mt-1 max-w-md text-xs text-muted-ink">
			The shell, the design tokens, the date rules, and the persistence layer are in place and
			under test. Use the navigation to see the routes that exist.
		</p>
	</div>
</div>
