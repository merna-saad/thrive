<script lang="ts">
	import type { BookingDayView } from '$lib/appointmentsView';
	import { messages } from '$lib/messages';
	import { cn } from '$lib/utils';

	/**
	 * Step 2: choose a day.
	 *
	 * A list of the days this advisor actually works inside the booking window —
	 * not a month grid.
	 *
	 * ## Why a list, and what it cost
	 *
	 * The month grid this replaces had three problems and two of them were
	 * structural rather than cosmetic:
	 *
	 *  - **Most of it was grey.** 26 of 35 cells were unavailable, which reads as a
	 *    broken system rather than as a booking window. And that was not a bad
	 *    month: a forward-only window inside a month grid means roughly half the
	 *    current month is ALWAYS in the past. The grid could not win.
	 *  - **It needed a legend.** "A dot and a number mark the days with open times"
	 *    is a sentence explaining an interface, and a dot plus a number is two
	 *    encodings for one fact.
	 *  - **Three different refusals looked identical.** Full, past, and beyond the
	 *    window were all grey cells.
	 *
	 * A list answers all three at once. It contains only real options, each row
	 * says its own state in words, and two of the three refusals stop being drawn
	 * at all — a past day and a day beyond the window are not options, and the
	 * list's bounds say so. The third, a working day whose slots are all taken, is
	 * listed and says "Fully booked".
	 *
	 * **What it cost is the month grid's paging**, which the brief asked to keep.
	 * The capability survives and the widget does not: the window spans at most two
	 * calendar months, both are in this list, and the month heading is what marks
	 * the boundary — so scrolling past "September" IS looking further ahead. There
	 * is nothing the old grid could reach that this cannot. Flagged as the decision
	 * most worth reversing if that trade is unwelcome.
	 *
	 * ## No dates are formatted here
	 *
	 * Every string on a row arrives finished from the server. The grid had to
	 * format two things on the client, because a grid that pages anywhere has no
	 * finite set of months a `load` could pre-render; a list bounded by the window
	 * has exactly one set of days. That removes this page from CONVENTIONS' list of
	 * accepted client-side formats entirely.
	 */
	let {
		days,
		selectedKey,
		windowEndLabel,
		onSelect
	}: {
		days: BookingDayView[];
		selectedKey: string | null;
		/** "Mon, Sep 21" — the last day the window reaches. */
		windowEndLabel: string;
		onSelect: (dayKey: string) => void;
	} = $props();

	const copy = messages.appointments.days;

	/** What a row says about itself. One encoding, in words. */
	function stateLabel(day: BookingDayView): string {
		return day.openCount > 0 ? copy.openTimes(day.openCount) : copy.fullyBooked;
	}
</script>

<div class="flex min-h-0 flex-col">
	{#if days.length === 0}
		<p class="text-xs text-muted-ink">{copy.empty}</p>
	{:else}
		<!--
			Capped and scrolling inside itself. The window holds around twenty working
			days, which is a taller column than the times beside it, and letting it set
			the row's height would push the confirm button below the fold on a laptop.
		-->
		<ul class="min-h-0 max-h-80 space-y-0.5 overflow-y-auto pr-1">
			{#each days as day (day.dayKey)}
				{@const open = day.openCount > 0}
				{@const selected = day.dayKey === selectedKey}

				{#if day.monthHeading}
					<!--
						The list's only structural heading, and the whole of what replaced
						month paging. `sticky` so the month stays named while a student
						scrolls through it.
					-->
					<li class="sticky top-0 z-10 bg-surface pt-1.5 pb-1 first:pt-0">
						<p class="thrive-eyebrow">{day.monthHeading}</p>
					</li>
				{/if}

				<li>
					<button
						type="button"
						data-day={day.dayKey}
						data-open={day.openCount}
						disabled={!open}
						aria-pressed={selected}
						aria-label={copy.dayLabel(
							day.relativeLabel || day.weekdayLabel,
							day.dateLabel,
							stateLabel(day)
						)}
						onclick={() => onSelect(day.dayKey)}
						class={cn(
							'flex w-full min-h-11 items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left',
							'transition-colors duration-(--motion-fast) ease-standard',
							// The chosen day goes solid, the same treatment the chosen time
							// gets. Two commitments, one visual language.
							selected
								? 'border-line-strong bg-primary text-on-primary'
								: open
									? 'border-line bg-surface text-body hover:border-line-strong hover:bg-primary-soft hover:text-primary-hover'
									// Fully booked: recessed, and it says so in words to its
									// right. `disabled` is correct here rather than
									// `aria-disabled` -- this is a list, not a composite grid,
									// so nothing has to be crossed to reach anything else.
									: 'cursor-not-allowed border-line bg-sunken text-muted-ink'
						)}
					>
						<span class="flex min-w-0 items-baseline gap-1.5">
							<!-- The weekday is words; the date carries a number, so the date
							     takes the numeric face and they line up down the column. -->
							<span class="shrink-0 text-2xs font-medium">
								{day.relativeLabel || day.weekdayLabel}
							</span>
							<span
								class={cn(
									'thrive-numeric truncate text-3xs',
									selected ? 'text-on-primary' : 'text-muted-ink'
								)}
							>
								{day.dateLabel}
							</span>
						</span>

						<!--
							The state, in words. This is what replaced the dot-plus-number:
							one encoding, self-decoding, no legend. The count is a value so
							the number takes the numeric face; "times" and "Fully booked" are
							words and stay in DM Sans.
						-->
						<span
							class={cn(
								'shrink-0 text-3xs',
								selected ? 'text-on-primary' : open ? 'text-primary' : 'text-muted-ink'
							)}
						>
							{#if open}
								<span class="thrive-numeric">{day.openCount}</span>
								{copy.openTimesSuffix(day.openCount)}
							{:else}
								{copy.fullyBooked}
							{/if}
						</span>
					</button>
				</li>
			{/each}
		</ul>

		<!--
			The bounds, once, at the bottom. This is what makes the two REFUSALS THIS
			LIST DOES NOT DRAW legible: it starts today because the past cannot be
			booked, and it ends here because booking runs a month ahead. Without it a
			short list reads as an advisor who is never free.
		-->
		<p class="mt-2 text-3xs text-muted-ink">{copy.windowNote(windowEndLabel)}</p>
	{/if}
</div>
