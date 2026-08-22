<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	import MiniCalendar from '$lib/components/calendar/MiniCalendar.svelte';
	import { messages } from '$lib/messages';
	import type { ScheduleData } from '$lib/schedule';

	/**
	 * The student's month, as a reference beside the booking panel.
	 *
	 * READ ONLY, and deliberately so: the chips are the day picker. This exists so
	 * a student can see the shape of their month while choosing a time, which is a
	 * question the five-chip strip cannot answer.
	 *
	 * ## It reuses the calendar's grid rather than forking one
	 *
	 * `MiniCalendar` with `readOnly`. What transferred: the panel, the month label,
	 * the weekday header, the six-by-seven arithmetic, and the dot row with its
	 * overflow counter and its reserved height — which is most of the markup and
	 * all of the arithmetic.
	 *
	 * The one assumption that did NOT transfer is that a cell is a control. Every
	 * cell there is a `<button>` sharing a roving tabindex, with about eighty lines
	 * existing solely to make them keyboard-operable. So `readOnly` changes the
	 * cell's ELEMENT — `<div>`, no role, no tabindex, no click, no hover — rather
	 * than merely dropping the handler, because a focusable cell that does nothing
	 * is worse than no cell at all.
	 *
	 * ## Two things stated on screen rather than assumed
	 *
	 * The note says it is not clickable, and the link out is real. Together they
	 * are also what justifies the grid being `aria-hidden`: the same month, fully
	 * labelled and fully operable, is one link away, and a 42-cell grid announced
	 * cell by cell with nothing to activate is noise rather than access. If
	 * `/calendar` did not exist this would have to be presented instead.
	 *
	 * It does not page. A chevron is a control, and the point of the mode is that
	 * there are none.
	 */
	let {
		data,
		todayKey
	}: {
		data: ScheduleData;
		todayKey: string;
	} = $props();

	const copy = messages.appointments.monthReference;

	/**
	 * Frozen on the month containing today. Nothing can move it.
	 *
	 * `$derived` rather than a plain const so it follows `todayKey` if a `load`
	 * re-run hands down a new one — after a booking, say. A const would capture the
	 * first value and svelte-check rightly asks whether that was meant.
	 */
	const monthKey = $derived(`${todayKey.slice(0, 7)}-01`);
</script>

<section aria-labelledby={copy.headingId} class="space-y-1.5">
	<div class="flex flex-wrap items-baseline justify-between gap-2">
		<h3 id={copy.headingId} class="text-base font-medium text-ink">{copy.title}</h3>

		<a
			href="/calendar"
			class="inline-flex min-h-11 items-center gap-1 rounded-sm px-1 text-3xs text-muted-ink hover:text-ink"
		>
			{copy.seeCalendar}
			<ArrowRight aria-hidden="true" class="size-3.5 shrink-0" />
		</a>
	</div>

	<MiniCalendar
		{data}
		{todayKey}
		{monthKey}
		readOnly
		selectedKey=""
		onSelect={() => {}}
		onMonthChange={() => {}}
	/>

	<p class="text-3xs text-muted-ink">{copy.note}</p>
</section>
