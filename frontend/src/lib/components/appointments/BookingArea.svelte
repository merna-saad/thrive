<script lang="ts">
	import { untrack } from 'svelte';

	import type { ServiceView } from '$lib/appointmentsView';
	import { firstBookableDay } from '$lib/availability';
	import BookingPanel from '$lib/components/appointments/BookingPanel.svelte';
	import MyDayPane from '$lib/components/appointments/MyDayPane.svelte';
	import ServiceCard from '$lib/components/appointments/ServiceCard.svelte';
	import MiniCalendar from '$lib/components/calendar/MiniCalendar.svelte';
	import { messages } from '$lib/messages';
	import type { ScheduleData } from '$lib/schedule';

	/**
	 * The booking surface's one stateful node.
	 *
	 * Service cards, then a two-column scheduler. Left is the form you commit
	 * from; right is the day picker and what that day already holds. Both columns
	 * read the same `selectedKey`, so choosing a day moves them together and a
	 * student can see what a slot would collide with before taking it.
	 *
	 * ## Three pieces of state, and why they are all here
	 *
	 *  - `activeId` — which advisor is being booked. Above the cards AND the panel,
	 *    because the cards set it and the panel is rendered from it.
	 *  - `selectedKey` — the chosen day. Above the calendar and both panes, for the
	 *    same reason `CalendarView` owns its own: two things reading a day that
	 *    each kept their own copy is how they come to disagree.
	 *  - `monthKey` — which month the grid shows. Paging is not selecting, so this
	 *    is separate; landing on a month the selection is not in is normal.
	 *
	 * ## The initial day is derived, not "today"
	 *
	 * `firstBookableDay` picks the soonest day this advisor actually has something
	 * open on. Opening on today would frequently mean an empty times list beside a
	 * calendar full of marks -- weekends publish nothing, and by mid-afternoon
	 * today's remaining slots have gone -- which reads as a broken page rather than
	 * as "not today". Null when the whole window is closed, and the panel says so
	 * rather than pointing at a day it cannot serve.
	 *
	 * ## Switching advisor resets the form
	 *
	 * `BookingPanel` is keyed on the advisor id, so choosing the other service
	 * remounts it and clears the meeting type, the chosen time and the reason.
	 * Carrying a half-written reason across to a different person would be wrong,
	 * and keeping the day is not worth the confusion of keeping the rest.
	 */
	let {
		services,
		data,
		todayKey,
		windowEnd
	}: {
		services: ServiceView[];
		data: ScheduleData;
		todayKey: string;
		/** Last bookable day, inclusive. Decided on the server. */
		windowEnd: string;
	} = $props();

	const copy = messages.appointments;

	let activeId = $state<string | null>(null);
	let selectedKey = $state<string | null>(null);

	/**
	 * Which month the grid shows. Seeded from today's, then owned by the student.
	 *
	 * `untrack` states the latch out loud, the same way `ItemDetail` latches its
	 * row: this is the STARTING month, not a mirror of `todayKey`. Without it
	 * svelte-check rightly asks whether reading a prop into initial state was
	 * meant, and the answer here is yes -- an `invalidateAll` after a booking
	 * re-runs `load` and hands the same `todayKey` back, and the student's paged
	 * month must survive that rather than snapping home.
	 */
	let monthKey = $state(untrack(() => `${todayKey.slice(0, 7)}-01`));

	const active = $derived(
		services.find((service) => service.advisor.id === activeId) ?? null
	);

	/**
	 * Open the panel on this advisor, or close it.
	 *
	 * The day is chosen HERE rather than inside the panel, because the calendar
	 * beside the panel has to show the same choice, and the calendar is this
	 * component's child too. Choosing it on open also means the times list never
	 * paints an empty first frame.
	 */
	function toggle(service: ServiceView) {
		if (activeId === service.advisor.id) {
			activeId = null;
			return;
		}

		activeId = service.advisor.id;
		selectedKey = firstBookableDay(service.openByDay, todayKey, windowEnd);

		// Pull the grid onto the month the chosen day is in, or it would open on
		// this month with the selection somewhere the student cannot see.
		if (selectedKey) monthKey = `${selectedKey.slice(0, 7)}-01`;
	}
</script>

<div class="space-y-4">
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		{#each services as service (service.advisor.id)}
			<ServiceCard
				{service}
				selected={service.advisor.id === activeId}
				onBook={() => toggle(service)}
			/>
		{/each}
	</div>

	{#if active}
		<!--
			Stacks below `lg` as panel, then calendar, then day. On a phone that puts
			the thing you commit from first and the picker under it, which is the
			wrong order to READ but the right one to return to: the times list is what
			a student comes back to after each day they try.

			Two columns from `lg` up, with the calendar and the day pane sharing the
			right one -- the picker above the consequence of the pick.
		-->
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<!-- `{#key}` rather than a `key` prop: Svelte has no such prop, and this is
			     the construct that remounts a subtree when a value changes. Switching
			     advisor therefore clears the meeting type, the chosen time and the
			     reason, which is the intent. -->
			{#key active.advisor.id}
				<BookingPanel
					service={active}
					dayKey={selectedKey}
					onClose={() => (activeId = null)}
				/>
			{/key}

			<div class="space-y-4">
				<section aria-labelledby={copy.calendar.headingId} class="space-y-1.5">
					<h2 id={copy.calendar.headingId} class="text-base font-medium text-ink">
						{copy.calendar.title}
					</h2>

					<!--
						`selectedKey ?? ''` rather than falling back to today. An empty
						string matches no cell, so with the whole window closed nothing is
						marked selected -- falling back to today would put the selected
						treatment on a day the grid is simultaneously refusing to offer.
						The grid's tab-stop fallback already handles a selection it cannot
						see, so this costs nothing.
					-->
					<MiniCalendar
						{data}
						{todayKey}
						selectedKey={selectedKey ?? ''}
						onSelect={(dayKey) => (selectedKey = dayKey)}
						{monthKey}
						onMonthChange={(next) => (monthKey = next)}
						size="comfortable"
						booking={{ openByDay: active.openByDay, windowEnd }}
					/>

					<!-- The key. Says in words what the dot means, and names BOTH reasons
					     a day is grey -- they look identical, and without this a student
					     reads a full week as an advisor who never works. -->
					<p class="text-3xs text-muted-ink">{copy.calendar.key}</p>
				</section>

				<MyDayPane {data} dayKey={selectedKey} {todayKey} />
			</div>
		</div>
	{/if}
</div>
