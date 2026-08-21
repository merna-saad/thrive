<script lang="ts">
	import { untrack } from 'svelte';

	import CalendarHeader from '$lib/components/calendar/CalendarHeader.svelte';
	import DayGroupToggle from '$lib/components/calendar/DayGroupToggle.svelte';
	import DaySection from '$lib/components/calendar/DaySection.svelte';
	import MiniCalendar from '$lib/components/calendar/MiniCalendar.svelte';
	import { arrangeDay, squareGroupsFor } from '$lib/calendarDay';
	import { calendarPrefs } from '$lib/calendarPrefs';
	import { mergedSchedule } from '$lib/calendarSources';
	import { ignoredEvents } from '$lib/ignoredEvents';
	import { messages } from '$lib/messages';
	import {
		filterSchedule,
		fromDayKey,
		itemsForDay,
		nextUpItem,
		personalItemsForDay,
		scheduleItemsForDay,
		type ScheduleData,
		type ScheduleItem
	} from '$lib/schedule';
	import { tickItem } from '$lib/tickItem';
	import type { Task } from '$lib/data';

	/**
	 * The Calendar page's one stateful node.
	 *
	 * Everything the student is committed to, everything they set themselves, and
	 * everything they could opt into -- on one page, filterable.
	 *
	 * Three rules hold this together:
	 *
	 *  1. **ONE filter, applied once.** `filterSchedule` runs on the whole
	 *     `ScheduleData` before anything renders, so the month dots and the day
	 *     lists are reading the same rows. The old failure -- a dot on a day with
	 *     no row beneath it -- becomes structurally impossible rather than
	 *     something to remember. If a view added later needs filtered data, give
	 *     it this result; do not filter again downstream.
	 *
	 *  2. **ONE `selectedKey`.** Every view that lands here reads and writes it,
	 *     so switching view will never lose the student's place.
	 *
	 *  3. **The clock is the server's.** `nowMinutes` arrives as a prop. Nothing
	 *     in this subtree asks the browser what time it is -- see the note in
	 *     `+page.server.ts` for why the sanctioned client read was declined.
	 *
	 * ## Phase 7a is the spine
	 *
	 * Month view, the selected day, and that day's non-event items. `ViewSwitcher`,
	 * `WeekView`, `AgendaView`, `KeyBar`, `ItemDetail`, `AddItemForm` and
	 * `DayEventsSection` are 7b and 7c. Nothing is stubbed: `detail` below is real
	 * state with no writer yet, and it is the only thing here that anticipates
	 * anything.
	 *
	 * ## `prefs` is read but not yet steerable
	 *
	 * `filterSchedule` already honours every dimension in `CalendarPrefs`, and
	 * `DayGroupToggle` already writes `dayGroupBy`. The rest -- hidden categories,
	 * hidden labels, urgent-only, show-ignored -- has no control until `KeyBar`
	 * lands in 7b, so those read at their defaults. Wiring the filter now rather
	 * than later is deliberate: it is the one place the filter may be applied, and
	 * adding it at the same time as the control that drives it is how a second
	 * application appears somewhere else.
	 */
	let {
		data,
		tasks,
		todayKey,
		nowMinutes
	}: {
		data: ScheduleData;
		/** The server's task rows. Merged here, on the client, never upstream. */
		tasks: Task[];
		todayKey: string;
		/** Minutes past midnight at the server's instant. */
		nowMinutes: number;
	} = $props();

	const copy = messages.calendar;

	/*
	 * Both seeded from `todayKey` and then owned outright.
	 *
	 * `untrack` says out loud what the seeding means: the prop is the INITIAL
	 * value, not a source this state follows. Without it svelte-check warns that
	 * only the initial value is captured, and it is right to ask -- the answer just
	 * happens to be "yes, deliberately". A student who selects the 4th and leaves
	 * the tab open past midnight keeps the 4th selected; the grid's "today" ring
	 * reads `todayKey` directly and moves on its own.
	 */
	let selectedKey = $state(untrack(() => todayKey));
	let monthKey = $state(untrack(() => `${todayKey.slice(0, 7)}-01`));
	/**
	 * The item whose detail dialog is open.
	 *
	 * Declared now and never written: `ItemDetail` is 7c, and `ItemRow` is not
	 * given an `onOpen` handler, so nothing can set it. Kept because it is one of
	 * the three pieces of state this node owns and moving it in later would mean
	 * re-deciding where it lives.
	 */
	let detail = $state<ScheduleItem | null>(null);

	const prefs = $derived(calendarPrefs());

	/*
	 * The merge, then the filter, in that order and once each.
	 *
	 * `mergedSchedule` folds the student's own tasks, to-dos and custom events
	 * onto the server's rows -- it reads nine stores, all of which are empty until
	 * `hydrateStores()` has run, so the server and the first client render both
	 * see "no personal items" and the student's rows land on the render after
	 * mount. That is correct rather than broken: un-personalised, not wrong.
	 *
	 * A plain `$derived` and no memo. React needed `useMemo` over nine
	 * dependencies here; Svelte tracks the signals the expression actually reads,
	 * so there is no dependency array to keep in step with the body.
	 */
	const merged = $derived(mergedSchedule(data, tasks));

	/**
	 * Ignored ids, in the ONE key space both surfaces share.
	 *
	 * These are raw `Event.id`s -- the store keys on exactly what Home writes and
	 * normalises nothing, and `isVisible` strips the calendar's own `evt-` prefix
	 * off an item id to match against them. So ignoring an event on Home hides it
	 * here and the reverse, which is what the store's headline has always claimed
	 * and did not do until Phase 7a. See `ignoredEvents.ts` and the cross-surface
	 * test in `calendarStores.spec.ts`.
	 */
	const ignoredEventIds = $derived(Object.keys(ignoredEvents()));

	/** THE one filter application. Everything below reads this. */
	const filtered = $derived(
		filterSchedule(merged.data, {
			hidden: prefs.hidden,
			hiddenLabels: prefs.hiddenLabels,
			showDone: prefs.showDone,
			urgentOnly: prefs.urgentOnly,
			ignoredEventIds,
			showIgnored: prefs.showIgnored
		})
	);

	const dayItems = $derived(itemsForDay(filtered, selectedKey));
	const schedule = $derived(scheduleItemsForDay(filtered, selectedKey));
	const personal = $derived(personalItemsForDay(filtered, selectedKey));
	/*
	 * `eventItemsForDay` is deliberately NOT called here. The day's events are in
	 * `dayItems` -- they count toward the header's figure and they dot the month
	 * grid -- but nothing this phase renders them as rows, so computing the slice
	 * and discarding it would read as a section someone forgot to mount. It
	 * arrives with `DayEventsSection` in 7c.
	 */

	const isToday = $derived(selectedKey === todayKey);

	/*
	 * The day's heading, formatted from a day key built out of local parts.
	 *
	 * One of the client-side `toLocaleDateString` calls CONVENTIONS.md accepts by
	 * name: the day is chosen in the browser, so no server render could have
	 * pre-formatted it, and what varies is locale wording rather than which day it
	 * is.
	 */
	const heading = $derived(
		fromDayKey(selectedKey).toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		})
	);

	/*
	 * "Next up" only means anything relative to a clock, and only on today. On any
	 * other day the first timed item is the honest answer, which is what passing 0
	 * produces -- `nextUpItem` takes `now` as a parameter precisely so this
	 * decision belongs to the caller.
	 */
	const nextUp = $derived(nextUpItem(dayItems, isToday ? nowMinutes : 0));

	/**
	 * The square strip and the day's groups, both from `$lib/calendarDay`.
	 *
	 * Extracted rather than written here because nothing in this file can be
	 * tested -- the suite runs in Node with no jsdom -- and both of these have a
	 * branch that has been got wrong before. The concatenation below is the one to
	 * watch: `schedule` and `personal` are two filtered slices of an
	 * already-sorted day, and two sorted lists joined end to end are not sorted,
	 * so `arrangeDay` sorts again.
	 */
	const squares = $derived(squareGroupsFor(schedule, personal));
	const dayGroups = $derived(
		arrangeDay([...schedule, ...personal], prefs.dayGroupBy, copy.day.chronological)
	);

	/*
	 * One live region, mounted always, only its text swapped. A region created and
	 * populated in the same tick announces unreliably, and two regions talk over
	 * each other.
	 *
	 * It counts the schedule and the list only. The Next version also said "N to
	 * register for", and repeating that here would announce a number with nothing
	 * on the page behind it until 7c builds the events section.
	 */
	const announcement = $derived(
		copy.header.announcement(heading, schedule.length, personal.length)
	);

	function select(dayKey: string) {
		selectedKey = dayKey;
		// Selecting a day from an adjacent month pulls the view onto that month, so
		// the selection is never off-screen.
		const dayMonth = `${dayKey.slice(0, 7)}-01`;
		if (dayMonth !== monthKey) monthKey = dayMonth;
	}

	/*
	 * No third argument and no lookup. The item carries its own source row --
	 * `mergedSchedule` attached the resolved `Task` or `QuickItem` -- and
	 * `tickItem` dispatches on that. The version that sliced a prefix off the id
	 * and searched an array silently missed every self-added task and every
	 * undated to-do. See CONVENTIONS.md.
	 */
	const onTick = (item: ScheduleItem, done: boolean) => tickItem(item, done);
