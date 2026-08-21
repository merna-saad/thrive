<script lang="ts">
	import { pageTitle } from '$lib/title';
	import HomeHeader from '$lib/components/home/HomeHeader.svelte';
	import MyClasses from '$lib/components/home/MyClasses.svelte';
	import TasksCard from '$lib/components/home/TasksCard.svelte';
	import TodaysClasses from '$lib/components/home/TodaysClasses.svelte';
	import UpcomingEvents from '$lib/components/home/UpcomingEvents.svelte';
	import type { PageData } from './$types';

	/**
	 * Home.
	 *
	 * The one page the whole app is arranged around. Six providers in one
	 * `Promise.all`, every date classified in `+page.server.ts`, four cards in a
	 * 2x2 grid that fits one viewport.
	 *
	 * ## The grid
	 *
	 * `lg:grid-cols-2` over four cards IS the 2x2 -- measured as
	 * `grid-template-columns: 550px 550px` with two rows. It was already 2x2
	 * before the density pass; what pushed the second row below the fold was the
	 * header above it, not the grid.
	 *
	 * The cards are ordered so the pair a student acts on -- Tasks and today's
	 * classes -- lands in the first row, and the pair they browse lands in the
	 * second. On a phone that same order becomes the scroll order, which is the
	 * right priority either way.
	 *
	 * Each card caps its own height on desktop and scrolls inside; see
	 * `.thrive-card-body` in `app.css` for why that is a fixed height rather than a
	 * maximum. The result is that expanding any card moves nothing else.
	 *
	 * `space-y-2` rather than `space-y-3`: with the header down to one panel there
	 * are only two gaps left on this page, and 4px each is worth having.
	 */
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>{pageTitle()}</title></svelte:head>

<div class="space-y-2">
	<HomeHeader
		student={data.student}
		degree={data.degree}
		timeline={data.timeline}
		dateLabel={data.dateLabel}
		greeting={data.greeting}
		taskItems={data.taskItems}
		weekEventIds={data.weekEventIds}
	/>

	<div class="grid grid-cols-1 gap-2 lg:grid-cols-2">
		<TasksCard rows={data.taskItems} />
		<TodaysClasses rows={data.todaysClasses} dateLabel={data.dateLabel} />
		<MyClasses rows={data.courseRows} />
		<UpcomingEvents rows={data.eventRows} />
	</div>
</div>
