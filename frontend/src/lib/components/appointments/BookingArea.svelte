<script lang="ts">
	import type { ServiceView } from '$lib/appointmentsView';
	import { firstBookableDay } from '$lib/availability';
	import BookingPanel from '$lib/components/appointments/BookingPanel.svelte';
	import MonthReference from '$lib/components/appointments/MonthReference.svelte';
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
	 * ## Two pieces of state
	 *
	 *  - `activeId` — which advisor. The cards set it, the panel renders from it.
	 *  - `selectedKey` — the chosen day. Here rather than in the panel because
	 *    "Your day" reads it too, and two things reading a day that each kept their
	 *    own copy is how they come to disagree.
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

	function toggle(service: ServiceView) {
		if (activeId === service.advisor.id) {
			activeId = null;
			return;
		}

		activeId = service.advisor.id;
		selectedKey = firstBookableDay(
			service.days.map((day) => day.dayKey),
			service.openByDay
		);
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
						dayKey={selectedKey}
						{dayLabel}
						onSelectDay={(dayKey) => (selectedKey = dayKey)}
						onClose={() => (activeId = null)}
					/>
				{/key}
			</section>

			<div class="min-w-0 space-y-4">
				<MyDayPane {data} dayKey={selectedKey} {todayKey} />
				<MonthReference {data} {todayKey} />
			</div>
		</div>
	{/if}
</div>
