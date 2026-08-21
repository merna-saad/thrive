<script lang="ts">
	import Tag from '$lib/components/ui/Tag.svelte';
	import { messages } from '$lib/messages';
	import { categoryLabel, categoryTag, type ScheduleItem } from '$lib/schedule';
	import { isTickable } from '$lib/tickItem';
	import { cn } from '$lib/utils';

	/**
	 * One item, in the shape every calendar view renders it.
	 *
	 * Extracted so the day list, the week columns and the agenda cannot drift on
	 * how a class or a ticked to-do looks. The time is a value and takes
	 * `.thrive-numeric`, so a column of times aligns; the title is something a
	 * person wrote and takes DM Sans.
	 *
	 * Tickable rows carry a real checkbox that writes back to whichever store the
	 * item came from, so ticking here and ticking on Home are the same act.
	 *
	 * ## What tickable means, and what it does not
	 *
	 * `isTickable` asks whether a WRITABLE SOURCE ROW is attached -- `item.task`
	 * or `item.quickItem`, put there by `mergedSchedule` at merge time. It does
	 * not ask whether `done` happens to be set, and it does not parse the id.
	 *
	 * Those can disagree, and when they did the failure was silent: a synthetic
	 * row carrying a `done` flag with nothing behind it rendered a checkbox that
	 * appeared to tick and reverted on the next render. See `tickItem.ts` and
	 * CONVENTIONS.md.
	 *
	 * A row is also only tickable if a handler was passed. A read-only view gets
	 * the spacer, not a dead control.
	 *
	 * ## Not here yet
	 *
	 * `compact` (the week column's stacked variant) and `onOpen` (the details
	 * dialog's trigger) both belong to views this phase does not build. Neither is
	 * stubbed: an unused prop reads as a feature that exists.
	 */
	let {
		item,
		onTick
	}: {
		item: ScheduleItem;
		onTick?: (item: ScheduleItem, done: boolean) => void;
	} = $props();

	const done = $derived(item.done === true);
	const tickable = $derived(isTickable(item) && Boolean(onTick));
	const time = $derived(item.allDay ? messages.calendar.row.allDay : item.timeLabel);

	// Scoped to the row, so two views showing the same item cannot collide.
	const checkboxId = $derived(`tick-${item.id}`);
</script>

<div data-done={done ? 'true' : undefined} class="thrive-row flex items-baseline gap-2 px-2 py-1.5">
	<!-- The checkbox is a SIBLING of the title, never a wrapper round the row: a
	     label spanning the whole row would make every control inside it tick the
	     item off. The title still labels the box, via `for`, which is what makes
	     the tick target large without the box growing past the size the design
	     system sets. Same lesson TaskRow learned. -->
	{#if tickable}
		<input
			id={checkboxId}
			type="checkbox"
			class="thrive-checkbox mt-1 self-start"
			checked={done}
			onchange={(event) => onTick?.(item, event.currentTarget.checked)}
			aria-label={messages.calendar.row.toggle(item.title, done)}
		/>
	{:else}
		<!-- A spacer the width of the control it stands in for, so titles align
		     whether or not a row can be ticked. Without it a list of classes and
		     tasks reads as two ragged columns.

		     `size-checkbox` is the SAME token `.thrive-checkbox` sizes itself from.
		     The Next version wrote `size-[17px]` here, which is a literal that
		     agrees with the stylesheet only until somebody resizes the control. -->
		<span aria-hidden="true" class="mt-1 size-checkbox shrink-0"></span>
	{/if}

	<span class={cn('thrive-numeric w-16 shrink-0 self-start pt-0.5 text-3xs', done ? 'text-faint' : 'text-muted-ink')}>
		{time}
	</span>

	<span class="min-w-0 flex-1">
		<!-- `.thrive-strike` rather than `line-through`: the rule is drawn as a
		     growing pseudo-element so completing something reads as an action
		     rather than a re-render. The app has one strike treatment and this is
		     it. -->
		<label
			for={tickable ? checkboxId : undefined}
			data-done={done ? 'true' : undefined}
			class={cn(
				'thrive-strike block text-sm font-medium break-words',
				tickable && 'cursor-pointer',
				done ? 'text-muted-ink' : 'text-ink'
			)}
		>
			{item.title}
		</label>

		{#if item.detail || item.label}
			<span class="mt-0.5 flex flex-wrap items-center gap-1.5">
				{#if item.detail}
					<!-- A course code or a room. Words, so no numeric treatment. -->
					<span class="truncate text-3xs text-muted-ink">{item.detail}</span>
				{/if}

				{#if item.label}
					<span class="rounded-xs bg-sunken px-1.5 py-0.5 text-3xs text-muted-ink">
						{item.label}
					</span>
				{/if}
			</span>
		{/if}
	</span>

	<span class="flex shrink-0 items-center gap-1.5 self-start">
		<!-- Urgent is suppressed once done, upstream in the merge, so this pill and
		     a strike-through can never appear together.

		     Through `Tag` rather than hand-rolled: urgent is a STATUS, and the app
		     has one status chip. The Next version built its own span with
		     `bg-urgent text-white`, which is a second urgent chip that would drift
		     from the first the moment either was tuned. -->
		{#if item.urgent}
			<Tag tone="urgent">{messages.calendar.row.urgent}</Tag>
		{/if}

		<!-- The category tag is deliberately NOT a `Tag` tone. There are eleven
		     categories against a handful of status tones, and `categoryTag` is the
		     one place hues are used categorically rather than as status -- see the
		     note on `categoryDot` in `schedule.ts`. Every one is paired with its
		     written label, right here. -->
		<span class={cn('rounded-xs px-1.5 py-0.5 text-3xs', categoryTag[item.category])}>
			{categoryLabel[item.category].toLowerCase()}
		</span>
	</span>
</div>
