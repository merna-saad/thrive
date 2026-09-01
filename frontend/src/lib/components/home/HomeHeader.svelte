<script lang="ts">
	import GreetingPanel from './GreetingPanel.svelte';
	import type { Student } from '$lib/data';
	import type { EventRowData, TaskRowData } from '$lib/homeView';

	/**
	 * Everything above the grid, in ONE panel.
	 *
	 * ## Why this component exists
	 *
	 * The program strip and the greeting were two `.thrive-panel` boxes stacked
	 * with a gap. Measured, that arrangement cost a full set of panel padding
	 * (20px) plus a stack gap (12px) to draw a boundary between two things that
	 * are the same thing: the header. Neither box was earning its edge.
	 *
	 * They are one panel now, split by a hairline. The hairline is decorative --
	 * which is exactly what the design system says a hairline is for, and the test
	 * it has to pass: remove it and the layout is still unambiguous, because the
	 * strip and the greeting do not look alike.
	 *
	 * Both children keep their own `<section>` and `aria-labelledby`. The landmark
	 * was never the panel, and collapsing the boxes must not collapse the document
	 * outline with them.
	 *
	 * `data-emphasis="strong"` moves here from the greeting: the header is one
	 * region now, so it takes one border treatment.
	 */
	/* `degree` stopped being forwarded on 2026-08-31, when the units chip and its
	   progress bar came out of the greeting. Nothing between here and there reads
	   it any more. */
	let {
		student,
		dateLabel,
		greeting,
		taskItems,
		eventRows
	}: {
		student: Student;
		dateLabel: string;
		greeting: string;
		taskItems: TaskRowData[];
		/** Passed through to the stat pills, which count and list this week's. */
		eventRows: EventRowData[];
	} = $props();
</script>

<!--
	THE STRIP LEFT THIS PANEL ON 2026-08-31, and the argument for merging them has
	not survived contact with the page.

	It read: the strip and the greeting are the same thing, the header, so two
	boxes cost a set of panel padding and a stack gap to draw a boundary neither
	was earning. True about the BOXES and wrong about the CONTENT. The strip is a
	two-year roadmap and the greeting is what to do this evening; they are the
	furthest apart of anything on the page, and stacking them put the least urgent
	thing above the most urgent one.

	So the greeting is a panel by itself, which is what the reference shows, and
	the strip moved to the foot of the page in `+page.svelte`. The panel keeps
	`data-emphasis="strong"` -- it is still the header, it is just only the
	greeting now.
-->
<div data-emphasis="strong" class="thrive-panel p-4 lg:p-5">
	<GreetingPanel {student} {dateLabel} {greeting} {taskItems} {eventRows} />
</div>
