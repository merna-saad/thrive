<script lang="ts">
	import AlertTriangle from '@lucide/svelte/icons/triangle-alert';
	import Info from '@lucide/svelte/icons/info';

	import Tag from '$lib/components/ui/Tag.svelte';
	import SourcePill from '$lib/components/ui/SourcePill.svelte';
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
	 * person wrote and takes the sans.
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
	 * ## The details control
	 *
	 * `onOpen` arrived in 7c with `ItemDetail`. It is optional for the same reason
	 * `onTick` is: a view that has nowhere to put a dialog must not render a button
	 * that does nothing. The WEEK column never gets one — see `compact`.
	 */
	let {
		item,
		density = 'full',
		dateLabel,
		onTick,
		onOpen
	}: {
		item: ScheduleItem;
		/**
		 * How much horizontal room this row has. Three shapes, one per context.
		 *
		 * Was `compact?: boolean` until 2026-08-30, and a boolean stopped being able
		 * to say enough the moment a THIRD width existed. The rail is 262px of
		 * content: far too narrow for `full`, far too wide to throw away the
		 * checkbox and the detail line the way `column` does.
		 *
		 *   full    ~985px under the grid, and in the agenda. Everything: checkbox,
		 *           a 64px time gutter, title, detail, urgent pill, type tag,
		 *           source pill, details button, all on one baseline.
		 *
		 *   rail    ~262px in the calendar's right rail. STACKED: checkbox and title
		 *           on the first line, time and detail on the second. Keeps the
		 *           checkbox, because the rail is where a student actually ticks
		 *           things off. Drops the type tag and the source pill -- the rail
		 *           is one day's list under a heading that already says which day,
		 *           so the category is context the surrounding section gives.
		 *
		 *   column  ~80px in the week grid. Time ABOVE the title, no detail, no tag,
		 *           title clamped to three lines. Side-by-side was tried first in
		 *           the prototype and read badly: an ~80px column minus a time
		 *           gutter left "MGT 142 · Machine Learning for Business" wrapping
		 *           to five lines, and adjacent columns ran together into one
		 *           string.
		 *
		 * `column` rows carry NO checkbox, deliberately, and `rail` rows do. A 17px
		 * control inside an 80px column with a three-line title is a mis-tap waiting
		 * to happen; the same control in a 262px rail has a whole line to itself.
		 * The week view's job is shape rather than action -- selecting the day drops
		 * a student into the rail, where the same row is fully tickable.
		 */
		density?: 'full' | 'rail' | 'column';
		/**
		 * Pre-formatted date, shown beside the detail line.
		 *
		 * For the agenda when its groups are NOT days: grouped by type or by course,
		 * a row's time alone does not say which of thirty days it falls on. Passed in
		 * already formatted, because the caller is the only one that knows the day
		 * key and this component never interprets a date. `showsRowDate` in
		 * `$lib/calendarViews` is the decision of when to pass it.
		 */
		dateLabel?: string;
		onTick?: (item: ScheduleItem, done: boolean) => void;
		/**
		 * Open the detail dialog on this item.
		 *
		 * Absent in the week column and in any view that has no dialog to open.
		 * `CalendarView` is the only thing that can supply it, because `detail` is
		 * one of the three pieces of state that node owns.
		 */
		onOpen?: (item: ScheduleItem) => void;
	} = $props();

	const done = $derived(item.done === true);
	/* `column` is the only density that refuses the control. See the prop note. */
	const tickable = $derived(density !== 'column' && isTickable(item) && Boolean(onTick));
	const time = $derived(item.allDay ? messages.calendar.row.allDay : item.timeLabel);

	// Scoped to the row, so two views showing the same item cannot collide.
	const checkboxId = $derived(`tick-${item.id}`);
</script>

