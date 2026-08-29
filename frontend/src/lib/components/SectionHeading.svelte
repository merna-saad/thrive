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

		<svelte:element this={as} {id} class="flex-1 text-lg font-bold text-ink">
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
