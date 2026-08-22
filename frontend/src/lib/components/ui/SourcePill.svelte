<script lang="ts">
	import type { SourceSystem } from '$lib/data';
	import { sourceLabel, sourceSpoken } from '$lib/sources';
	import { cn } from '$lib/utils';

	/**
	 * WHERE A ROW CAME FROM. Provenance, not status.
	 *
	 * ## It does not know what Canvas is
	 *
	 * The origin is a key into `messages.common.source.label`. Nothing here
	 * branches on a particular system, so adding Handshake is one message entry
	 * plus a fixture field -- no component changes at all. That was the point of
	 * putting a named origin on the types rather than a boolean: `isFromCanvas`
	 * would have made every render site know which system was special, and the
	 * second system would have meant touching all of them.
	 *
	 * ## Two ways it renders nothing
	 *
	 * An ABSENT origin, and an origin whose label this build does not know. Both
	 * take the same path, which is deliberate: Django can send a value newer than
	 * the frontend, and an unknown system must render nothing rather than put a
	 * raw slug on a row. `sourcePill.spec.ts` pins both.
	 *
	 * ## Quiet on purpose
	 *
	 * A row can already carry an urgency chip, a status tag and a category tag,
	 * all of which say something more important than where the row came from. So
	 * this is the smallest step in the scale, muted ink, a hairline, and no fill --
	 * NOT a `Tag`, which is the component for tones that mean something. It reads
	 * as a footnote beside the title rather than a fourth thing competing for the
	 * same glance.
	 *
	 * ## The accessible name is a sentence, the visible text is a word
	 *
	 * "Canvas" beside an assignment title tells a screen reader user the word and
	 * nothing about why it is there. So the visible pill stays one word and the
	 * spoken form is "From Canvas", carried in an `sr-only` span with the visible
	 * text `aria-hidden`. Same construction as every other quiet marker here.
	 */
	let {
		origin,
		class: className = ''
	}: {
		/** May be undefined. Undefined renders nothing. */
		origin?: SourceSystem;
		class?: string;
	} = $props();

	/*
	 * Both decisions live in `$lib/sources`, not here, because Vitest runs in Node
	 * with no jsdom -- logic inside a `.svelte` file is logic no gate can see, and
	 * the decision worth pinning is the negative one. See `sources.spec.ts`.
	 */
	const name = $derived(sourceLabel(origin));
	const spoken = $derived(sourceSpoken(origin));
</script>

{#if name}
	<span
		class={cn(
			'inline-flex shrink-0 items-center rounded-xs border border-hairline px-1 text-3xs text-muted-ink',
			className
		)}
	>
		<span aria-hidden="true">{name}</span>
		<span class="sr-only">{spoken}</span>
	</span>
{/if}
