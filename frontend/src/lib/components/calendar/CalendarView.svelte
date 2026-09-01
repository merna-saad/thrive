<script lang="ts">
	import { untrack } from 'svelte';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';

	import AddItemForm from '$lib/components/calendar/AddItemForm.svelte';
	import AgendaView from '$lib/components/calendar/AgendaView.svelte';
	import CalendarHeader from '$lib/components/calendar/CalendarHeader.svelte';
	import DayEventsSection from '$lib/components/calendar/DayEventsSection.svelte';
	import DayGroupToggle from '$lib/components/calendar/DayGroupToggle.svelte';
	import DaySection from '$lib/components/calendar/DaySection.svelte';
	import ItemDetail from '$lib/components/calendar/ItemDetail.svelte';
	import KeyBar from '$lib/components/calendar/KeyBar.svelte';
	import MiniCalendar from '$lib/components/calendar/MiniCalendar.svelte';
	import ViewSwitcher from '$lib/components/calendar/ViewSwitcher.svelte';
	import WeekView from '$lib/components/calendar/WeekView.svelte';
	import { arrangeDay, squareGroupsFor } from '$lib/calendarDay';
	import { agendaRange, visibleUndatedTodos } from '$lib/calendarViews';
	import { calendarPrefs } from '$lib/calendarPrefs';
	import { mergedSchedule } from '$lib/calendarSources';
	import { ignoredEvents } from '$lib/ignoredEvents';
	import { messages } from '$lib/messages';
	import { cn } from '$lib/utils';
	import {
		allLabels,
		eventItemsForDay,
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
	 * ## Complete as of 7c
	 *
	 * 7a built the spine (month grid, the selected day, its non-event items), 7b
	 * added the other two views and the filter bar, and 7c adds the three editing
	 * surfaces: `ItemDetail`, `AddItemForm` and `DayEventsSection`. `detail` was
	 * declared in 7a and written by nothing; this is what writes it.
	 *
	 * ## The day figure and the rows beneath it now agree
	 *
	 * `CalendarHeader`'s figure counts EVERYTHING on the day, events included. For
	 * two phases that meant a day could read "12" above ten rows, because nothing
	 * rendered the events. Mounting `DayEventsSection` closes that: every category
	 * the figure counts has a section under it, all fed from the same `filtered`.
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

	/**
	 * The Key's disclosure.
	 *
	 * Closed by default, which is the whole point — as a permanent column it was
	 * paying full-time rent to be a legend. NOT persisted: `calendarPrefs` carries
	 * the filter itself, which must survive a navigation, but whether the panel
	 * that edits it happens to be open is a momentary thing, like the calendar's
	 * selected day.
	 */
	let keyOpen = $state(false);

	/** Named once so `aria-controls` and the panel cannot drift. */
	const KEY_PANEL_ID = 'calendar-key-panel';

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
	 * The item whose detail dialog is open. Null when there is none.
	 *
	 * A SNAPSHOT of the row, not a subscription to it, and the dialog is written
	 * to know that: the two things it can change -- the label and the urgent flag
	 * -- are read live from their stores rather than off this object. See the note
	 * in `ItemDetail`.
	 *
	 * One slot, so opening a second dialog replaces the first. There is no way to
	 * open two, and stacking modals over a page this dense would leave a student
	 * with two Escape presses to guess at.
	 */
	let detail = $state<ScheduleItem | null>(null);

	const prefs = $derived(calendarPrefs());

	/**
	 * How many filters are ON, across BOTH dimensions.
	 *
	 * This is what the closed trigger shows, and it is the reason closing the panel
	 * does not hide an active filter. Streams and labels are counted separately and
	 * added — never merged into one list, which is the rule `KeyBar` exists to
	 * enforce. `KeyBar` computes the same figure for its own heading; both read the
	 * same two prefs fields, so they cannot disagree.
	 *
	 * Declared AFTER `prefs` because a `$derived` body is still ordinary
	 * block-scoped TypeScript — reading a `const` above its declaration is an
	 * error even though the read only happens later at runtime.
	 */
	const hiddenCount = $derived(prefs.hidden.length + (prefs.hiddenLabels?.length ?? 0));

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

	/**
	 * Every label in use, for the key to render — from the UNFILTERED merge.
	 *
	 * Load-bearing, and the kind of line that gets "tidied" into a bug. If the
	 * labels came from `filtered`, switching a label off would remove its own chip
	 * from the key and there would be no way to switch it back on.
	 */
	const labels = $derived(allLabels(merged.data));

	/**
	 * The agenda's thirty days, anchored on TODAY rather than on the selection.
	 *
	 * The agenda answers "what is coming up". An anchor that moved with the
	 * selection would answer a different question every time a student touched the
	 * month grid. See `agendaRange`.
	 */
	const agendaDays = $derived(agendaRange(todayKey));

	/**
	 * Undated to-dos that survive the filter.
	 *
	 * `filterSchedule` cannot reach these — they are not in `ScheduleData`, because
	 * they have no day to be in — so the two dimensions that CAN apply to them are
	 * applied here by the same rules. `urgentOnly` hides all of them, for the exact
	 * reason `filterSchedule` drops recurring classes under the same switch: none of
	 * them can carry the flag, and a filter that visibly skips one section reads as
	 * broken. Nothing in `filterSchedule` changed.
	 */
	const visibleTodos = $derived(
		visibleUndatedTodos(merged.undatedTodos, {
			showDone: prefs.showDone,
			urgentOnly: prefs.urgentOnly
		})
	);

	const dayItems = $derived(itemsForDay(filtered, selectedKey));
	const schedule = $derived(scheduleItemsForDay(filtered, selectedKey));
	const personal = $derived(personalItemsForDay(filtered, selectedKey));
	/*
	 * The third slice, and the one that closes the day-figure gap.
	 *
	 * `dayItems` has always contained these -- they count toward the header's
	 * figure and they dot the month grid -- and from 7c they have a section of
	 * their own beneath it. Same `filtered` as the other two, so an ignored event
	 * hidden from the grid is hidden from here by the same decision, made once.
	 */
	const events = $derived(eventItemsForDay(filtered, selectedKey));

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
	 * The rail's two-line heading, split from the same sanctioned format above.
	 *
	 * THE FIRST LINE IS NOT ALWAYS "TODAY", and that is the point. The rail shows
	 * the SELECTED day -- every cell in the grid writes `selectedKey`, and a rail
	 * pinned to today would make clicking the 12th change nothing visible. So the
	 * display line says TODAY when the selection is today and names the weekday
	 * otherwise, and the date beneath it is unambiguous either way.
	 *
	 * Two more client-side `toLocaleDateString` calls, for exactly the reason the
	 * one above is allowed: the day is chosen in the browser, so no server render
	 * could have pre-formatted it, and what varies is locale wording rather than
	 * which day it is. CONVENTIONS.md lists this case by name.
	 */
	const railTitle = $derived(
		isToday
			? copy.day.todayTitle
			: fromDayKey(selectedKey).toLocaleDateString('en-US', { weekday: 'long' })
	);
	/* Weekday included, month abbreviated: "Thursday, Aug 30". The display line
	   above says TODAY or names the weekday, and neither of those pins a DATE --
	   so this line carries the whole of it rather than the half the title left
	   out. Abbreviated because it is set in tracked caps, where "SEPTEMBER" is
	   most of a 300px rail. */
	const railDate = $derived(
		fromDayKey(selectedKey).toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'short',
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
	 * All three sections, as of 7c. The events count was held back for two phases
	 * because announcing "2 to register for" above a page with no register controls
	 * on it is a promise the page does not keep; the section exists now, so the
	 * sentence is true again.
	 */
	const announcement = $derived(
		copy.header.announcement(heading, schedule.length, personal.length, events.length)
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

	/**
	 * Open the dialog on a row.
	 *
	 * The whole writer for `detail`. Handed to every row in every view except the
	 * week column, which has no room for the control and whose job is shape rather
	 * than action -- selecting the day there drops the student into the day panel,
	 * where the same row has both.
	 */
	const onOpen = (item: ScheduleItem) => (detail = item);
</script>

<!--
	The selected day's panel: its summary, then its items.

	A SNIPPET because two views render it — month below the grid, week below the
	columns — and only agenda replaces it. The Next source expressed that as
	`view === "agenda" ? <Agenda/> : <dayPanel/>`, which reads as "agenda is the
	odd one out" and hides that the panel is shared. Written twice it would be two
	things to keep in step; written once it cannot drift.

	Keyed on the day, so the whole panel replays its entrance when the selection
	changes. The global reduced-motion rule collapses the duration, so it simply
	appears for anyone who asked for that.
-->
{#snippet dayRail()}
	{#key selectedKey}
		<div class="animate-rise space-y-3">
			<!--
				THE PAGE'S SECOND FOCAL POINT, and the reason this rail exists.

				Before 2026-08-30 the page had six things drawn at the same weight --
				the title, the month label, the day heading, "your day", "Tasks" and
				"Key" -- so the eye had nowhere to land. Two now dominate: the `h1`
				above, and this. Everything else was demoted rather than removed.

				`.thrive-display` at the `xl` step, which is the same treatment the
				page title takes one step larger. The date under it stays in the
				interface sans: a display face on both lines would make them compete
				with each other instead of reading as one block.
			-->
			<header>
				<!-- The full display step, one above the month label in the grid card.
				     This is the page's subject: the reference has no page title at all
				     and lets TODAY be the largest thing on the screen. Ours keeps the
				     `h1`, so the two sit one step apart rather than competing. -->
				<h2 id={copy.header.headingId} class="thrive-display text-ink">
					{railTitle}
				</h2>
					<!-- The date takes the eyebrow treatment rather than the numeric one.
				     It reads as a subtitle to the display line above it, and an eyebrow
				     is the system's one answer for "small, uppercase, tracked, muted".
				     It is prose ("August 30"), not a value in a column, so the mono
				     face it used to carry was the wrong half of the two-face rule. -->
				<!-- `text-body` overrides the eyebrow's muted colour, and it wins because
				     utilities beat the components layer. Deliberate: under a display line
				     this is a subtitle rather than a label on something, and the
				     reference sets it dark. -->
				<p class="thrive-eyebrow mt-1 text-body">{railDate}</p>

				{#if nextUp}
					<!-- "Next up" earns rail space because it is the one line that says
					     what to do NEXT rather than what exists. The time is a value and
					     the reserved locator colour; the title is something a person
					     wrote. -->
					<p class="mt-2 text-sm text-muted-ink">
						{copy.header.nextUpLabel}
						<span class="thrive-numeric text-indigo">{nextUp.timeLabel}</span>
						<span class="text-ink">{nextUp.title}</span>
					</p>
				{/if}
			</header>

			<!--
				The day, by type. Groups run in DAY_GROUPS order -- classes, then what
				is due, then what the student set themselves, then booked time -- which
				is the order a day gets planned in rather than the order things happen.
				`time` collapses all of it into one chronological list for the other
				reading.

				The "your day" eyebrow that used to head this section is GONE rather
				than demoted: it sat directly under a heading that now names the day in
				display type, so it was labelling the thing above it a second time. The
				`aria-labelledby` still resolves -- it points at the rail heading, which
				is the honest label for this list.
			-->
			<section aria-labelledby={copy.header.headingId} class="space-y-3">
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
							density="rail"
							{onTick}
							{onOpen}
						/>
					{/each}
				{/if}
			</section>

			<DayEventsSection items={events} />
		</div>
	{/key}
{/snippet}

<!--
	What stayed under the grid: the day's shape rather than its contents.

	The figure, the breakdown, "n of m done" and the square strip are a SUMMARY --
	they answer "how much is today" in one glance and none of them is a thing you
	act on. The group toggle and the add form are controls. Both belong with the
	grid, which is the other thing on this page you look at rather than work
	through; the rail is where the working happens.

	`aria-labelledby` points at the rail's heading, which lives in a different
	subtree. That is valid -- ids are document-global -- and it is deliberate:
	this section is still "the selected day", and duplicating the heading to own a
	label locally would put two of them in the document outline.
-->
{#snippet daySummary()}
	{#key selectedKey}
		<div class="animate-rise space-y-3">
			<CalendarHeader {heading} {isToday} items={dayItems} {nextUp} {squares} />

			<div class="flex flex-wrap items-center justify-between gap-2">
				<h2 class="thrive-eyebrow">{copy.day.eyebrow}</h2>
				<DayGroupToggle mode={prefs.dayGroupBy} />
			</div>

			<!-- Adding sits with the controls now. The old comment argued it belonged
			     between the student's own day and what someone else is putting on --
			     that ordering went with the split, and what is left is the simpler
			     rule: a form is a control, and the controls are here. -->
			<AddItemForm dayKey={selectedKey} />
		</div>
	{/key}
{/snippet}

<!-- The agenda, rendered from one place so the week fallback and the agenda view
     itself cannot drift apart. -->
{#snippet agenda()}
	<AgendaView
		data={filtered}
		dayKeys={agendaDays}
		mode={prefs.groupBy}
		undatedTodos={visibleTodos}
		{onTick}
		{onOpen}
	/>
{/snippet}

<!--
	ONE HEADER ROW, AND THE KEY BEHIND A DISCLOSURE.

	Three things used to sit above the grid: an eyebrow, a 30px title with a
	subtitle, and the view switcher on a line of its own — and then the Key held a
	third of the remaining width permanently. The month grid's top edge was at 202px
	on a 1052px laptop and it was 927px wide.

	Now the page name, the view switcher and the Key's trigger share one row, and
	the grid is full width beneath it.

	## The Key is a disclosure, and what that costs

	It is a legend AND a filter, and as a permanent 18rem column it was paying
	full-time rent to be a legend. Behind a button it costs one row.

	**This is the one change here that makes something less discoverable**, so it is
	worth being straight about it: a panel you can see is more discoverable than a
	button you have to press. Three things make the trade acceptable rather than
	merely cheaper —

	  1. The trigger says what it opens, in words, and carries a COUNT when any
	     filter is on, so a hidden stream is never invisible while the panel is shut.
	  2. Nothing about reading the month depends on the legend. Every dot carries a
	     `title`, every cell's accessible name lists what is on the day in words, and
	     every row in the day panel below carries its own labelled tag. The legend
	     explains a colour that is never the only cue.
	  3. It is a real `<button>` with `aria-expanded` and `aria-controls`, and the
	     panel is inside an `{#if}` — so collapsed means absent from the DOM and from
	     the tab order rather than merely invisible. Same shape as the nav rail's
	     group.

	No filter was removed, nothing was flattened, and the two dimensions inside
	`KeyBar` are untouched.
-->
<div class="w-full">
	<p aria-live="polite" class="sr-only">{announcement}</p>

	<!-- `space-y-page-rhythm` rather than the `space-y-3` that was here: this is
	     the gap under the page's own heading, which is the thing that token names.
	     It was the tightest of the four values the token replaced -- 10px between
	     an h1 and the month grid, which read as one block rather than a title and
	     its subject. -->
	<div class="space-y-page-rhythm">
		<!-- The one header row. `items-start` because the switcher wraps its own
		     controls at narrow widths and the title should stay on the top line. -->
		<div class="flex flex-wrap items-start justify-between gap-2">
			<h1 class="thrive-display text-ink" data-step="xl">{copy.title}</h1>

			<div class="flex flex-wrap items-center gap-2">
				<ViewSwitcher {prefs} />

				<!--
					THE TRIGGER EXISTS ONLY BELOW `xl`.

					Above it the Key is a permanent column and there is nothing to toggle,
					so a control that says "Key and filters" beside a Key that is already
					on screen would be a button with no job. `xl:hidden` rather than an
					`{#if}` because the boundary is a viewport question and CSS answers it
					without guessing during SSR — the same rule the week fallback follows.
				-->
				<button
					type="button"
					aria-expanded={keyOpen}
					aria-controls={KEY_PANEL_ID}
					onclick={() => (keyOpen = !keyOpen)}
					class="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-line bg-surface px-2.5 text-2xs font-medium text-body transition-colors duration-(--motion-fast) ease-standard hover:border-line-strong hover:bg-primary-soft hover:text-primary-hover lg:min-h-9 xl:hidden"
				>
					<SlidersHorizontal aria-hidden="true" class="size-3.5 shrink-0" />
					{copy.keyToggle}
					{#if hiddenCount > 0}
						<!-- The count is what stops a closed panel hiding an active filter.
						     A value, so it takes the numeric face. -->
						<span class="thrive-numeric text-3xs text-primary">
							{copy.keyToggleCount(hiddenCount)}
						</span>
					{/if}
				</button>
			</div>
		</div>

		<!--
			THE GRID AND THE RAIL, SIDE BY SIDE ABOVE `xl`.

			## The rail changed hands on 2026-08-30

			It used to hold the Key and nothing else, at `--thrive-key-width` (11rem),
			sized from the longest stream name. The reasoning was that the grid is the
			page's subject and a legend should take the least room its content needs.

			That was right while the rail held a LEGEND. The selected day's detail now
			lives here and the Key is demoted to a quiet block at the bottom, which
			reverses the argument: the rail holds the page's second focal point, and
			the thing paying rent by the inch is the legend underneath it. So it is
			sized from the day rows instead -- `--thrive-day-rail-width`, 20rem -- and
			the grid pays, going from 1016px to roughly 700px.

			A side panel and a full-width grid cannot both exist. That sentence was
			here before and it still holds; what changed is which of the two is worth
			more, and the answer moved when the panel stopped being a legend.

			## The order is view THEN rail, at every width

			This is what makes "opening the Key never pushes the calendar down" true
			rather than approximately true. Below `xl` the rail is the second row of a
			one-column grid, so it appends BELOW the month -- the grid does not move by
			a pixel. Above `xl` the explicit `row-start-1` on both children pulls it up
			beside the grid instead.

			## `items-start`, so the rail does not stretch

			Without it the rail would grow to the height of the left column and the
			Key would float at the bottom of a mostly empty box.

			## Why the day detail is not in the agenda's rail

			The agenda IS a list of days, so pinning one day beside it duplicates what
			the page already is. Month and week both had a day panel before this pass
			and both keep one; agenda had none and still has none. The rail's Key half
			is unconditional, exactly as it was.
		-->
		<div
			class="grid gap-page-rhythm xl:grid-cols-[minmax(0,1fr)_var(--thrive-day-rail-width)] xl:items-start"
		>
			<div class="min-w-0 space-y-page-rhythm xl:col-start-1 xl:row-start-1">
	{#if prefs.view === 'agenda'}
		{@render agenda()}
	{:else if prefs.view === 'week'}
		<!--
			THE WEEK-TO-AGENDA FALLBACK, AT 48REM, AND IT IS CSS.

			Seven columns on a 375px screen gives each one about 50px, which is
			narrower than the word "Assignment". So below `md` (48rem) the week grid
			does not render and the agenda answers instead.

			48rem, NOT the 40rem the Next comment named. Measured at 40rem the columns
			came out 71px, where "MGT 142 · Machine Learning for Business" reads as
			three short stacks rather than a phrase — technically clamped, not actually
			legible. The owner's call, and the right one: anything that narrow falls
			back to the agenda perfectly well, so the breakpoint should sit where the
			columns are readable rather than where they merely fit.

			Done with two media-gated wrappers rather than a `matchMedia` read, and
			that is a decision. CONVENTIONS is explicit that a viewport question CSS
			can answer belongs in CSS — the JS form is reserved for cases with no CSS
			equivalent, like moving FOCUS. A `matchMedia` read would also have to
			guess during SSR, so one width of student would watch the wrong view paint
			and get replaced a beat after hydration, which is the quiet hydration drift
			the same file warns about.

			What it costs, stated rather than discovered: both subtrees are built, so a
			desktop pays for one `groupAgenda` over thirty days it will not show and a
			phone pays for one week grid. Both are cheap, and `display: none` keeps the
			hidden one out of the accessibility tree, so nothing is announced twice.
		-->
		<div class="hidden space-y-3 md:block">
			<WeekView data={filtered} {selectedKey} {todayKey} onSelect={select} />
			{@render daySummary()}
		</div>

		<div class="space-y-3 md:hidden">
			<!-- Said out loud. The switcher still shows "week" selected, because that
			     IS the student's choice and it will be honoured the moment the screen
			     is wide enough — so the page owes them a reason for showing something
			     else rather than appearing to have ignored the click. -->
			<p data-tone="sunken" class="thrive-panel text-xs text-muted-ink">
				{copy.week.fallbackNote}
			</p>
			{@render agenda()}
		</div>
	{:else}
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
		{@render daySummary()}
	{/if}

			<!--
				THE KEY, UNDER THE GRID. Its third home, and this one is argued from
				what it EXPLAINS rather than from where there was room.

				It began beside the grid in its own column, moved to the foot of the
				rail when the rail took the selected day, and lands here. The rail
				version failed on its own terms: a legend for the MONTH sat underneath a
				panel about the DAY, so the one thing it decodes was the one thing it
				was not next to.

				Under the grid it is beside the dots it names, and the compaction that
				shortened the month is what made room -- the grid went 575px to 296px
				and left the left column ending well above the rail's foot.

				STILL THE DISCLOSURE, still `#calendar-key-panel`, still what the
				trigger's `aria-controls` points at. `hidden`/`block` rather than an
				`{#if}` because only one instance may exist: duplicating it would
				duplicate eleven checkboxes and a screen reader would find two "Class"
				toggles for one filter. `hidden` is `display: none`, so it leaves the
				accessibility tree and the tab order, which is the property the earlier
				`{#if}` was chosen for -- it just does not leave `querySelectorAll`,
				which is why the gate asserts VISIBILITY rather than presence below `xl`.

				`xl:block` is unconditional, so above `xl` it is always there whatever
				`keyOpen` happens to be, and the trigger is `xl:hidden` for the same
				reason. Neither is asked about the other, so they cannot disagree.
			-->
			<div
				id={KEY_PANEL_ID}
				class={cn('min-w-0 xl:block', keyOpen ? 'block' : 'hidden')}
			>
				<KeyBar {prefs} {labels} ignoredEventCount={ignoredEventIds.length} />
			</div>
			</div>

			<!--
				THE RAIL. Second in DOM order, second column above `xl`, and it is the
				DAY and nothing else as of 2026-09-01.

				The Key used to sit under it behind a divider. That was already the
				second home for a legend that started beside the grid, and it was the
				wrong one for a reason the rail's own success created: once the rail was
				the selected day, eleven full-width stream rows at its foot were an
				11-deep block of filter furniture below the thing a student actually
				came to read. The Key now sits under the grid -- see below -- which is
				beside the thing it explains rather than beside the thing it does not.
			-->
			<aside class="min-w-0 xl:col-start-2 xl:row-start-1">
				{#if prefs.view !== 'agenda'}
					{@render dayRail()}
				{/if}
			</aside>
		</div>
	</div>

	<!--
		The dialog, mounted OUTSIDE the view branches.

		Here rather than inside `dayPanel`, for two reasons. The agenda has no day
		panel and its rows can open one too. And `dayPanel` is keyed on
		`selectedKey`, so a dialog inside it would be torn down and rebuilt the
		instant the student changed day — which is a thing they can do while it is
		open, from a keyboard, since the month grid is still behind the scrim.

		No portal and no `<svelte:boundary>`. The scrim is `position: fixed`, so it
		escapes every ancestor's box without needing to escape the tree; the shell
		sets no transform or filter, which are the only things that would trap it.
	-->
	{#if detail}
		<ItemDetail item={detail} onClose={() => (detail = null)} />
	{/if}
</div>
