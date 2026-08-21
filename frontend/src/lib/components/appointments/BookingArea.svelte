<script lang="ts">
	import type { ServiceView } from '$lib/appointmentsView';
	import { firstBookableDay } from '$lib/availability';
	import BookingPanel from '$lib/components/appointments/BookingPanel.svelte';
	import DayPicker from '$lib/components/appointments/DayPicker.svelte';
	import MyDayPane from '$lib/components/appointments/MyDayPane.svelte';
	import ServiceCard from '$lib/components/appointments/ServiceCard.svelte';
	import { messages } from '$lib/messages';
	import type { ScheduleData } from '$lib/schedule';

	/**
	 * The booking surface's one stateful node, and its reading order.
	 *
	 * ## The arrangement, and the problem it fixes
	 *
	 * Four numbered steps in one continuous path:
	 *
	 * ```
	 *  1  who      [ card ]   [ card ]
	 *     ─────────────────────────────────────────
	 *  2  day     │  3  time
	 *     Mon 24  │     9:30  10:30  14:00  15:00
	 *     Tue 25  │
	 *     Wed 26  │  4  about
	 *     Thu 27  │     [ reason                 ]
	 *             │     [ Confirm booking ]
	 *     ─────────────────────────────────────────
	 *     Your day — whatever day step 2 is pointing at
	 * ```
	 *
	 * The previous arrangement put the day picker in the RIGHT column and the times
	 * in the left, so the eye went right to read the calendar, back left to pick a
	 * time, and nothing said where to start. Measured at 1512px: the day→time step
	 * alone was 538px travelling LEFTWARD, the whole path was 1320px, and it changed
	 * horizontal direction three times. On a phone the day picker sat 1207px BELOW
	 * step 1, past the times it was supposed to precede.
	 *
	 * Now: **1118px at desktop and 1250px on a phone**, day→time down to 320px, and
	 * the day → time → about sequence strictly left to right. `check:interaction`
	 * asserts both, so it cannot rot back.
	 *
	 * Two horizontal direction changes survive and are deliberate: the pressed
	 * SERVICE CARD sits wherever it sits in a two-up row, and the confirm button is
	 * left-aligned under its own field the way every form in this app puts a button
	 * under its input. Neither is the zigzag the complaint was about — the
	 * day → time → about spine is monotonic, which is the part a student follows.
	 *
	 * ## Three pieces of state, all here
	 *
	 *  - `activeId` — which advisor. The cards set it, the flow below renders from it.
	 *  - `selectedKey` — the chosen day. Above the day picker, the times and "Your
	 *    day", for the same reason `CalendarView` owns its own: two things reading a
	 *    day that each kept a copy is how they come to disagree.
	 *  - There is no `monthKey` any more. The day list is bounded by the window, so
	 *    there is no month to be on.
	 *
	 * ## The initial day is derived, not "today"
	 *
	 * `firstBookableDay` picks the soonest day this advisor actually has something
	 * open on. Opening on today would frequently mean an empty times column —
	 * weekends publish nothing, and by mid-afternoon today's slots have gone.
	 *
	 * ## Switching advisor resets the form
	 *
	 * `BookingPanel` is keyed on the advisor id, so choosing the other service
	 * remounts it and clears the meeting type, the chosen time and the reason.
	 * Carrying a half-written reason across to a different person would be wrong.
	 */
	let {
		services,
		data,
		todayKey
	}: {
		services: ServiceView[];
		data: ScheduleData;
		todayKey: string;
	} = $props();

	const copy = messages.appointments;

	let activeId = $state<string | null>(null);
	let selectedKey = $state<string | null>(null);

	const active = $derived(
		services.find((service) => service.advisor.id === activeId) ?? null
	);

	/** The chosen day's finished labels, so the panel formats nothing. */
	const activeDay = $derived(
		active?.days.find((day) => day.dayKey === selectedKey) ?? null
	);

	const dayLabel = $derived(
		activeDay ? `${activeDay.weekdayLabel}, ${activeDay.dateLabel}` : ''
	);

	/**
	 * Open the flow on this advisor, or close it.
	 *
	 * The day is chosen HERE rather than inside the panel, because the day picker
	 * and the times are siblings and both read it. Choosing it on open also means
	 * the times column never paints an empty first frame.
	 */
	function toggle(service: ServiceView) {
		if (activeId === service.advisor.id) {
			activeId = null;
			return;
		}

		activeId = service.advisor.id;
		selectedKey = firstBookableDay(
			service.openByDay,
			todayKey,
			// The list is already bounded by the window, so its last day IS the
			// window end for this purpose -- no need to thread the raw key down.
			service.days.at(-1)?.dayKey ?? todayKey
		);
	}
</script>

<div class="space-y-4">
	<!-- ── Step 1: who ──────────────────────────────────────────────────────── -->
	<section aria-labelledby="booking-step-who">
		<p class="thrive-eyebrow mb-1.5" id="booking-step-who">
			<span class="thrive-numeric">1</span>
			· {copy.steps.who}
		</p>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			{#each services as service (service.advisor.id)}
				<ServiceCard
					{service}
					selected={service.advisor.id === activeId}
					onBook={() => toggle(service)}
				/>
			{/each}
		</div>
	</section>

	{#if active}
		<!--
			Steps 2, 3 and 4 in ONE panel, three columns at `xl`.

			One panel rather than three, deliberately: three bordered boxes side by
			side read as three separate decisions, and the whole point of the change is
			that this is one decision made in three moves. The dividers are the
			container showing through, the same device the month grid used between its
			cells.

			Below `xl` they stack in the same order — day, then time, then about — so
			the reading order is identical at every width and a phone never has to
			scroll back up. That was the other half of the old problem.

			`xl` rather than `lg`: at 1024 the three columns leave the times column
			about 220px, which wraps a row of "10:30 AM" chips to one per line.
		-->
		<section
			aria-labelledby="booking-step-day"
			class="thrive-panel grid grid-cols-1 gap-4 p-3 lg:grid-cols-[minmax(0,16rem)_minmax(0,32rem)] lg:gap-5"
		>
			<!-- ── Step 2: the day ─────────────────────────────────────────────── -->
			<div class="min-w-0 lg:border-r lg:border-line lg:pr-5">
				<p class="thrive-eyebrow mb-1.5" id="booking-step-day">
					<span class="thrive-numeric">2</span>
					· {copy.steps.day}
				</p>

				<DayPicker
					days={active.days}
					{selectedKey}
					windowEndLabel={active.windowEndLabel}
					onSelect={(dayKey) => (selectedKey = dayKey)}
				/>
			</div>

			<!-- Steps 3 and 4 are one form; see `BookingPanel`. -->
			{#key active.advisor.id}
				<BookingPanel
					service={active}
					dayKey={selectedKey}
					{dayLabel}
					onClose={() => (activeId = null)}
				/>
			{/key}
		</section>

		<!--
			"Your day" last, full width, following the same selection.

			It is CONTEXT rather than a step: what the chosen day already holds. Below
			the flow rather than inside it, so it cannot be mistaken for the next thing
			to do, and full width so a busy day does not squeeze the columns above.
		-->
		<MyDayPane {data} dayKey={selectedKey} {todayKey} />
	{/if}
</div>
