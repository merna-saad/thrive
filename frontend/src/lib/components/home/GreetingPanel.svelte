<script lang="ts">
	import { messages } from '$lib/messages';
	import { standingLabel } from '$lib/format';
	import { standingTone } from '$lib/tones';
	import Tag from '$lib/components/ui/Tag.svelte';
	import TaskStatPills from './TaskStatPills.svelte';
	import type { Student } from '$lib/data';
	import type { EventRowData, TaskRowData } from '$lib/homeView';

	/**
	 * The greeting.
	 *
	 * Both the date and the greeting word arrive as strings from the load function.
	 * `greetingFor()` and `formatLongDate()` both default to `new Date()`, so
	 * calling either here would be the exact convention breach CONVENTIONS.md warns
	 * about -- it compiles, renders something plausible, and is wrong for a student
	 * in another timezone in a way no test catches.
	 *
	 * ## Density pass, and what did NOT change
	 *
	 * Three measured changes, all layout. Nothing was removed: the greeting, the
	 * standing sentence, all three stat pills and all four chips are still here.
	 *
	 *  - The DATE moved onto the greeting's line, right-aligned. It was a 16px
	 *    eyebrow above a 39px heading, and the two together held one line's worth
	 *    of information on two lines.
	 *  - The STAT PILLS and the CHIPS became ONE wrapping row. They were two rows
	 *    of small elements with a gap between them; the pills are the taller of
	 *    the two, so merging costs nothing and saves the shorter row outright.
	 *    They stay in reading order -- counts first, then context -- and wrap onto
	 *    a second line by themselves when the panel is too narrow, which is what
	 *    `flex-wrap` is for.
	 *  - The panel is `.thrive-panel`'s padding no longer: it is a band inside
	 *    `HomeHeader`'s single panel.
	 */
	/* `degree` is GONE from this component's props, not merely unused. It fed the
	   units chip and its progress bar, which came out with the rest of the roadmap
	   facts -- and a prop nothing reads is a claim about what this component needs
	   that stops being true the moment it is false. `HomeHeader` no longer forwards
	   it and `+page.svelte` no longer passes it down; the load still returns it,
	   because that is a data question rather than a layout one. */
	let {
		student,
		dateLabel,
		greeting,
		taskItems,
		eventRows
	}: {
		student: Student;
		/** Today, formatted on the server. */
		dateLabel: string;
		/** "Good morning" etc., decided on the server. */
		greeting: string;
		taskItems: TaskRowData[];
		eventRows: EventRowData[];
	} = $props();

	const firstName = $derived(student.name.split(' ')[0]);
</script>

<!--
	FIVE THINGS CAME OUT OF THIS STRIP ON 2026-08-31, and the count is the point.

	It held eight separate pieces of status: the greeting, the date, the standing
	sentence, three stat pills, a career-goal chip, a month-track chip, a units
	chip with its own progress bar, and a standing badge. Every one was added by
	somebody who thought it mattered, and together they made a header nobody read.

	What is left is what a student needs on arrival: who they are being greeted as,
	one sentence of where they stand, and the three counts that might make them do
	something today. The goal, the track and the units progress are ROADMAP facts --
	true, worth showing, and not what this page is for.
-->
<section aria-labelledby={messages.home.greeting.headingId}>
	<div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
		<div class="min-w-0">
			<!-- Weight at the call site. MIGRATION.md section 9 defect 4: twelve of
			     thirteen page titles in the Next app render at 400 because weight came
			     out of the type scale and the h1s were never updated. This is one.

			     STILL THE ONE ROUTE h1 THAT DOES NOT TAKE `.thrive-display`, and the
			     reason survived a second look on 2026-08-31. Every other page title
			     names a PLACE -- "Calendar", "Ask a question", "Book time with
			     someone" -- and a place reads well shouted in condensed caps. This one
			     is addressed to a person: "GOOD AFTERNOON, MERNA" in Teko is a banner,
			     not a greeting, and warmth is the only thing this line carries.

			     It did get heavier and larger, which is what "display weight" asks for
			     without asking for the display FACE: `text-2xl` at 700 against the
			     `text-xl` it was. It now leads the page by size rather than by being
			     the only thing there. -->
			<h1 id={messages.home.greeting.headingId} class="text-2xl font-bold text-ink">
				{messages.home.greeting.line(greeting, firstName)}
			</h1>

			<p class="mt-1 max-w-measure text-sm text-body">{student.standingSummary}</p>
		</div>

		<!-- The date and the badge stack, right-aligned. Two facts about the student
		     rather than about their day, so they sit together and out of the way of
		     the counts.
		     A date in prose is WORDS: the sans, not mono. That is the tightened
		     two-face rule -- this line was mono in the Next app. -->
		<div class="flex shrink-0 flex-col items-end gap-1.5">
			<p class="thrive-eyebrow">{dateLabel}</p>
			<Tag tone={standingTone[student.standing]} dot>{standingLabel[student.standing]}</Tag>
		</div>
	</div>

	<!-- EXACTLY THREE, and they are the only chips left here: overdue, due today,
	     events this week. The counts see the student's own ticks and ignores, so
	     the pills cannot contradict the cards below them. -->
	<div class="mt-3 flex flex-wrap items-center gap-2">
		<TaskStatPills items={taskItems} {eventRows} />
	</div>
</section>
