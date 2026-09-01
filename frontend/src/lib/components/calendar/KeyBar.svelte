<script lang="ts">
	import AlertTriangle from '@lucide/svelte/icons/triangle-alert';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';

	import {
		setCalendarPrefs,
		showAllCategories,
		toggleCategory,
		toggleLabel,
		type CalendarPrefs
	} from '$lib/calendarPrefs';
	import SectionHeading from '$lib/components/SectionHeading.svelte';
	import { messages } from '$lib/messages';
	import { categoryDot, categoryLabel, legendOrder } from '$lib/schedule';
	import { cn } from '$lib/utils';

	/**
	 * The key: what each colour means, and what is currently showing.
	 *
	 * It replaced a read-only legend sitting above a calendar nobody could filter.
	 * The same row still teaches the dots and now also switches them, which is
	 * strictly better than a legend beside a filter both saying overlapping things.
	 *
	 * ## TWO DIMENSIONS, AND THEY DO NOT MERGE
	 *
	 * ```
	 *   STREAMS   where a thing came from   fixed, known at build time, legendOrder
	 *   LABELS    what the student called it   open-ended, appears as they use it
	 * ```
	 *
	 * Collapsing them into one list of chips is the obvious simplification and it
	 * is wrong. A stream is a KIND OF THING; a label is something a student made
	 * up. Mixed together, "Career" and somebody's "thesis" look like the same kind
	 * of switch, and they are not — one is a category of source that every student
	 * has, the other is a personal annotation that exists only because this student
	 * typed it.
	 *
	 * They are kept apart structurally rather than by styling: separate headings,
	 * separate lists, separate prefs fields (`hidden` and `hiddenLabels`), separate
	 * toggle helpers (`toggleCategory` and `toggleLabel`), and the labels section
	 * does not render at all when nothing is labelled. Nothing here iterates a
	 * merged array, so a future edit cannot flatten them by accident.
	 *
	 * ## Where the labels come from, and why not from the filtered data
	 *
	 * `allLabels` runs on the UNFILTERED merge, upstream in `CalendarView`. Hiding
	 * a label must not remove its own chip from the key — there would then be no
	 * way to switch it back on. Load-bearing, and easy to "tidy" into a bug.
	 *
	 * ## The toggles are real checkboxes
	 *
	 * So keyboard and screen-reader behaviour come from the platform. The dot is
	 * decorative; the word carries the meaning, and every chip has an accessible
	 * name saying what pressing it will DO rather than what is currently true.
	 */
	let {
		prefs,
		labels,
		ignoredEventCount
	}: {
		prefs: CalendarPrefs;
		/** Every label in use, from the merged schedule BEFORE filtering. */
		labels: string[];
		/** How many events are ignored right now, for the toggle's count. */
		ignoredEventCount: number;
	} = $props();

	const copy = messages.calendar.key;

	const hiddenCount = $derived(prefs.hidden.length + prefs.hiddenLabels.length);
	const allHidden = $derived(prefs.hidden.length === legendOrder.length);

	/*
	 * A chip is a real control, so it owes a real touch target below `lg` — a
	 * filter nobody can hit is not a filter. It relaxes to its natural height on a
	 * pointer device, the same shape `ShowMore` uses, because eleven 44px chips
	 * stacked on a phone is already most of a screen and doing that on desktop
	 * would be spending height for nothing.
	 *
	 * The `has-[:focus-visible]` clause exists because the input is `sr-only`.
	 * The app's global focus ring lands on the input, which is a 1px clipped box,
	 * so without moving it out to the chip a keyboard user gets no ring at all.
	 * Same 2px primary outline at the same 2px offset the base layer draws, so
	 * there is one focus treatment in this app rather than two.
	 *
	 * Verified in the built page: the ring computes to `rgb(24, 43, 73)`, which is
	 * `--thrive-primary`. Worth knowing HOW it was verified, because the first
	 * reading said otherwise — Tailwind v4's `transition-colors` includes
	 * `outline-color`, so a computed style read the instant after focus lands is
	 * still 120ms of fade away from the real value. See FINDINGS.
	 */
	const chip =
		'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xs border px-2 text-2xs ' +
		'transition-colors duration-(--motion-fast) ease-standard lg:min-h-0 lg:py-1 ' +
		'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary';

	/**
	 * A CHIP THAT WRAPS. Changed back on 2026-09-01, when the Key left the rail.
	 *
	 * ## This is the second flip, and the first one was right at the time
	 *
	 * These were wrapping chips, became full-width rows, and are chips again. The
	 * note that made them rows is worth keeping because its reasoning still holds
	 * wherever it applies:
	 *
	 *   "Eleven chips wrapped into four ragged rows, which is the hardest possible
	 *    shape to scan: no two rows start in the same place, and the dot -- the
	 *    thing that ties a name to a colour in the grid -- landed at a different x
	 *    on every line. One per line puts every dot in one column, so the legend
	 *    can be read down its left edge."
	 *
	 * True, and it was measured against a ~165px column where eleven chips wrapped
	 * to FOUR ragged lines. Under the grid the width is ~855px and the same eleven
	 * fit on two, which is not a ragged block -- it is a strip. The scanning cost
	 * the old note describes scales with how many lines the wrap produces, and at
	 * two it is smaller than the cost of an 11-deep column of furniture.
	 *
	 * So `w-full` is gone, which is the whole difference. What did NOT change:
	 * `min-h-11` on touch relaxing to `lg:min-h-8`. Wrapping is a layout decision
	 * and must not quietly become a touch-target decision.
	 */
	const streamRow =
		'flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border px-2.5 text-2xs ' +
		'transition-colors duration-(--motion-fast) ease-standard lg:min-h-8 ' +
		'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary';

	/** Off reads as switched OFF, not absent: the chip stays, struck through. */
	const chipOn = 'border-line-strong bg-surface text-body';
	const chipOff = 'border-line bg-transparent text-faint line-through';

	const toggleRow =
		'flex min-h-11 cursor-pointer items-center gap-1.5 text-2xs text-muted-ink lg:min-h-0';
