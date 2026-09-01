<script lang="ts">
	import { tick } from 'svelte';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	import Button from '$lib/components/ui/Button.svelte';
	import { messages } from '$lib/messages';
	import {
		addDays,
		categoriesForDay,
		categoryDot,
		categoryLabel,
		fromDayKey,
		monthGrid,
		type ScheduleData
	} from '$lib/schedule';
	import { cn } from '$lib/utils';

	/**
	 * The month grid.
	 *
	 * Up to three category dots per day plus a "+n" for the rest, a roving
	 * tabindex with real grid navigation, and a selection that pulls the view onto
	 * whatever month it lands in.
	 *
	 * ## The two dates this formats on the client, and why it has to
	 *
	 * The month label and each cell's accessible date are built with
	 * `toLocaleDateString` HERE rather than on the server, which is a documented
	 * exception to "components never see a raw timestamp" and not a lapse.
	 *
	 * The grid pages to any month with no round trip -- that is the whole reason
	 * classes stay as weekday rules -- so there is no set of months the server
	 * could pre-format. What it formats is a day key already built from local
	 * parts by `fromDayKey`, so the only thing that can differ between server and
	 * client is locale wording, never which day it is. CONVENTIONS.md lists this
	 * alongside the day heading and the agenda's group headings.
	 *
	 * ## `size` and `showTodayButton`
	 *
	 * Kept from the Next component although this phase has one call site. Both
	 * exist because the same grid is meant to serve as a compact picker beside a
	 * booking panel later, and a component that has to be edited to be reused in
	 * the way it was designed for is not reusable.
	 *
	 * ## TWO CALL SITES NOW, and both are interactive
	 *
	 * `/calendar` and `/appointments`' "Your month". They differ only in what they
	 * write to: the calendar's selection drives its own day panel, the
	 * appointments one drives "Your day" and nothing else. That is the caller's
	 * business, not this component's -- it takes `selectedKey` and `onSelect` and
	 * has no opinion about who is listening.
	 *
	 * ## A `readOnly` mode existed for one commit and is gone
	 *
	 * "Your month" was briefly a non-interactive reference: cells rendered as
	 * `<div>`s through `<svelte:element>`, no roles, no tabindex, no hover, the grid
	 * `aria-hidden`. It was removed because a month grid with dots INVITES a click
	 * and a grid that refuses one reads as broken, which is a stronger signal than
	 * any caption saying otherwise.
	 *
	 * Worth recording rather than just deleting, because the reasoning still holds
	 * in the other direction: **if a cell is not a control, it must not be an
	 * element that looks like one** -- and the fix there was to change the element,
	 * not to drop the handler, since a focusable cell that does nothing is worse
	 * than no cell. If a genuinely decorative month is ever wanted, that is the
	 * shape to go back to.
	 */
	let {
		data,
		todayKey,
		selectedKey,
		onSelect,
		monthKey,
		onMonthChange,
		showTodayButton = false,
		size = 'compact'
	}: {
		data: ScheduleData;
		/** "YYYY-MM-DD" for the real today, decided by the server. */
		todayKey: string;
		selectedKey: string;
		onSelect: (dayKey: string) => void;
		/** First of the visible month, "YYYY-MM-DD". */
		monthKey: string;
		onMonthChange: (monthKey: string) => void;
		/** Adds a "Today" jump. Wanted when this is the page's main calendar. */
		showTodayButton?: boolean;
		/** `comfortable` gives taller cells for use as a primary calendar. */
		size?: 'compact' | 'comfortable';
	} = $props();

	/** Days in a week, and the width of one grid row. */
	const WEEK_LENGTH = 7;

	/**
	 * Dots shown before collapsing into "+n".
	 *
	 * A cell is under 40px wide at 320px, so the counter has to buy its own room:
	 * once there is overflow, one dot is given up for it rather than letting the
	 * row spill past the cell edge.
	 */
	const MAX_DOTS = 3;

	/*
	 * NAMED CHIPS LIVED HERE FOR ONE PASS AND WERE REMOVED, 2026-08-30.
	 *
	 * They worked -- three per cell, course code or title, stream colour as a left
	 * rule -- and the grid still lost. With a class meeting every weekday, every
	 * weekday cell carried the same two truncated course codes down the whole
	 * month, so the eye had to read 42 cells of near-identical text to find the
	 * quiz. A dot says "something" in one glyph; a truncated chip says "something,
	 * and here are eleven characters of it" and costs a line of reading to reject.
	 *
	 * The division of labour is now explicit and it is the right one: THE GRID
	 * ANSWERS "IS ANYTHING HAPPENING", THE RAIL ANSWERS "WHAT". A grid that tries
	 * to answer both competes with the rail and wins neither.
	 *
	 * `categoryChipBorder` in `schedule.ts` went with them.
	 */

	const { grid: copy } = messages.calendar;

	let gridEl = $state<HTMLDivElement | null>(null);

	const roomy = $derived(size === 'comfortable');
	const cursor = $derived(fromDayKey(monthKey));
	const year = $derived(cursor.getFullYear());
	const month = $derived(cursor.getMonth());

	const days = $derived(monthGrid(year, month));
	const monthLabel = $derived(
		cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
	);

	/**
	 * Weeks, not a flat run of 42 cells.
	 *
	 * `role="grid"` needs its cells inside rows; a bare list of gridcells gives
	 * assistive tech no way to map a day onto a week, so table navigation walks
	 * off the end of the month instead of down a column.
	 */
	const weeks = $derived(
		Array.from({ length: days.length / WEEK_LENGTH }, (_, index) =>
			days.slice(index * WEEK_LENGTH, index * WEEK_LENGTH + WEEK_LENGTH)
		)
	);

	/**
	 * The single tab stop for the roving tabindex.
	 *
	 * Paging the month moves the grid without moving the selection, so on a month
	 * the selection is not part of, no rendered cell would hold `tabindex=0` and
	 * the entire grid would drop out of the tab order. Falling back to the first
	 * day of the visible month keeps it reachable.
	 */
	const tabStopKey = $derived(
		days.includes(selectedKey)
			? selectedKey
			: (days.find((key) => fromDayKey(key).getMonth() === month) ?? days[0])
	);

	/** "YYYY-MM-01" for whichever month a date belongs to. */
	function monthKeyOf(date: Date): string {
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
	}

	function shiftMonth(delta: number) {
		onMonthChange(monthKeyOf(new Date(year, month + delta, 1)));
	}

	/**
	 * Focus a day cell once the month it belongs to has been committed.
	 *
	 * `await tick()` rather than the Next version's `requestAnimationFrame`: the
	 * cell may not exist until Svelte has flushed the month change, and a tick is
	 * exactly that flush rather than a guess at how long it takes.
	 *
	 * NOT an arrival. `arriveAtRow` is for landing a student ON A ROW they asked
	 * about, and it marks what it lands on; this is navigation inside one widget,
	 * which CONVENTIONS.md carves out explicitly. Marking every arrow-key press
	 * would turn a wayfinding cue into a cursor.
	 */
	async function focusDay(selector: string) {
		await tick();
		gridEl?.querySelector<HTMLButtonElement>(selector)?.focus();
	}

	function goToday() {
		onMonthChange(`${todayKey.slice(0, 7)}-01`);
		onSelect(todayKey);
		focusDay(`[data-day="${todayKey}"]`);
	}

	/**
	 * Arrow keys walk the grid a day or a week at a time, the way a date picker is
	 * expected to behave. Moving past the edge of the month pulls the view along,
	 * so the focused day is always visible.
	 */
	function onKeyDown(event: KeyboardEvent) {
		/*
		 * Paging is handled first and cancels the event itself. In the Next version
		 * the shared `preventDefault()` sat after this branch, which returned
		 * early -- so paging a month also scrolled the document.
		 */
		if (event.key === 'PageUp' || event.key === 'PageDown') {
			event.preventDefault();
			shiftMonth(event.key === 'PageUp' ? -1 : 1);
			// The month swap unmounts the focused cell, which would drop focus to
			// the body and end the keyboard session after a single page. Land on
			// whichever cell the new month made its tab stop.
			focusDay('[data-day][tabindex="0"]');
			return;
		}

		const moves: Record<string, number> = {
			ArrowLeft: -1,
			ArrowRight: 1,
			ArrowUp: -WEEK_LENGTH,
			ArrowDown: WEEK_LENGTH
		};

		let target: string | null = null;

		if (event.key in moves) {
			target = addDays(selectedKey, moves[event.key]);
		} else if (event.key === 'Home') {
			target = addDays(selectedKey, -fromDayKey(selectedKey).getDay());
		} else if (event.key === 'End') {
			target = addDays(selectedKey, 6 - fromDayKey(selectedKey).getDay());
		}

		if (!target) return;
		event.preventDefault();

		const targetDate = fromDayKey(target);
		if (targetDate.getMonth() !== month || targetDate.getFullYear() !== year) {
			onMonthChange(monthKeyOf(targetDate));
		}

		onSelect(target);

		// Focus follows selection, so the roving tabindex lands where the user is.
		focusDay(`[data-day="${target}"]`);
	}

	/** A cell's whole accessible name: the date, how much is on it, and today. */
	function labelFor(dayKey: string, count: number): string {
		const date = fromDayKey(dayKey).toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
		const items = count === 0 ? copy.noItems : copy.itemCount(count);
		return copy.dayLabel(date, items, dayKey === todayKey);
	}
