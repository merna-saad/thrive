<script lang="ts">
	import type { Snippet } from 'svelte';

	import AskRail from '$lib/components/ask/AskRail.svelte';
	import { isAskDestination, DEFAULT_DESTINATION } from '$lib/ask';
	import { messages } from '$lib/messages';
	import { page } from '$app/state';
	import { pageTitle } from '$lib/title';
	import type { LayoutData } from './$types';

	/**
	 * The section frame: a header, the rail, and whichever destination is open.
	 *
	 * ## Why the rail is here and not in the page
	 *
	 * It is the same rail on all three destinations. In a layout it is rendered
	 * once and SURVIVES navigation between them, so switching destination does not
	 * tear down and rebuild the list of saved conversations underneath the student
	 * -- the highlighted link changes and nothing else moves. In the page it would
	 * remount on every click.
	 *
	 * ## The destination is read from the URL here too
	 *
	 * The page's `load` validates the segment and is the thing that 404s, but the
	 * rail needs to know which link is current and a layout cannot read its child's
	 * data. So it reads the same parameter and falls back to the default for the
	 * one frame `/ask` renders before its redirect lands. That fallback is never
	 * user-visible; it exists so the type is honest rather than asserted.
	 */
	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const copy = messages.ask;

	const destination = $derived.by(() => {
		const slug = page.params.destination ?? '';
		return isAskDestination(slug) ? slug : DEFAULT_DESTINATION;
	});
</script>

<svelte:head><title>{pageTitle(copy.documentTitle)}</title></svelte:head>

<!--
	`h-full min-h-0` down the spine is what lets the chat log be the only thing that
	scrolls on a desktop. Without `min-h-0` on every flex parent, a flex child
	refuses to shrink below its content and the log's own `overflow-y-auto` never
	engages -- the whole document grows instead, which is precisely the shape
	`check:layout` exists to catch.
-->
<div class="flex min-h-0 flex-col gap-4">
	<!-- The section's one `h1`. The chat window's title is an `h2` under it: there
	     is one page here and the destination is a region within it, not a document
	     of its own. -->
	<header>
		<p class="thrive-eyebrow">{copy.eyebrow}</p>
		<h1 class="mt-1 text-3xl font-bold text-ink">{copy.title}</h1>
		<p class="mt-1.5 max-w-prose text-sm text-body">{copy.intro}</p>
	</header>

	<!-- Column below `xl`, two columns above it. See the note in `AskRail` on why
	     the breakpoint is `xl` and why this is CSS on one tree. -->
	<div class="flex min-h-0 flex-col gap-4 xl:flex-row xl:gap-5">
		<AskRail conversations={data.conversations} {destination} />

		{@render children()}
	</div>
</div>