</script>

<section aria-labelledby={copy.headingId} class="thrive-panel">
	<!-- Quiet since 2026-08-30. "Key" was drawn at the same weight as the day
	     heading and the page title, so a legend was competing with the calendar it
	     explains. It sits UNDER THE GRID as of 2026-09-01 -- beside the thing it
	     explains rather than at the foot of a rail about the day -- and it should
	     read as a footnote to the month above it. Nothing was ever removed: every
	     stream, both dimensions and the hidden count have survived all three
	     arrangements. -->
	<SectionHeading
		id={copy.headingId}
		title={copy.title}
		prefix={copy.prefix}
		tone="quiet"
		count={hiddenCount > 0 ? copy.hiddenCount(hiddenCount) : undefined}
	>
		{#snippet action()}
			<span class="flex gap-2">
				<!-- Both write through the prefs helpers rather than assembling a
				     partial here. `showAllCategories` clears BOTH dimensions, which is
				     what "show all" has to mean once there are two of them. -->
				<button
					type="button"
					onclick={() => showAllCategories()}
					class="min-h-11 text-2xs text-muted-ink underline-offset-2 hover:text-ink hover:underline lg:min-h-0"
				>
					{copy.showAll}
				</button>
				<button
					type="button"
					onclick={() => setCalendarPrefs({ hidden: [...legendOrder] })}
					class="min-h-11 text-2xs text-muted-ink underline-offset-2 hover:text-ink hover:underline lg:min-h-0"
				>
					{copy.hideAll}
				</button>
			</span>
		{/snippet}
	</SectionHeading>

<!--
	WRAPPING ROWS, UNDER THE GRID. (2026-09-01)

	The note here used to read "ONE COLUMN, because the panel is a 165px side
	column again", and every part of that premise has since expired: the rail is
	300px, it holds the selected day, and the Key is no longer in it at all.

	Under the grid the constraint inverts. Width went from 165px to ~855px and the
	scarce axis became vertical, so eleven stacked full-width rows -- which cost
	nothing beside a tall day panel -- became the tallest thing on the page after
	the month itself. Wrapped chips put the same eleven controls on two lines.

	THE TWO DIMENSIONS ARE STILL TWO DIMENSIONS. Wrapped is not merged: each keeps
	its own heading, its own `aria-labelledby` list, and its own toggle function.
	Nothing was flattened into one list of chips.
-->
<div class="mt-3 space-y-3">
	<div class="min-w-0">
		<!-- Dimension one: streams. A fixed list, in legend order, one per line. -->
		<p id="key-streams" class="thrive-eyebrow">{copy.streams}</p>
		<ul aria-labelledby="key-streams" class="mt-1.5 flex flex-wrap gap-1.5">
			{#each legendOrder as category (category)}
				{@const on = !prefs.hidden.includes(category)}
				{@const name = categoryLabel[category]}
				<li>
					<label class={cn(streamRow, on ? chipOn : chipOff)}>
						<input
							type="checkbox"
							checked={on}
							onchange={() => toggleCategory(category)}
							aria-label={copy.streamToggle(name, on)}
							class="sr-only"
						/>
						<span
							aria-hidden="true"
							class={cn('size-2 shrink-0 rounded-pill', on ? categoryDot[category] : 'bg-faint')}
						></span>
						{name.toLowerCase()}
					</label>
				</li>
			{/each}
		</ul>
	</div>

	<div class="min-w-0 space-y-3">
		<!--
			Dimension two: labels. Open-ended, and absent entirely when nothing is
			labelled — an empty "labels" heading would advertise a dimension this
			student does not use.

			Wrapped to match the streams, so the two dimensions read as the same KIND
			of list rather than one being a strip and the other a column.

			No dot. A label has no colour because it has no stream, and giving it one
			would be the first step to it reading as a stream. It is also why these rows
			are NOT `w-full` the way the stream rows are: `items-start` shrinks each to
			its text, so a label is visibly a different kind of thing rather than a
			stream row with the dot missing.
		-->
		{#if labels.length > 0}
			<div>
				<p id="key-labels" class="thrive-eyebrow">{copy.labels}</p>
				<ul aria-labelledby="key-labels" class="mt-1.5 flex flex-wrap items-start gap-1.5">
					{#each labels as label (label)}
						{@const on = !prefs.hiddenLabels.includes(label)}
						<li>
							<label class={cn(chip, on ? 'border-line-strong bg-sunken text-body' : chipOff)}>
								<input
									type="checkbox"
									checked={on}
									onchange={() => toggleLabel(label)}
									aria-label={copy.labelToggle(label, on)}
									class="sr-only"
								/>
								{label}
							</label>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<!--
			The three view toggles, STACKED as well.

			A horizontal row again, and this is the second time this has flipped --
			worth recording, because both flips were right. Beside a horizontal strip
			of chips a row was correct; inside a 165px column it read as a leftover and
			became one control per line; under an 855px grid it is a row once more.
			The rule underneath is stable even though the answer keeps moving: THESE
			FOLLOW THE FLOW OF THE CHIPS ABOVE THEM, because they belong to the same
			panel and a panel with a wrapped strip over a stacked column reads as two
			panels.

			The rule above them is kept. They are not a third dimension — they change
			what the calendar shows about items it is already showing — and the line is
			what says so.
		-->
		<div class="flex flex-wrap gap-x-4 gap-y-1 border-t border-hairline pt-2.5">
		<label class={toggleRow}>
			<input
				type="checkbox"
				class="thrive-checkbox"
				checked={prefs.showDone}
				onchange={(event) => setCalendarPrefs({ showDone: event.currentTarget.checked })}
			/>
			{copy.doneItems}
		</label>

		<label class={toggleRow}>
			<input
				type="checkbox"
				class="thrive-checkbox"
				checked={prefs.urgentOnly}
				onchange={(event) => setCalendarPrefs({ urgentOnly: event.currentTarget.checked })}
			/>
			<AlertTriangle aria-hidden="true" class="size-3 text-urgent" />
			{copy.urgentOnly}
		</label>

		<!-- Same control style as the two above, deliberately. The calendar is the
		     record of what exists, so this is how an ignored event becomes
		     recoverable — Home has no equivalent by design. The count is shown
		     because otherwise there is no way to tell whether flipping it will
		     change anything. -->
		<label class={toggleRow}>
			<input
				type="checkbox"
				class="thrive-checkbox"
				checked={prefs.showIgnored}
				onchange={(event) => setCalendarPrefs({ showIgnored: event.currentTarget.checked })}
			/>
			<EyeOff aria-hidden="true" class="size-3" />
			{copy.ignoredEvents}
			{#if ignoredEventCount > 0}
				<span class="thrive-numeric">{copy.ignoredCount(ignoredEventCount)}</span>
			{/if}
		</label>
		</div>
	</div>
</div>

	<!-- Not an error state, but the one case where the page below is empty for a
	     reason the student caused and might not remember causing. -->
	{#if allHidden}
		<p class="mt-2 flex items-center gap-1.5 text-2xs text-urgent">
			<Eye aria-hidden="true" class="size-3.5 shrink-0" />
			{copy.allHidden}
		</p>
	{/if}
</section>