{#if density === 'column'}
	<!-- A left rule rather than a border box. Without it the stacked rows in
	     adjacent day columns run together and read as one wrapped sentence. -->
	<div
		data-done={done ? 'true' : undefined}
		class="thrive-row border-l-2 border-line px-1.5 py-1 lg:py-0.5"
	>
		<span class={cn('thrive-numeric flex items-center gap-1 text-3xs', done ? 'text-faint' : 'text-muted-ink')}>
			{#if item.urgent}
				<!-- The one place urgency is a glyph rather than a pill: there is no
				     room for the word, and the pill would take the whole column. The
				     accessible name still carries it. -->
				<AlertTriangle aria-label={messages.calendar.row.urgentLabel} class="size-3 shrink-0 text-urgent" />
			{/if}
			{time}
		</span>
		<!-- No `block` here, and that is load-bearing rather than a tidy-up.
		     `line-clamp-3` works by setting `display: -webkit-box`, so a `display`
		     utility beside it wins in the cascade and the clamp silently does
		     nothing. Measured before the fix: a 71px column rendered "MGT 142 ·
		     Machine Learning for Business" 140px tall — seven lines, not three —
		     and nothing warned, because an unclamped clamp is not an error. -->
		<span
			data-done={done ? 'true' : undefined}
			class={cn(
				'thrive-strike mt-0.5 line-clamp-3 text-xs font-medium break-words',
				done ? 'text-muted-ink' : 'text-ink'
			)}
		>
			{item.title}
		</span>
	</div>
{:else if density === 'rail'}
	<!--
		THE RAIL ROW. Stacked, because 262px cannot hold a 64px time gutter, a
		title, a detail line and four markers on one baseline.

		A WHITE CARD, not a row. Rows belong in a panel that groups them; the rail
		is a column of individual things a student works through one at a time, and
		a card is what that looks like. Generous padding for the same reason -- this
		is the page's second focal point, not a list to skim.

		GOLD LIVES HERE, and it is one of exactly two places on this page. A left
		rule in the campus gold plus a small warning glyph on anything the student
		flagged urgent, which is what makes the rail scannable for "what is about to
		bite me".

		IT IS NOT THE CARRIER OF THAT MEANING, and it must not become one. Gold is
		1.43:1 on cream and 1.50:1 on the card -- it fails the 3:1 WCAG 1.4.11 asks
		of a graphic that carries meaning, and `check-contrast.py` enforces that as
		a CEILING precisely so nobody promotes it. So the coral `Tag` and its word
		"Urgent" stay exactly where they were, and the GLYPH carries its own
		accessible label. The gold is what your eye lands on first; it is not what
		tells you. Remove the rule and nothing is lost but speed; remove the Tag and
		the row stops saying it.
	-->
	<div
		data-done={done ? 'true' : undefined}
		class={cn(
			// SUNKEN, not white. The rail sits on cream and its cards read as a
			// distinct column against it; white-on-cream is the panel treatment used
			// everywhere else in THRIVE and here it made the cards blend into the
			// grid card beside them. It also gives the urgent card's gold rule
			// something to push against.
			'rounded-lg bg-sunken p-3 transition-colors duration-(--motion-base) ease-standard',
			done && 'opacity-60',
			item.urgent && !done && 'border-l-2 border-l-yellow'
		)}
	>
		<div class="flex items-start gap-2">
			{#if tickable}
				<input
					id={checkboxId}
					type="checkbox"
					class="thrive-checkbox mt-0.5 shrink-0"
					checked={done}
					onchange={(event) => onTick?.(item, event.currentTarget.checked)}
					aria-label={messages.calendar.row.toggle(item.title, done)}
				/>
			{:else}
				<span aria-hidden="true" class="mt-0.5 size-checkbox shrink-0"></span>
			{/if}

			<label
				for={tickable ? checkboxId : undefined}
				data-done={done ? 'true' : undefined}
				class={cn(
					'thrive-strike block min-w-0 flex-1 text-sm font-medium break-words',
					tickable && 'cursor-pointer',
					done ? 'text-muted-ink' : 'text-ink'
				)}
			>
				{item.title}
			</label>

			{#if item.urgent}
				<!--
					THE GLYPH IS CORAL, THE RULE IS GOLD, and that split is the one place
					this treatment departs from the brief's wording. Worth the note.

					The brief asks for "a left border plus small warning glyph" as gold's
					second role. The BORDER is gold and that is the accent the eye catches.
					The glyph is not, because it is the only mark left carrying the meaning
					once the coral "Urgent" pill came off this card -- and a graphic that
					carries meaning owes 3:1 under WCAG 1.4.11, where gold measures 1.50:1
					on a white card. `check-contrast.py` holds that ceiling deliberately.

					Coral is the system's reserved urgency colour, it measures 5.9:1 here,
					and it is what `ItemRow`'s week-column density already uses for exactly
					this glyph. So the role the brief asked for is intact -- gold marks
					urgency on this page and nowhere else -- and the part a student has to
					be able to SEE is drawn in something they can.
				-->
				<AlertTriangle
					aria-label={messages.calendar.row.urgentLabel}
					class="mt-0.5 size-3.5 shrink-0 text-urgent"
				/>
			{/if}

			<!--
				THE DETAILS CONTROL, and leaving it out of this branch was a real
				regression rather than a tidy simplification.

				The rail is now the ONLY place a day's rows render in month view, so a
				row with no way into `ItemDetail` means the dialog is unreachable -- and
				with it renaming, the urgent flag, "add to calendar", and DELETING a
				custom event. `check:interaction` caught it as four red lines in the
				delete flow, which is exactly the failure a gate that drives the real
				app is for: nothing about the rail LOOKED wrong.

				`column` still omits it deliberately. An 80px week cell has no room, and
				selecting the day there drops the student into this rail, where the same
				row has the control.
			-->
			{#if onOpen}
				<button
					type="button"
					onclick={(event) => {
						/* Focus the trigger before opening, so the dialog has somewhere
						   definite to put focus back. See the note on the full row. */
						event.currentTarget.focus();
						onOpen(item);
					}}
					aria-label={messages.calendar.detail.open(item.title)}
					class="shrink-0 rounded-xs p-1 text-muted-ink transition-colors duration-(--motion-fast) ease-standard hover:bg-surface hover:text-ink"
				>
					<Info aria-hidden="true" class="size-3.5" />
				</button>
			{/if}
		</div>

		<!-- Second line, indented past the checkbox so it hangs under the title
		     rather than under the control. `size-checkbox` plus the row gap, from
		     the same token the spacer above uses. -->
		{#if time || item.detail}
			<div class="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 pl-[calc(var(--spacing-checkbox)+var(--spacing)*2)]">
				<span class={cn('thrive-numeric text-3xs', done ? 'text-faint' : 'text-muted-ink')}>
					{time}
				</span>
				{#if item.detail}
					<span aria-hidden="true" class="text-3xs text-faint">·</span>
					<!-- A course code or a room. Words, so no numeric treatment. -->
					<span class="min-w-0 truncate text-3xs text-muted-ink">{item.detail}</span>
				{/if}
			</div>
		{/if}
	</div>
{:else}
	<div data-done={done ? 'true' : undefined} class="thrive-row flex items-baseline gap-2 px-2 py-1.5 lg:py-1">
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

		{#if dateLabel || item.detail || item.label}
			<span class="mt-0.5 flex flex-wrap items-center gap-1.5">
				{#if dateLabel}
					<!-- Which day, when the group heading is not already saying it. First
					     in the line because it is the coarser fact: a student scanning a
					     type-grouped agenda is asking "when", and the course code is
					     context for the answer rather than the answer. Already formatted
					     upstream; this component never interprets a date. -->
					<span class="text-3xs font-medium text-body">{dateLabel}</span>
				{/if}

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
		     has one status chip. The Next version built its own span, filling with
		     the urgent token and lettering it in a stock white utility -- a second
		     urgent chip that would drift from the first the moment either was
		     tuned, and which the dark theme would have broken outright. -->
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

		<!-- Provenance, AFTER the category tag and before the details control.
		     Deliberately last of the three markers: urgent is a status, the category
		     says what kind of thing this is, and where it came from is the least
		     urgent of the three. It renders nothing when the row has no origin, so
		     rows that carry one do not shift the ones that do not. -->
		<SourcePill origin={item.origin} />

		<!-- The details control, LAST in the strip and right-anchored with it.
		     A conditional control appearing at the leading edge of a right-anchored
		     group is the one arrangement that does not move anything already on
		     screen — the same rule TaskRow's control strip follows.

		     Its accessible name carries the title. "Details" on every row means a
		     screen reader hears the same word twelve times with no way to tell which
		     row it is on. -->
		{#if onOpen}
			<button
				type="button"
				onclick={(event) => {
					/*
					 * Focus the trigger before opening, so the dialog has somewhere
					 * definite to put focus back.
					 *
					 * `focusTrap` restores to whatever held focus at mount, and a POINTER
					 * press does not reliably leave focus on a button — Chrome does it,
					 * Safari on macOS does not. Without this, a mouse user closing the
					 * dialog lands on `<body>` and the next Tab starts at the top of the
					 * page, which is the failure focus restoration exists to prevent.
					 * Keyboard users already have it focused; this costs them nothing.
					 */
					event.currentTarget.focus();
					onOpen(item);
				}}
				aria-label={messages.calendar.detail.open(item.title)}
				class="shrink-0 rounded-xs p-1 text-muted-ink transition-colors duration-(--motion-fast) ease-standard hover:bg-surface hover:text-ink"
			>
				<Info aria-hidden="true" class="size-3.5" />
			</button>
		{/if}
	</span>
	</div>
{/if}
