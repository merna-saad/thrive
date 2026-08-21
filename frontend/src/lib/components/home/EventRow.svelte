<script lang="ts">
	import CalendarPlus from '@lucide/svelte/icons/calendar-plus';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Sparkles from '@lucide/svelte/icons/sparkles';

	import { messages } from '$lib/messages';
	import Button from '$lib/components/ui/Button.svelte';
	import IgnoreButton from '$lib/components/ui/IgnoreButton.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import type { TagTone } from '$lib/tones';
	import type { Event, EventType } from '$lib/data';

	/**
	 * One event row.
	 *
	 * Type tags say who is putting the event on, routed through `Tag` so an event
	 * origin looks like every other chip in THRIVE. "San Diego" is `civic`, the one
	 * tone reserved for categories -- it used to borrow the amber that means
	 * "watch" everywhere else, which made a city event look like a warning.
	 */
	const typeTone: Record<EventType, TagTone> = {
		career: 'primary',
		rady: 'needs-help',
		club: 'on-track',
		ucsd: 'neutral',
		sandiego: 'civic'
	};

	const typeLabel: Record<EventType, string> = {
		career: messages.eventTypes.career,
		rady: messages.eventTypes.rady,
		club: messages.eventTypes.club,
		ucsd: messages.eventTypes.ucsd,
		sandiego: messages.eventTypes.sandiego
	};

	let {
		event,
		dateBlock,
		onIgnore
	}: {
		event: Event;
		/** Pre-formatted on the server: month, day, and time. */
		dateBlock: { month: string; day: string; time: string };
		/** Omitted where the row is not dismissible. */
		onIgnore?: () => void;
	} = $props();
</script>

<article
	data-flush="true"
	class="thrive-panel flex items-start gap-2.5 p-2 transition-colors duration-(--motion-fast) ease-standard hover:bg-bg"
>
	<!-- Date block. A calendar-tear shape reads faster than a date string. The day
	     number is a value, the month abbreviation is a word. -->
	<div
		class="grid size-11 shrink-0 place-items-center rounded-sm border border-line bg-sunken leading-none"
	>
		<span class="text-3xs text-muted-ink uppercase">{dateBlock.month}</span>
		<span class="thrive-numeric text-base text-ink">{dateBlock.day}</span>
	</div>

	<div class="min-w-0 flex-1">
		<div class="flex flex-wrap items-start justify-between gap-x-2.5 gap-y-1">
			<!-- Wraps rather than truncates: an event title is the row's subject, and
			     half of one is not a shorter version of it. `min-w-32` lets the tags
			     wrap below on a narrow row instead of crushing the title. -->
			<h3 class="line-clamp-2 min-w-32 flex-1 text-base break-words text-ink">
				{event.title}
			</h3>

			<span class="flex shrink-0 flex-wrap items-center gap-1">
				<Tag tone={typeTone[event.type]}>{typeLabel[event.type]}</Tag>

				{#if event.relevantToGoal}
					<Tag tone="primary">
						<Sparkles aria-hidden="true" class="size-3" />
						{messages.home.events.relevanceBadge}
					</Tag>
				{/if}
			</span>
		</div>

		<p class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-3xs text-muted-ink">
			<!-- A time is a value. -->
			<span class="thrive-numeric">{dateBlock.time}</span>
			<span aria-hidden="true">·</span>
			<span class="inline-flex min-w-0 items-center gap-1">
				<MapPin aria-hidden="true" class="size-3 shrink-0" />
				<span class="truncate">{event.location}</span>
			</span>
		</p>

		<!-- Visual only, as in the Next app. Typed as buttons rather than links so
		     nothing navigates, and THRIVE never writes to a real calendar.
		     Deliberately NOT wired to the join store: that store is keyed on the
		     calendar item id rather than the raw Event.id (MIGRATION.md section 9
		     defect 13), so a "count me in" here would write to a different key than
		     the calendar reads. 6b or later, once the key space is settled. -->
		<div class="mt-1.5 flex flex-wrap gap-1.5">
			<Button size="sm">
				{messages.home.events.countMeIn}
				<span class="sr-only">{messages.home.events.countMeInSubject(event.title)}</span>
			</Button>

			<Button size="sm">
				<CalendarPlus aria-hidden="true" class="size-3" />
				{messages.home.events.addToCalendar}
				<span class="sr-only">{messages.home.events.countMeInSubject(event.title)}</span>
			</Button>

			<!-- Pushed to the far end rather than sitting flush as a third equal
			     button. At 375px the group wraps and Ignore lands on its own line,
			     which is the right outcome: it is the least important thing here. -->
			{#if onIgnore}
				<IgnoreButton title={event.title} {onIgnore} class="ms-auto" />
			{/if}
		</div>
	</div>
</article>