</script>

<div class="thrive-panel p-0">
	<!--
		THE HEADER BAND RECEDES IN THE ROOMY GRID, 2026-08-30.

		It was a `sunken` band with a hairline under it, which is the shape every
		other panel in THRIVE uses and was right when this was a picker inside
		something else. On the calendar it made the month label read as a title bar
		on a window -- a second heading competing with the page's `h1` and the rail's
		TODAY, on a card whose whole job is now to be the quiet half of the page.

		So on the calendar the band loses its fill and its rule and becomes part of
		the white card. The compact picker in `/appointments` keeps the band, where
		it still does the job it was drawn for.
	-->
	<div
		class={cn(
			'flex flex-wrap items-center justify-between gap-2 rounded-t-xl',
			roomy ? 'px-4 pt-4 pb-2' : 'border-b border-line bg-sunken px-2.5 py-2'
		)}
	>
		<!--
			THE MONTH TAKES DISPLAY TYPE in the roomy grid, at the step BELOW the
			rail's TODAY.

			"Recede" and "be set in the headline face" are not in tension here, and
			the first pass got that wrong by making the label lighter and greyer until
			it read as a caption. What has to recede is its WEIGHT IN THE PAGE, not
			its treatment: it is the grid card's own title, and in the reference it is
			plainly display type. It recedes by being one step smaller than TODAY and
			by having no band, no rule and no fill behind it -- not by being timid.
		-->
		<h2
			id="mini-cal-label"
			class={cn(
				'min-w-0',
				roomy ? 'thrive-display text-primary' : 'text-base font-medium text-ink'
			)}
			data-step={roomy ? 'xl' : undefined}
		>
			{monthLabel}
		</h2>

		<!-- Each control is a real 44px box rather than a small button wearing an
		     invisible 44px pseudo-element. The old shape overlapped its neighbour by
		     12px and the overlap resolved to whichever button painted last -- so
		     part of the visible "previous" chevron paged FORWARD. `gap-2` keeps 8px
		     of clear air between the targets. -->
		<div class="flex shrink-0 items-center gap-2">
			{#if showTodayButton}
				<Button onclick={goToday} class="h-11">{copy.today}</Button>
			{/if}
			<Button onclick={() => shiftMonth(-1)} aria-label={copy.previousMonth} class="size-11">
				<ChevronLeft aria-hidden="true" class="size-4" />
			</Button>
			<Button onclick={() => shiftMonth(1)} aria-label={copy.nextMonth} class="size-11">
				<ChevronRight aria-hidden="true" class="size-4" />
			</Button>
		</div>
	</div>

	<!-- GENEROUS ON ALL FOUR SIDES IN THE ROOMY GRID, one step in the compact one.
	     The old note said every pixel here is taken off seven day cells and the
	     cells have to stay tappable, which is still true of the picker: it is 240px
	     wide and its cells are already at the 44px floor.
	     The calendar's grid is 869px, where the constraint inverts. Numbers running
	     into the card's edge is what made the month read as a spreadsheet rather
	     than a page, and there is width to spare. -->
	<div
		bind:this={gridEl}
		role="grid"
		aria-labelledby="mini-cal-label"
		onkeydown={onKeyDown}
		class={roomy ? 'p-2 lg:p-4' : 'p-1'}
		tabindex="-1"
	>
		<!-- The column headers take `.thrive-eyebrow`: small, uppercase, tracked,
		     muted. They were already uppercase and muted at `text-3xs` but untracked,
		     which at one letter per column reads as a stray character rather than a
		     label. The class is the system's one answer for this shape, and using it
		     here means the grid's header and every other eyebrow on the page cannot
		     drift apart. -->
		<div role="row" class="grid grid-cols-7 pb-2">
			{#each copy.weekdayInitials as initial, index (copy.weekdayNames[index])}
				<!-- The role goes on a div and the abbreviation sits inside it. The Next
				     version put `role="columnheader"` on the `<abbr>` itself, which is a
				     grid role on a non-interactive element -- svelte-check rejects it,
				     and it is right to: the header is a cell, and `<abbr>` is the
				     shortening of the word inside that cell. Two jobs, two elements. -->
				<div role="columnheader" class="text-center">
					<abbr
						title={copy.weekdayNames[index]}
						class={cn(
							'no-underline',
							/*
							 * PROMINENT, not muted, in the roomy grid. The first pass made
							 * these `.thrive-eyebrow` -- 11.25px, muted, heavily tracked --
							 * on the reasoning that a column header is a label. At ONE
							 * LETTER per column that came out as seven faint marks nobody
							 * reads, and the reference sets them dark and medium instead.
							 * They are the grid's own axis, and an axis you cannot read is
							 * furniture.
							 */
							roomy
								? 'text-xs font-medium tracking-wide text-body uppercase'
								: 'text-3xs text-muted-ink uppercase'
						)}
					>
						{initial}
					</abbr>
				</div>
			{/each}
		</div>

		<!--
			NO LATTICE IN THE ROOMY GRID, 2026-08-30.

			The rules used to be the container showing through the gaps -- a `bg-line`
			parent with `gap-0.5`, which draws every interior line exactly once and
			keeps the outer edge even. That is still the right technique, and the
			compact picker still uses it: at 240px wide, cells that small need an edge
			to be countable.

			The calendar's grid is 869px and does not. Whitespace separates the cells
			perfectly well at that size, and the lattice was doing something worse than
			nothing -- 42 boxed cells read as a spreadsheet, which is the single
			strongest reason the page had no rest. Removing it is most of what makes
			the grid the quiet half of the page.
		-->
		<div
			role="rowgroup"
			class={cn(
				'flex flex-col',
				roomy ? 'gap-1' : 'gap-0.5 border border-line bg-line'
			)}
		>
			{#each weeks as week (week[0])}
				<div role="row" class={cn('grid grid-cols-7', roomy ? 'gap-1' : 'gap-0.5')}>
					{#each week as dayKey (dayKey)}
						{@const date = fromDayKey(dayKey)}
						{@const inMonth = date.getMonth() === month}
						{@const isToday = dayKey === todayKey}
						{@const isSelected = dayKey === selectedKey}
						{@const categories = categoriesForDay(data, dayKey)}
						{@const shown = categories.length > MAX_DOTS ? MAX_DOTS - 1 : MAX_DOTS}
						{@const overflow = categories.length - shown}

						<button
							type="button"
							role="gridcell"
							data-day={dayKey}
							aria-label={labelFor(dayKey, categories.length)}
							aria-selected={isSelected}
							aria-current={isToday ? 'date' : undefined}
							tabindex={dayKey === tabStopKey ? 0 : -1}
							onclick={() => onSelect(dayKey)}
							class={cn(
								'relative flex flex-col gap-1 overflow-hidden',
								// The number sits in the UPPER AREA with room beneath it, and the
								// dots sit centred in that room. `justify-start` plus a top pad
								// rather than `justify-center`, because a centred stack puts the
								// number in the middle of the cell and the air all round it --
								// what a calendar wants is the number anchored and the space
								// below it doing the breathing.
								roomy
									? 'items-center justify-start pt-2 lg:pt-2.5'
									: 'items-center justify-center',
								// A 44px cell on a phone, and a NAMED TOKEN in the roomy grid --
								// see `--thrive-cal-cell`. The token outlived the chips it was
								// introduced for: the cell is tall because a calendar wants air
								// under its numbers, which is a reason that does not depend on
								// what is in the cell.
								//
								// The old note, kept because the lesson recurs: `lg:h-9` (30.38px)
								// left 8 of the 42 cells reporting `scrollHeight > clientHeight`,
								// because even a dot row needs 32px.
								roomy ? 'h-11 lg:h-cal-cell' : 'h-9 lg:h-9',
								'transition-colors duration-(--motion-fast) ease-standard',
								// ── NO FILLS EXCEPT THE SELECTION, in the roomy grid ──────────
								//
								// The cells used to carry three surfaces: white for an in-month
								// weekday, cream for a weekend, sunken for another month. All
								// three are gone here and the cells sit on the card's own white.
								//
								// Whitespace separates them now (see the rowgroup), and once the
								// lattice went, tinted cells read as blocks of colour in a field
								// rather than as recessed days. "Not this month" goes back to
								// being said by the NUMBER -- which is what the reference does,
								// and it is enough once there is no box around it to compete.
								//
								// The compact picker keeps all of it. It is 240px wide with a
								// lattice, where a tint is the only thing that can say "other
								// month" at that size.
								roomy
									? inMonth
										? 'text-body'
										: 'text-faint'
									: inMonth
										? 'bg-surface text-body'
										: 'bg-sunken text-muted-ink',
								roomy && 'rounded-md',
								!isSelected && 'hover:bg-primary-soft',

								// ── TODAY IS NOT A FILL. THE SELECTION IS. ────────────────────
								//
								// Reversed on 2026-08-30 to match the reference, and the reference
								// is right about which way round it goes.
								//
								//   selected   a FILL. The student put it there, it follows their
								//              click, and a solid block is what a cursor looks
								//              like when it lands on a grid.
								//   today      a WEIGHT and a MARK. It is a property of the
								//              world, it moves on its own, and it has to stay
								//              legible while the student is looking at some other
								//              day -- which a fill cannot do, because the
								//              selection needs that fill.
								//
								// The earlier arrangement gave today the fill and left the
								// selection an outline, and it failed the moment both were on
								// screen: the heavier mark sat on the day you were not looking at.
								isSelected && 'bg-primary text-on-primary',
								isToday && !isSelected && 'font-medium text-primary'
							)}
						>
							<!-- A day number is a value. `.thrive-numeric` carries the face and
							     tabular figures, so 1 and 11 sit in the same column. -->
							<span class={cn(
									// `leading-none` LOSES here, and has since this component was
									// written. A `text-*` utility ships a line-height of its own and
									// wins, so the number's box is 18px rather than 12.75. That was
									// invisible while cells were 41.25px tall and became visible the
									// moment they were not -- 8 of the 42 clipped their dot row.
									//
									// Left as-is rather than forced. The cell is sized to the box the
									// browser actually produces, because a utility fight settled by
									// stylesheet order is a worse thing to depend on than a height
									// that was measured.
									'thrive-numeric leading-none',
									// Left-aligned in the roomy grid, so the number and the chips
									// under it share one edge. Centred numbers over left-aligned
									// chips read as two different grids stacked.
									// LARGER AND LIGHTER in the roomy grid. It was `lg:text-xs` (12.75px)
									// and it is now `lg:text-lg` (17.25px) at weight 400 -- a day
									// number is the thing you scan for, and it was set smaller than
									// the body copy beside it. Lighter, not bolder, because there are
									// 42 of them: at 500 the grid reads as a wall of emphasis and
									// nothing inside it can stand out.
									//
									// Today keeps the weight it had. It is the one number that should
									// be heavier than its neighbours, and now it is the only one.
									roomy ? 'text-base lg:text-lg' : 'text-2xs lg:text-3xs',
									roomy && (isToday ? 'font-medium' : 'font-normal'),
									roomy && 'shrink-0'
								)}>
								{date.getDate()}
							</span>

							<!-- The dots repeat what the cell's accessible name already says in
							     words, so nothing here rests on colour alone. -->
							<!-- The row reserves the dot's height whether or not there are any,
						     so a day with nothing on it is the same height as a day with three
						     and the grid cannot reflow as the filter changes. Both sizes come
						     from ONE token: a `size-cal-dot` paired with a hand-picked
						     wrapper height would clip the moment either was retuned. -->
							<!-- CENTRED UNDER THE NUMBER in the roomy grid, which is why the wrapper
							     takes the full cell width there. The number sits in the upper area
							     and the dots sit beneath it, so a column of cells reads as one
							     rhythm rather than as text with a marker stuck beside it. -->
							<span
								class={cn(
									'flex h-cal-dot items-center gap-0.5',
									roomy && 'w-full justify-center'
								)}
								aria-hidden="true"
							>
								{#if isToday}
									<!--
										THE TODAY MARK, and gold's first of two roles on this page.

										A dot rather than a ring or a fill, because the selection owns
										the fill and a ring round an unfilled cell in a grid with no
										lattice reads as a box that wandered in.

										IT IS NOT THE ONLY CARRIER, and cannot be: gold is 1.50:1 on
										this card and `check-contrast.py` holds that ceiling on purpose
										under WCAG 1.4.11. The cell also carries `font-medium`, the
										navy `text-primary`, `aria-current="date"` and the word
										"today" inside its accessible name. Gold buys speed here, not
										meaning -- exactly as it does on the urgent rail card.

										FIRST in the row, so it reads as a property of the day rather
										than as one more stream on it.

										IT SHOWS EVEN WHEN TODAY IS SELECTED, which is not obvious and
										was wrong on the first pass. Today IS the selected day on load,
										so suppressing it there left the page's DEFAULT state with no
										gold on it at all -- an accent this brief reserves two roles
										for, invisible until the student clicked elsewhere. On the navy
										fill gold measures 9.45:1, which app.css calls its one legible
										home, so this is also the single place in the whole system
										where the mark is unambiguously legible rather than decorative.
									-->
									<span class="size-cal-dot shrink-0 rounded-pill bg-yellow"></span>
								{/if}
								{#each categories.slice(0, shown) as category (category)}
									<span
										title={categoryLabel[category]}
										class={cn(
											'size-cal-dot rounded-pill',
											/*
											 * QUIETER IN THE ROOMY GRID, and this is the one place the
											 * chroma pass of 2026-08-21 is deliberately walked back.
											 *
											 * That pass raised these hues to their gamut maximum
											 * BECAUSE of this grid: eleven categories over eight
											 * colours read muddy at 6px, so the dots got bigger and
											 * more saturated. It worked. What changed is the page
											 * around them -- the rail now names everything on the
											 * selected day, so the grid's job narrowed from "which
											 * streams" to "is anything happening", and eight fully
											 * saturated dots per row is louder than that question.
											 *
											 * OPACITY, NOT A SECOND SET OF TOKENS. A desaturated
											 * palette would be eleven new values to repalette, to
											 * measure, and to keep in step with the originals. This
											 * is the same token at 70%, so a repalette moves it and
											 * the contrast gate has nothing new to check -- and it is
											 * scoped to `roomy`, so the compact picker in
											 * `/appointments` keeps the full-strength dots it was
											 * tuned for.
											 */
											roomy && 'opacity-70',
											// TODAY is the only FILLED cell now, so it is the only one
											// whose dots need to invert. A selected day that is not
											// today is outlined, so its dots keep their stream colour.
											isToday ? 'bg-on-primary' : categoryDot[category]
										)}
									></span>
								{/each}
								{#if overflow > 0}
									<span
										class={cn(
											'thrive-numeric text-3xs leading-none',
											isToday ? 'text-on-primary' : 'text-muted-ink'
										)}
									>
										{copy.overflow(overflow)}
									</span>
								{/if}
							</span>
						</button>
					{/each}
				</div>
			{/each}
		</div>
	</div>
</div>
