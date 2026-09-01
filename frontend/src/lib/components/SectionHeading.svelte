<script lang="ts">
	import type { Snippet } from 'svelte';

	import { cn } from '$lib/utils';

	/**
	 * The reference's section header, as one primitive.
	 *
	 *     phase 0   Ground truth                              0/21
	 *     ----------------------------------------------------------
	 *
	 * Three registers on one baseline: a prefix that names the slot, a bold title
	 * that names the thing, and a count on the right. The hairline under it is the
	 * only rule on the page, which is what lets it separate sections without any
	 * of them needing a border.
	 *
	 * TWO FACES, split on words-versus-values (2026-08-22). The prefix is words,
	 * so it takes `.thrive-eyebrow` and renders in the sans; the count is a value,
	 * so it takes `.thrive-numeric` and stays mono. Both were mono before, which
	 * is how a face meant for numbers ended up carrying "phase 0" and "key".
	 *
	 * AND THE TITLE DELIBERATELY DID NOT TAKE THE THIRD FACE (2026-08-29). Teko is
	 * for page titles; this is a SECTION heading, and the distinction is positional
	 * rather than a matter of taste. Every call site renders an `h2` or `h3` inside
	 * a page that already has its own `h1` -- "Key", "Happening", a day's stream
	 * name -- at `text-lg`, which is 17.25px on desktop. A condensed display face
	 * set in caps at that size is exactly the illegibility `.thrive-display` exists
	 * to stay away from, and a second Teko heading under the first would flatten
	 * the hierarchy this primitive draws its hairline to state. If this component
	 * ever does serve a page-level title, that is what the `as` union would have to
	 * widen for, and the class can be added then.
	 *
	 * Extracted in the Next app because there were six near-copies of this shape
	 * across the calendar and they had already drifted on padding and heading
	 * level.
	 *
	 * `as` was a polymorphic React prop rendering `<Tag>`. Here it is
	 * `<svelte:element this={as}>`, which is the only way to pick a tag from a
	 * variable in Svelte. The union stays h2 | h3 rather than widening to string:
	 * this is a section heading, and the constraint is what stops it becoming a
	 * div somewhere and quietly leaving the document outline.
	 */
	let {
		prefix,
		title,
		count,
		action,
		id,
		as = 'h2',
		tone = 'default',
		class: className
	}: {
		/** The slot: "phase 0", "3 items", "key". Words, so the sans. */
		prefix?: string;
		title: string;
		/** Right-aligned. A bare number, or a fraction like "6/21". A value, so mono. */
		count?: string;
		/** Optional control pinned right of the count. */
		action?: Snippet;
		id?: string;
		as?: 'h2' | 'h3';
		/**
		 * How loudly the title speaks. Added 2026-08-30 with the calendar's
		 * hierarchy pass.
		 *
		 * `default` is the bold `text-lg` this component has always drawn, and every
		 * existing call site keeps it by not passing anything.
		 *
		 * `quiet` renders the title as an eyebrow: small, uppercase, tracked, muted.
		 * It exists because /calendar had six things competing to be the page's
		 * subject -- the title, the month, the day, "your day", "Tasks" and "Key" --
		 * and a page with six focal points has none. The sections did not need to be
		 * removed or renamed; they needed to stop shouting. See the note on the two
		 * focal points in `CalendarView`.
		 *
		 * A PROP RATHER THAN A SECOND COMPONENT, because the structure is identical:
		 * same baseline, same count, same action slot, same hairline. A
		 * `QuietSectionHeading` would be this file with one class changed, and the
		 * two would drift on padding the way the six near-copies this component was
		 * extracted from already did once.
		 */
		tone?: 'default' | 'quiet';
		class?: string;
	} = $props();
</script>

<div class={cn('border-b border-hairline pb-1.5', className)}>
	<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
		{#if prefix}
			<!-- No font at all: words get the document default, which is the sans.
			     Not `.thrive-eyebrow` -- that class uppercases, and this prefix sits
			     inline with the title in lowercase ("phase 0"), which is a different
			     shape from a standalone eyebrow above a page heading. -->
			<span class="text-3xs text-muted-ink">{prefix}</span>
		{/if}

		<!-- `.thrive-eyebrow` carries size, case, tracking, weight AND colour, so the
		     quiet arm sets no `text-*` of its own -- adding one would fight the class
		     from the utilities layer and win, which is the trap the display treatment
		     documents at length. -->
		<svelte:element
			this={as}
			{id}
			class={tone === 'quiet' ? 'thrive-eyebrow flex-1' : 'flex-1 text-lg font-bold text-ink'}
		>
			{title}
		</svelte:element>

		{#if count}
			<!-- A value. `.thrive-numeric` carries both the face and tabular figures,
			     so `tabular-nums` is no longer a separate thing to remember. -->
			<span class="thrive-numeric text-3xs text-muted-ink">{count}</span>
		{/if}

		{@render action?.()}
	</div>
</div>
