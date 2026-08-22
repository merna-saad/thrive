<script lang="ts">
	import { untrack } from 'svelte';

	import type { ServiceView } from '$lib/appointmentsView';
	import { firstBookableDay } from '$lib/availability';
	import BookingPanel from '$lib/components/appointments/BookingPanel.svelte';
	import MonthBrowser from '$lib/components/appointments/MonthBrowser.svelte';
	import MyDayPane from '$lib/components/appointments/MyDayPane.svelte';
	import ServiceCard from '$lib/components/appointments/ServiceCard.svelte';
	import type { ScheduleData } from '$lib/schedule';

	/**
	 * The booking surface's one stateful node.
	 *
	 * Service cards across the top, then two columns: the booking panel on the
	 * left, and on the right the student's own day with a read-only month beneath
	 * it.
	 *
	 * ```
	 *  [ card ]        [ card ]
	 *  ───────────────────────────────────
	 *  Pick a day      │  Your day
	 *  [Today][Tue]…   │  9:30  MGT 100
	 *  Meeting type    │  14:00 Advising
	 *  Available times │
	 *  [reason]        │  Your month
	 *  [Confirm]       │  [ month grid ]
	 * ```
	 *
	 * This is the original arrangement. Phase 8 replaced the chip strip with a
	 * month calendar in the right column, which put the day picker across the page
	 * from the times and read backwards; a later pass moved it left as a day list.
	 * Both are reverted. The chips are the picker and they sit at the top of the
	 * panel, where the first decision belongs.
	 *
	 * The month grid survives on this page as a REFERENCE under "Your day" — same
	 * component, `readOnly`, no controls. See `MonthReference`.
	 *
	 * ## FOUR pieces of state, and two of them are days
	 *
	 *  - `activeId` — which advisor. The cards set it, the panel renders from it.
	 *  - `bookingDay` — the day being BOOKED. Drives the chips and the times.
	 *  - `browseDay` — the day being LOOKED AT. Drives "Your day".
	 *  - `browseMonth` — which month the grid shows. A view, not a choice.
	 *
	 * ## Why two days rather than one
	 *
	 * Booking and browsing are different questions, and the month grid made that
	 * visible. A student comparing next Thursday against their classes has not
	 * changed their mind about booking Tuesday, so the grid must not move the chips.
	 *
	 * **The coupling runs one way.** Choosing a CHIP moves both, because seeing what
	 * a slot would collide with is the entire reason "Your day" is on this page.
	 * Choosing a day in the grid moves only `browseDay`. One direction, stated here
	 * because a reader will reasonably wonder why the two are not symmetrical.
	 *
	 * They start equal, so the page opens coherent rather than pointing two panes at
	 * two different days for no reason.
	 *
	 * ## The initial day is derived, not "today"
	 *
	 * `firstBookableDay` picks the soonest published day with something free. Today
	 * is usually the first chip and is frequently empty by mid-afternoon, so opening
	 * there would show an empty times list beside chips that do have room.
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

	let activeId = $state<string | null>(null);
	let bookingDay = $state<string | null>(null);
	let browseDay = $state<string | null>(null);
	/**
	 * Seeded from today's month, then owned by the student.
	 *
	 * `untrack` states the latch out loud, the same way `ItemDetail` latches its
	 * row: this is the STARTING month, not a mirror of `todayKey`. An
	 * `invalidateAll` after a booking re-runs `load` and hands the same `todayKey`
	 * back, and a month the student has paged to must survive that rather than
	 * snapping home.
	 */
	let browseMonth = $state(untrack(() => monthOf(todayKey)));

	const active = $derived(
		services.find((service) => service.advisor.id === activeId) ?? null
	);

	/** The booked day's finished labels, so the panel formats nothing. */
	const activeDay = $derived(
		active?.days.find((day) => day.dayKey === bookingDay) ?? null
	);

	const dayLabel = $derived(
		activeDay ? `${activeDay.weekdayLabel}, ${activeDay.dateLabel}` : ''
	);

	/**
	 * "YYYY-MM-01" for whichever month a day belongs to.
	 *
	 * String slicing rather than `Date` arithmetic: a day key is already local
	 * calendar parts, so taking its first seven characters cannot shift a month the
	 * way parsing and re-formatting an instant can.
	 */
	function monthOf(dayKey: string): string {
		return `${dayKey.slice(0, 7)}-01`;
	}

	function toggle(service: ServiceView) {
		if (activeId === service.advisor.id) {
			activeId = null;
			return;
		}

		activeId = service.advisor.id;
		bookingDay = firstBookableDay(
			service.days.map((day) => day.dayKey),
			service.openByDay
		);
		// They start equal, so the page opens with both panes on one day.
		browseDay = bookingDay;
		browseMonth = monthOf(browseDay ?? todayKey);
	}

	/**
	 * A CHIP was pressed: move both.
	 *
	 * The grid follows the booking day here, and pulls its month along, so choosing
	 * a chip for a day in the next month does not leave the grid on this one.
	 */
	function chooseBookingDay(dayKey: string) {
		bookingDay = dayKey;
		browseDay = dayKey;
		browseMonth = monthOf(dayKey);
	}

	/** A GRID CELL was pressed: move only what is being looked at. */
	function chooseBrowseDay(dayKey: string) {
		browseDay = dayKey;
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
			Stacks below `lg`: the panel first, then the day and the month beneath it,
			which is the order the decision is made in. The month reference is last
			on purpose — it is the least urgent thing on the page and the tallest.
		-->
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<section class="thrive-panel min-w-0 p-3">
				{#key active.advisor.id}
					<BookingPanel
						service={active}
						dayKey={bookingDay}
						{dayLabel}
						onSelectDay={chooseBookingDay}
						onClose={() => (activeId = null)}
					/>
				{/key}
			</section>

			<div class="min-w-0 space-y-4">
				<!-- Reads `browseDay`, which the grid below it writes and the chips also
				     write. See the note on the one-way coupling. -->
				<MyDayPane {data} dayKey={browseDay} {todayKey} />

				<MonthBrowser
					{data}
					{todayKey}
					selectedKey={browseDay ?? ''}
					monthKey={browseMonth}
					onSelect={chooseBrowseDay}
					onMonthChange={(next) => (browseMonth = next)}
				/>
			</div>
		</div>
	{/if}
</div>
