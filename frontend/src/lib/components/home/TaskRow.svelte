<script lang="ts">
	import { cn } from '$lib/utils';
	import { messages } from '$lib/messages';
	import { revealRowId } from '$lib/reveal';
	import { rowPriorityOf, taskLabels } from '$lib/taskView';
	import Tag from '$lib/components/ui/Tag.svelte';
	import type { DueDescriptor } from '$lib/format';
	import type { Task } from '$lib/data';

	/**
	 * One task row. READ-ONLY this phase.
	 *
	 * 6b brings the rest: ticking, undo, inline rename, priority, notes, due-date
	 * editing, drag to reorder, copy to the quick list. The checkbox is rendered
	 * and DISABLED rather than omitted, because the row's shape is what the
	 * student will learn, and a row that grows a checkbox next week is a different
	 * row. `aria-disabled` plus the hint in the card's footer say why.
	 *
	 * ## The 375px defect this does not reproduce
	 *
	 * MIGRATION.md section 9 defect 3, "the worst thing in the app": every task
	 * title wrapped to roughly one character per line at 375px, making Home about
	 * 7,700 CSS px tall. Isolated to TaskRow, and pre-existing rather than restyle
	 * damage.
	 *
	 * The cause is a flex row whose text child has no `min-w-0`. A flex item's
	 * default `min-width: auto` refuses to shrink below its longest word, so the
	 * label column pushed the row wider than its container and the title got
	 * whatever was left -- about one character. The fix is `min-w-0` on the
	 * growing child so it may shrink, plus `break-words` so a long word wraps
	 * instead of overflowing, plus the labels being allowed to wrap to their own
	 * line rather than competing for the same row.
	 *
	 * Titles wrap to two lines rather than truncating: a task title is the row's
	 * subject, and half of one is not a shorter version of it.
	 */
	let {
		task,
		due,
		done
	}: {
		task: Task;
		/** Classified on the server. Nothing here reads a clock. */
		due: DueDescriptor;
		done: boolean;
	} = $props();

	const priority = $derived(rowPriorityOf(due, task.priority, done));
	const labels = $derived(taskLabels(task, due, done));

	/**
	 * Priority is carried by a left edge and a wash, and NEVER by colour alone --
	 * every tinted row also carries a word in its labels saying why. That is the
	 * `taskLabels` state chip, which is why the two are derived from the same
	 * inputs.
	 */
	/**
	 * The jump target for the stat pill popovers.
	 *
	 * `tabindex="-1"` below makes the row focusable programmatically without
	 * putting every row in the tab order, and it deliberately keeps its focus ring
	 * -- being able to see where the jump landed is the whole point of moving focus
	 * rather than only scrolling. Built by `revealRowId` rather than by a template
	 * here, so the id and the popover's target cannot drift apart.
	 */
	const rowId = $derived(revealRowId({ kind: 'task', id: task.id }));

	const priorityStyles: Record<typeof priority, string> = {
		urgent: 'border-l-urgent bg-urgent-soft',
		soon: 'border-l-watch bg-watch-soft',
		later: 'border-l-later bg-later-soft',
		none: 'border-l-transparent'
	};
</script>

<div
	id={rowId}
	tabindex="-1"
	data-done={done}
	class={cn(
		'thrive-row flex items-start gap-2 border-l-2 px-2 py-1.5',
		priorityStyles[priority]
	)}
>
	<!-- Disabled, not absent. `mt-0.5` aligns the box with the first line of the
	     title rather than the centre of a two-line block. -->
	<input
		type="checkbox"
		class="thrive-checkbox mt-0.5"
		checked={done}
		disabled
		aria-disabled="true"
		aria-label={task.title}
	/>

	<!-- min-w-0 is the fix for defect 3. Without it this child refuses to shrink
	     below its longest word and the title column collapses to one character. -->
	<div class="min-w-0 flex-1">
		<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
			<span
				class={cn(
					'thrive-strike min-w-0 flex-1 text-sm break-words',
					done ? 'text-muted-ink' : 'text-ink'
				)}
				data-done={done}
			>
				{task.title}
			</span>

			<!-- Labels may wrap to their own line rather than squeezing the title. -->
			<span class="flex shrink-0 flex-wrap items-center gap-1">
				{#each labels as label (label.text)}
					<Tag tone={label.tone}>{label.text}</Tag>
				{/each}
			</span>
		</div>

		<!-- The due line. `countdown` is a value and holds its width so the row
		     does not reflow as "in 3 days" becomes "in 10 days". -->
		<p class="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-3xs text-muted-ink">
			<span>{due.fullLabel}</span>
			{#if due.countdown}
				<span aria-hidden="true">·</span>
				<span class="thrive-numeric">{due.countdown}</span>
			{/if}
			{#if task.subtasks.length > 0}
				<span aria-hidden="true">·</span>
				<span class="thrive-numeric">
					{task.subtasks.filter((subtask) => subtask.done).length}/{task.subtasks.length}
				</span>
			{/if}
		</p>
	</div>
</div>
