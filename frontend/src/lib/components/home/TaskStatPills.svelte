<script lang="ts">
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Clock from '@lucide/svelte/icons/clock';

	import { messages } from '$lib/messages';
	import { ignoredEvents, isEventIgnored } from '$lib/ignoredEvents';
	import { isTaskDone, taskDoneOverrides } from '$lib/userEdits.svelte';
	import StatPill from '$lib/components/ui/StatPill.svelte';
	import type { TaskRowData } from '$lib/homeView';

	/**
	 * The three numbers that answer "is anything on fire" before reading.
	 *
	 * ## Why these are counted here and not in the load function
	 *
	 * Because the counts have to see the student's own edits, and those live in
	 * `localStorage`. The Next server counted from `task.done` alone, which meant
	 * ticking the overdue task left the coral pill still insisting one was overdue
	 * -- the dashboard contradicting the list directly beneath it.
	 *
	 * Ignored events are excluded for exactly the same reason: the dashboard must
	 * not say five events this week while the card below shows three.
	 *
	 * The dates are still classified on the server. `TaskRowData` arrives with its
	 * urgency already decided and nothing here touches a timestamp -- what moved to
	 * the client is the COUNTING, not the clock.
	 *
	 * ## The event ids are raw `Event.id`s
	 *
	 * `weekEventIds` is a list of raw ids, computed server-side inside the week
	 * window, and checked against the store unchanged. No prefix handling, for the
	 * same reason as `UpcomingEvents`: this is the key space the ignore store is
	 * deliberately keyed on, and normalising an already-raw id is how a second
	 * normaliser gets added.
	 */
	let {
		items,
		weekEventIds
	}: {
		items: TaskRowData[];
		/** Raw `Event.id`s falling inside the week window, in provider order. */
		weekEventIds: string[];
	} = $props();

	const open = $derived(items.filter((item) => !isTaskDone(item.task, taskDoneOverrides())));

	const overdue = $derived(open.filter((item) => item.due.urgency === 'overdue').length);
	const dueToday = $derived(open.filter((item) => item.due.urgency === 'today').length);
	const eventsThisWeek = $derived(
		weekEventIds.filter((id) => !isEventIgnored(id, ignoredEvents())).length
	);
</script>

<div class="flex flex-wrap gap-2">
	<StatPill
		icon={CircleAlert}
		value={overdue}
		label={messages.home.stats.overdue}
		tone={overdue === 0 ? 'calm' : 'urgent'}
	/>
	<StatPill
		icon={Clock}
		value={dueToday}
		label={messages.home.stats.dueToday}
		tone={dueToday === 0 ? 'calm' : 'watch'}
	/>
	<StatPill
		icon={CalendarDays}
		value={eventsThisWeek}
		label={messages.home.stats.eventsThisWeek}
		tone="primary"
	/>
</div>
