<script lang="ts">
	import CalendarDays from '@lucide/svelte/icons/calendar-days';

	import { messages } from '$lib/messages';
	import { VISIBLE_EVENTS } from '$lib/cardLayout';
	import { clearIgnoredEvents } from '$lib/ignoredEvents';
	import { ignoreEvents } from '$lib/ignoreUndo.svelte';
	import { showToast } from '$lib/toast.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import IgnoreUndoBar from '$lib/components/ui/IgnoreUndoBar.svelte';
	import SectionCard from '$lib/components/ui/SectionCard.svelte';
	import EventRow from './EventRow.svelte';
	import type { EventRowData } from '$lib/homeView';

	/**
	 * Home's Upcoming Events card.
	 *
	 * Reads the ignore store, so the filtering happens here rather than on the
	 * server. The dates are still classified on the server: every row arrives with
	 * its `dateBlock` already split into month, day and time strings, and nothing
	 * here touches a timestamp. Same arrangement as `TaskStatPills`.
	 *
	 * ## Filter FIRST, then slice. The order is the behaviour.
	 *
	 * The card shows four rows. Slicing to four on the server and filtering ignored
	 * ones here would leave gaps: ignore two of the four and the card shows two
	 * rows while four more sit unseen behind them. Filtering first and slicing
	 * second is what makes the next event MOVE UP.
	 *
	 * This is why the slice is `VISIBLE_EVENTS` rather than a collapse: it is
	 * load-bearing behaviour, not layout. There is no "show more" here -- Home
	 * shows the next four and the rest is what /events is for.
	 *
	 * ## The key is a raw `Event.id`
	 *
	 * `ignoreEvents.isIgnored(event.id)` takes the id straight off the event. No
	 * prefix stripping, no `eventIdOf`. The Next version stripped an `evt-` prefix
	 * inline here, which is one of the three sites that did so while the docs
	 * claimed there was one -- and the reason Home and the calendar disagreed about
	 * what was ignored. MIGRATION.md section 9 defect 12.
	 *
	 * ## No way back, on purpose
	 *
	 * Home is a recommendation feed, so a dismissal should stick and stay out of
	 * the way. The calendar is the record of what exists, so nothing may become
	 * unreachable there. The only way back on Home is the six-second undo strip
	 * and, once nothing is left at all, the empty state.
	 */
	let { rows }: { rows: EventRowData[] } = $props();

	let listEl = $state<HTMLDivElement | null>(null);

	const kept = $derived(rows.filter((entry) => !ignoreEvents.isIgnored(entry.event.id)));
	const shown = $derived(kept.slice(0, VISIBLE_EVENTS));

	function onIgnore(entry: EventRowData) {
		ignoreEvents.ignore(entry.event.id, entry.event.title);
		showToast(messages.home.events.ignored(entry.event.title));

		/*
		 * Focus would otherwise be left on a button that no longer exists, which
		 * drops it to the top of the document. Move it to the list container, the
		 * nearest thing that still means "you were here".
		 */
		queueMicrotask(() => listEl?.focus());
	}

	function bringBack() {
		clearIgnoredEvents();
		showToast(messages.home.events.broughtBack);
	}
</script>

<SectionCard
	title={messages.home.events.title}
	description={messages.home.events.description}
	href="/events"
>
	{#if rows.length === 0}
		<EmptyState icon={CalendarDays} message={messages.home.events.empty} />
	{:else if kept.length === 0}
		<p class="text-xs text-muted-ink">
			{messages.home.events.allIgnored}
			<button
				type="button"
				onclick={bringBack}
				class="min-h-11 font-medium text-primary-hover underline-offset-2 hover:underline lg:min-h-9"
			>
				{messages.home.events.bringBack}
			</button>
		</p>
	{:else}
		<div>
			{#if ignoreEvents.undo}
				<div class="mb-2">
					<IgnoreUndoBar
						title={ignoreEvents.undo.title}
						onUndo={() => ignoreEvents.applyUndo()}
					/>
				</div>
			{/if}

			<!-- tabindex -1 makes this focusable programmatically but keeps it out of
			     the tab order, which is what a focus landing spot wants. -->
			<div bind:this={listEl} tabindex="-1" class="divide-y divide-hairline outline-none">
				{#each shown as entry (entry.event.id)}
					<EventRow
						event={entry.event}
						dateBlock={entry.dateBlock}
						onIgnore={() => onIgnore(entry)}
					/>
				{/each}
			</div>
		</div>
	{/if}
</SectionCard>
