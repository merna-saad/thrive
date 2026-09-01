<script lang="ts">
	import { dayCountParts, type SquareGroup } from '$lib/calendarDay';
	import SquareGrid from '$lib/components/calendar/SquareGrid.svelte';
	import { messages } from '$lib/messages';
	import type { ScheduleItem } from '$lib/schedule';

	/**
	 * The day's summary, in the owner's reference shape.
	 *
	 *     12          4 classes · 3 tasks · 2 clubs
	 *     next up: 2:00 PM  Data Visualization
	 *     ▢▢▣ ▢▢▢▢
	 *
	 * The figure is bold sans because it is the one thing to read first.
	 *
	 * ## The two faces, and what moved
	 *
	 * The Next version set the figure, the breakdown, the fraction and the whole
	 * "next up" line in mono, on the reasoning that it was all "machine truth".
	 * Under the tightened rule only VALUES take `.thrive-numeric`: the figure, the
	 * "n of m done" fraction and the clock time. The breakdown ("4 classes") and
	 * the words "next up:" are sentences, so they take the sans -- which is also
	 * what stops this panel reading as a terminal.
	 *
	 * `next up:` puts indigo on the TIME, the reserved "this is where you are now"
	 * colour, and the same item is marked in the square strip so the two agree.
	 *
	 * ## What the figure counts
	 *
	 * Everything on the day, events included -- so a day can read "12" while this
	 * phase renders ten rows beneath it, because the events section is Phase 7c.
	 * The alternative was filtering events out of the count and out of the month
	 * dots, which would break "one filter, applied once" and change what the grid
	 * shows twice. Accepted deliberately; see BUGS.md.
	 */
	let {
		heading,
		isToday,
		items,
		nextUp,
		squares
	}: {
		/** Already formatted by the parent. Nothing here interprets a date. */
		heading: string;
		isToday: boolean;
		/** Every item on the day, for the figure and the breakdown. */
		items: ScheduleItem[];
		nextUp: ScheduleItem | null;
		squares: SquareGroup[];
	} = $props();

	const copy = messages.calendar.header;

	const done = $derived(items.filter((item) => item.done === true).length);
	/*
	 * `done !== undefined` rather than `isTickable`, deliberately, and it is a
	 * different question from the one `DaySection` asks.
	 *
	 * A section's fraction is the denominator of the checkboxes it renders, so it
	 * must ask whether a writable source is attached. This line is a summary of
	 * the day, where anything carrying a done state counts toward "how much of
	 * today is finished" whether or not this surface can write it.
	 */
	const tickable = $derived(items.filter((item) => item.done !== undefined).length);

	/**
	 * "4 classes · 3 tasks".
	 *
	 * The counting and the two word-forms come from `dayCountParts`, which is
	 * where they can be tested; this line only asks `messages` to turn each pair
	 * into a fragment and to join them. Splitting it there is why "1 classes" is
	 * now a test failure rather than something to spot on screen.
	 */
	const countsLine = $derived(
		copy.countsLine(
			dayCountParts(items).map((part) => copy.countPart(part.count, part.singular, part.plural))
		)
	);
</script>

<!--
	THE HEADING LEFT THIS COMPONENT on 2026-08-30 and now lives in the rail, in
	display type, as the page's second focal point. Two things follow from that:

	  - There is no `<h2>` here any more. `aria-labelledby` still names
	    `copy.headingId`, which resolves to the rail's heading in another subtree.
	    Ids are document-global, so this is valid, and it keeps ONE heading for the
	    selected day in the document outline instead of two saying the same date.
	  - The indigo "today" chip went with it. The rail says TODAY in 19.5px caps;
	    a chip repeating that three inches away is the kind of duplication that
	    made this page read as six competing headings in the first place.

	`heading` is still a prop, and still required: it is what the section's
	`aria-label`-shaped announcement in `CalendarView` reads from, and dropping it
	would make this component's contract quietly narrower than its callers expect.
-->
<!--
	ONE ROW, NOT A STACK, since 2026-08-30.

	This was three stacked blocks -- figure, "n of m done", then the squares -- and
	that shape was right when it sat under a heading in a narrow-ish column. Under
	the grid it is 869px wide, and a stack put every piece in the left third with
	two thirds of a panel empty beside it. A summary that occupies a large blank
	block is the thing this pass was called in to fix, so it reads across instead:
	the count on the left, the progress strip pushed to the right edge.

	It wraps rather than shrinking. Below `sm` the squares drop under the figure,
	which is the stack this used to be and is correct at that width.
-->
<section
	aria-labelledby={copy.headingId}
	class="thrive-panel flex flex-wrap items-center justify-between gap-x-6 gap-y-3"
>
	<div class="min-w-0">
		<!-- The figure and its breakdown, on one baseline. -->
		<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
			<p class="thrive-numeric text-3xl font-bold text-ink">
				{items.length}
				<!-- A bare 40px number reads as a heading to a screen reader and as
				     nothing at all without the breakdown beside it. -->
				<span class="sr-only">{copy.dayFigureLabel(items.length)}</span>
			</p>
			<p class="text-xs text-muted-ink">
				{items.length === 0 ? copy.nothing : countsLine}
			</p>
		</div>

		{#if tickable > 0}
			<p class="thrive-numeric mt-1 text-xs text-muted-ink">
				{copy.doneOfTickable(done, tickable)}
			</p>
		{/if}
	</div>

	<!-- The "next up" LINE moved to the rail, where it sits under the day heading
	     and is the first thing read. `nextUp` stays a prop because the square strip
	     still marks that item, and the strip and the line have to agree about which
	     one it is -- passing the id separately would be two sources for one fact. -->
	<SquareGrid groups={squares} nextId={nextUp?.id} />
</section>
