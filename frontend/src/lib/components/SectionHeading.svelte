<script lang="ts">
	import type { Snippet } from 'svelte';

	import { cn } from '$lib/utils';

	/**
	 * The reference's section header, as one primitive.
	 *
	 *     phase 0   Ground truth                              0/21
	 *     ----------------------------------------------------------
	 *
	 * Three registers on one baseline: a mono prefix that names the slot, a bold
	 * sans title that names the thing, and a mono count on the right. The hairline
	 * under it is the only rule on the page, which is what lets it separate
	 * sections without any of them needing a border.
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
		/** Mono, lowercase, muted. The slot: "phase 0", "3 items", "key". */
		prefix?: string;
		title: string;
		/** Mono, right-aligned. A bare number, or a fraction like "6/21". */
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
			<span class="font-mono text-3xs text-muted-ink">{prefix}</span>
		{/if}

		<svelte:element this={as} {id} class="flex-1 text-lg font-bold text-ink">
			{title}
		</svelte:element>

		{#if count}
			<span class="font-mono text-3xs text-muted-ink tabular-nums">{count}</span>
		{/if}

		{@render action?.()}
	</div>
</div>
