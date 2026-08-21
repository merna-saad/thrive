<script lang="ts">
	import { pageTitle } from '$lib/title';

	/**
	 * The calendar's page header, ported verbatim. The view itself -- three
	 * modes, two filter dimensions, fifteen components -- is a later phase.
	 *
	 * This h1 is the ONE page title in the Next app that already carries
	 * `font-bold`. MIGRATION.md section 9 defect 4: the other twelve render at
	 * 400. Every heading in this port sets its weight at the call site.
	 */
</script>

<svelte:head><title>{pageTitle('Calendar')}</title></svelte:head>

<div class="space-y-3">
	<header class="mx-auto w-full max-w-5xl">
		<p class="font-mono text-3xs tracking-wider text-muted-ink uppercase">calendar · fall 2026</p>
		<h1 class="mt-1 text-3xl font-bold text-ink">Everything, one page</h1>
		<p class="mt-1.5 max-w-prose text-sm text-body">
			Classes, deadlines, tasks, appointments, your own to-dos, and what you could sign up for.
			Filter it, group it, add to it.
		</p>
	</header>

	<div class="mx-auto w-full max-w-5xl">
		<div data-tone="sunken" class="thrive-panel px-4 py-8 text-center">
			<p class="text-base text-ink">The calendar lands in a later phase.</p>
			<p class="mx-auto mt-1 max-w-md text-xs text-muted-ink">
				Its pure layer is already ported and under test: the grid arithmetic, the one filter,
				the grouping, and the merge that folds your own rows onto the server's.
			</p>
		</div>
	</div>
</div>
