<script lang="ts">
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import Sparkles from '@lucide/svelte/icons/sparkles';

	import { messages } from '$lib/messages';
	import { standingLabel } from '$lib/format';
	import { standingTone } from '$lib/tones';
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import TaskStatPills from './TaskStatPills.svelte';
	import type { DegreeProgress, Student } from '$lib/data';
	import type { TaskRowData } from '$lib/homeView';

	/**
	 * The greeting.
	 *
	 * Boxed like everything else. A greeting floating on the page was the one place
	 * with no edge, and it read as a gap rather than as a section.
	 *
	 * Both the date and the greeting word arrive as strings from the load function.
	 * `greetingFor()` and `formatLongDate()` both default to `new Date()`, so
	 * calling either here would be the exact convention breach CONVENTIONS.md warns
	 * about -- it compiles, renders something plausible, and is wrong for a student
	 * in another timezone in a way no test catches.
	 */
	let {
		student,
		degree,
		dateLabel,
		greeting,
		taskItems,
		weekEventIds
	}: {
		student: Student;
		degree: DegreeProgress;
		/** Today, formatted on the server. */
		dateLabel: string;
		/** "Good morning" etc., decided on the server. */
		greeting: string;
		taskItems: TaskRowData[];
		weekEventIds: string[];
	} = $props();

	const firstName = $derived(student.name.split(' ')[0]);
	const unitsPercent = $derived((degree.unitsCompleted / degree.unitsRequired) * 100);
</script>

<section
	aria-labelledby={messages.home.greeting.headingId}
	data-emphasis="strong"
	class="thrive-panel p-3"
>
	<!-- A date in prose is WORDS: DM Sans, not mono. That is the tightened
	     two-face rule -- this line was mono in the Next app. -->
	<p class="thrive-eyebrow">{dateLabel}</p>

	<!-- Weight at the call site. MIGRATION.md section 9 defect 4: twelve of
	     thirteen page titles in the Next app render at 400 because weight came out
	     of the type scale and the h1s were never updated. This is one of them. -->
	<h1 id={messages.home.greeting.headingId} class="mt-0.5 text-2xl font-bold text-ink">
		{messages.home.greeting.line(greeting, firstName)}
	</h1>

	<p class="mt-1.5 max-w-2xl text-sm text-body">{student.standingSummary}</p>

	<!-- Counts the student's own ticks and ignores, so the pills cannot contradict
	     the cards below them. -->
	<div class="mt-2.5">
		<TaskStatPills items={taskItems} {weekEventIds} />
	</div>

	<div class="mt-2.5 flex flex-wrap items-center gap-1.5">
		<!-- The goal chip leads: everything else is in service of it. Primary-toned
		     rather than status-toned -- a goal is not a status. -->
		<span
			class="inline-flex items-center gap-1.5 rounded-sm border border-line-strong bg-primary px-2.5 py-1 text-2xs text-on-primary"
		>
			<Sparkles aria-hidden="true" class="size-3.5" />
			{messages.home.greeting.goalChip(student.goal)}
		</span>

		<span
			class="inline-flex items-center gap-1.5 rounded-sm border border-line bg-surface px-2 py-1 text-2xs text-body"
		>
			<GraduationCap aria-hidden="true" class="size-3.5" />
			{messages.home.greeting.trackChip(student.track)}
		</span>

		<!-- The units chip carries its own tiny bar, so the number has a shape as
		     well as a value. The count is mono; the word "units" inside the same
		     string is not, which is the one place the two-face rule is coarser than
		     ideal -- splitting "38 of 52 units" into three elements to mono two of
		     them would be worse than leaving it. -->
		<span
			class="inline-flex items-center gap-2 rounded-sm border border-line bg-surface px-2 py-1 text-2xs text-body"
		>
			<span class="thrive-numeric whitespace-nowrap">
				{messages.home.greeting.unitsChip(degree.unitsCompleted, degree.unitsRequired)}
			</span>
			<ProgressBar
				value={unitsPercent}
				label={messages.home.greeting.unitsBarLabel}
				valueText={messages.home.greeting.unitsChip(
					degree.unitsCompleted,
					degree.unitsRequired
				)}
				size="sm"
				class="w-16"
			/>
		</span>

		<Tag tone={standingTone[student.standing]} dot>{standingLabel[student.standing]}</Tag>
	</div>
</section>
