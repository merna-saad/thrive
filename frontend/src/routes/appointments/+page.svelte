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

<div class="mx-auto w-full max-w-page space-y-6">
	<header class="mx-auto w-full max-w-5xl">
		<p class="thrive-eyebrow">{copy.eyebrow}</p>
		<h1 class="mt-1 text-3xl font-bold text-ink">{copy.title}</h1>
		<p class="mt-1.5 max-w-prose text-sm text-body">{copy.intro}</p>
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
		     assume otherwise. -->
		<p class="text-3xs text-muted-ink">{copy.disclaimer}</p>
	</section>
</div>