</script>

<!-- Capped and centred rather than full width: a month grid stops being readable
     when its columns stretch across a desktop. The wider `max-w-5xl` the other
     views want arrives with them in 7b. -->
<div class="mx-auto w-full max-w-2xl space-y-3">
	<p aria-live="polite" class="sr-only">{announcement}</p>

	<MiniCalendar
		data={filtered}
		{todayKey}
		{selectedKey}
		onSelect={select}
		{monthKey}
		onMonthChange={(next) => (monthKey = next)}
		showTodayButton
		size="comfortable"
	/>

	<!-- Keyed on the day, so the whole panel replays its entrance when the
	     selection changes. The global reduced-motion rule collapses the duration,
	     so it simply appears for anyone who asked for that. -->
	{#key selectedKey}
		<div class="animate-rise space-y-3">
			<CalendarHeader {heading} {isToday} items={dayItems} {nextUp} squares={squares} />

			<!--
				The day, by type. Groups run in DAY_GROUPS order -- classes, then what
				is due, then what the student set themselves, then booked time -- which
				is the order a day gets planned in rather than the order things happen.
				`time` collapses all of it into one chronological list for the other
				reading.
			-->
			<section aria-labelledby={copy.day.headingId} class="space-y-3">
				<div class="flex items-baseline justify-between gap-2">
					<h2 id={copy.day.headingId} class="thrive-eyebrow">{copy.day.eyebrow}</h2>
					<DayGroupToggle mode={prefs.dayGroupBy} />
				</div>

				{#if dayGroups.length === 0}
					<div data-tone="sunken" class="thrive-panel">
						<p class="text-xs text-muted-ink">{copy.day.empty}</p>
					</div>
				{:else}
					{#each dayGroups as group (group.key)}
						<DaySection
							id={`day-${group.key}`}
							title={group.heading}
							items={group.items}
							{onTick}
						/>
					{/each}
				{/if}
			</section>
		</div>
	{/key}
</div>
