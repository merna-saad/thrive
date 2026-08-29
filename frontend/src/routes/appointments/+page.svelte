<script lang="ts">
	import AppointmentList from '$lib/components/appointments/AppointmentList.svelte';
	import BookingArea from '$lib/components/appointments/BookingArea.svelte';
	import { messages } from '$lib/messages';
	import { pageTitle } from '$lib/title';
	import type { PageData } from './$types';

	/**
	 * The Appointments page.
	 *
	 * A header, the booking area, and the student's own bookings. Everything
	 * stateful is inside `BookingArea` -- which advisor, which day, which month --
	 * for the same reason the calendar page is thin: the state that matters has one
	 * owner and every consumer of it is inside that owner's subtree.
	 *
	 * No reveal channel here. Nothing on this page has a collapsed row for
	 * something else to ask about.
	 */
	let { data }: { data: PageData } = $props();

	const copy = messages.appointments;
</script>

<svelte:head><title>{pageTitle(copy.documentTitle)}</title></svelte:head>

<!--
	`space-y-6 lg:space-y-4` was the density pass, 2026-08-21, and it is now
	`space-y-page-rhythm` -- one named token that carries its own breakpoint, so
	this page no longer states a rhythm four other routes were each stating
	differently. See `--thrive-page-rhythm` in app.css for the four values it
	replaced and why the desktop end roughly doubled.
-->
<div class="mx-auto w-full max-w-page space-y-page-rhythm">
	<header class="mx-auto w-full max-w-5xl">
		<p class="thrive-eyebrow">{copy.eyebrow}</p>
		<!-- `.thrive-display` carries the face, the case, the weight, the size and
		     the leading together. The `text-3xl` and `font-bold` that used to be
		     here are gone rather than kept: utilities beat the components layer, so
		     either one would have silently overridden part of the treatment. -->
		<h1 class="thrive-display mt-2 text-ink">{copy.title}</h1>
		<!-- `mt-1` -> `mt-2` above and `mt-1.5` -> `mt-2.5` below, and part of that
		     is buying back space rather than adding it: tightening the heading's
		     leading to 1.05 shrank the empty band inside its own line box, so the
		     same gap now reads smaller than it did in the sans. The rest is the air
		     the display type is for. The eyebrow stays the closer of the two -- it
		     and the title are one unit, the lede is the next one. -->
		<p class="mt-2.5 max-w-measure text-sm text-body">{copy.intro}</p>
	</header>

	<BookingArea services={data.services} data={data.data} todayKey={data.todayKey} />

	<section aria-labelledby={copy.list.headingId} class="space-y-3">
		<div class="flex flex-wrap items-baseline justify-between gap-3">
			<h2 id={copy.list.headingId} class="text-base font-medium text-ink">
				{copy.list.title}
			</h2>

			{#if data.appointments.length > 0}
				<p class="thrive-numeric text-2xs text-muted-ink">
					{copy.list.upcoming(data.appointments.length)}
				</p>
			{/if}
		</div>

		<AppointmentList items={data.appointments} />

		<!-- The standing promise, on the surface where a student is most likely to
		     assume otherwise. Capped: it is prose, and the page is now wide enough
		     that an uncapped sentence would run past a readable line. -->
		<p class="max-w-measure text-3xs text-muted-ink">{copy.disclaimer}</p>
	</section>
</div>
