<script lang="ts">
	import { pageTitle } from '$lib/title';
	import GreetingPanel from '$lib/components/home/GreetingPanel.svelte';
	import MyClasses from '$lib/components/home/MyClasses.svelte';
	import ProgramTimelineCompact from '$lib/components/home/ProgramTimelineCompact.svelte';
	import TasksCard from '$lib/components/home/TasksCard.svelte';
	import TodaysClasses from '$lib/components/home/TodaysClasses.svelte';
	import UpcomingEvents from '$lib/components/home/UpcomingEvents.svelte';
	import type { PageData } from './$types';

	/**
	 * Home.
	 *
	 * The one page the whole app is arranged around. Six providers in one
	 * `Promise.all`, every date classified in `+page.server.ts`, four cards in a
	 * grid that fits one viewport.
	 *
	 * ## The grid, and why it is two columns and not four
	 *
	 * Two columns at `lg`, one below it. The cards are ordered so the pair a
	 * student acts on -- Tasks and today's classes -- lands in the first row, and
	 * the pair they browse lands in the second. On a phone that same order becomes
	 * the scroll order, which is the right priority either way.
	 *
	 * Each card caps its own height on desktop and scrolls inside; see
	 * `.thrive-card-body` in `app.css` for why that is a fixed height rather than a
	 * maximum. The result is that expanding any card moves nothing else.
	 */
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>{pageTitle()}</title></svelte:head>

<div class="space-y-3">
	<!-- Read-only strip. The full stepper lives on /degree. -->
	<ProgramTimelineCompact timeline={data.timeline} />

	<GreetingPanel
		student={data.student}
		degree={data.degree}
		dateLabel={data.dateLabel}
		greeting={data.greeting}
		taskItems={data.taskItems}
		weekEventIds={data.weekEventIds}
	/>

	<div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
		<TasksCard rows={data.taskItems} />
		<TodaysClasses rows={data.todaysClasses} dateLabel={data.dateLabel} />
		<MyClasses rows={data.courseRows} />
		<UpcomingEvents rows={data.eventRows} />
	</div>
</div>
