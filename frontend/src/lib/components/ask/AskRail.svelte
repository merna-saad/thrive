<script lang="ts">
	import { page } from '$app/state';
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import LibraryBig from '@lucide/svelte/icons/library-big';
	import MessageSquarePlus from '@lucide/svelte/icons/message-square-plus';

	import { ASK_DESTINATIONS, conversationsFor, type ConversationView } from '$lib/ask';
	import { messages } from '$lib/messages';
	import type { AskDestination } from '$lib/data';
	import type { NavIcon } from '$lib/nav';

	/**
	 * Ask THRIVE's own rail: the three destinations, then the saved history.
	 *
	 * ## It is page furniture, not part of the shell
	 *
	 * This lives INSIDE `<main>`, which is why adding it could not break the
	 * navigation rail, the top bar or the bottom bar -- it does not touch any of
	 * them. The visual effect the brief asked for, two rails side by side on the
	 * left, falls out of the shell's own `lg:pl-rail`: the nav rail is fixed at the
	 * left edge and this sits at the left edge of the content beside it. Nothing in
	 * `AppShell` changed.
	 *
	 * ## What a phone does with it
	 *
	 * Two rails cannot sit side by side at 375px, and the nav rail already solves
	 * its half -- it is `hidden lg:flex`, with `BottomNav` taking over. So on a
	 * phone there is only ever ONE rail on screen, and this one unstacks:
	 *
	 *  - the destinations become a horizontally scrollable row above the chat
	 *  - the saved history keeps its list but is capped and scrolls inside itself,
	 *    so it cannot push the chat off the bottom of the screen
	 *  - at `xl` it becomes the column beside the chat
	 *
	 * All of it is CSS on ONE tree. Not two media-gated subtrees the way the
	 * calendar's week/agenda fallback is: that one swaps between two genuinely
	 * different components, whereas this is the same list in a different direction,
	 * and duplicating it would mean two DOM copies of every link for a screen
	 * reader to find. And not a `matchMedia` read, which would have to guess during
	 * SSR -- see CONVENTIONS.md on viewport questions belonging to CSS.
	 *
	 * `xl` rather than `lg` for the column form, and this is a measurement rather
	 * than a preference: at `lg` (1024px) the nav rail takes 240 and this takes
	 * 224, leaving under 560 for a chat column that has to hold a 65-character
	 * measure plus two bubble insets. At `xl` there is 800. So between the two
	 * breakpoints the nav rail is back but this one is still a horizontal band,
	 * which is the honest arrangement for that width.
	 */
	let {
		conversations,
		destination
	}: {
		conversations: ConversationView[];
		destination: AskDestination;
	} = $props();

	const copy = messages.ask;

	/** One icon per destination. A `Record`, so a fourth is a compile error. */
	const ICONS: Record<AskDestination, NavIcon> = {
		resources: LibraryBig,
		courses: GraduationCap,
		career: Briefcase
	};

	/**
	 * The history, scoped to the destination in view.
	 *
	 * Scoped rather than showing all five, because the three destinations are
	 * separate surfaces and a Career conversation is not something you resume from
	 * inside the Course Recommender -- opening it would move the destination
	 * underneath the student. One predicate over the list the layout already
	 * loaded, which is why the provider does not filter.
	 */
	const visible = $derived(conversationsFor(conversations, destination));

	/** Which conversation is open, from the URL rather than from local state. */
	const openId = $derived(page.url.searchParams.get('c'));
</script>

<aside
	aria-label={copy.rail.label}
	class="flex shrink-0 flex-col gap-3 xl:w-56 xl:border-r xl:border-line xl:pr-3"
>
	<nav aria-label={copy.rail.destinationsHeading}>
		<p class="thrive-eyebrow mb-1.5">{copy.rail.destinationsHeading}</p>

		<!-- A row that scrolls sideways below `xl`, a column above it. The negative
		     margin plus matching padding lets a scrolled row bleed to the panel edge
		     without the focus ring on the first link being clipped. -->
		<ul
			class="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 xl:mx-0 xl:flex-col xl:overflow-visible xl:px-0 xl:pb-0"
		>
			{#each ASK_DESTINATIONS as slug (slug)}
				{@const active = slug === destination}
				{@const Icon = ICONS[slug]}
				{@const entry = copy.destinations[slug]}

				<li class="shrink-0 xl:shrink">
					<a
						href={`/ask/${slug}`}
						aria-current={active ? 'page' : undefined}
						title={entry.blurb}
						class="group flex min-h-11 items-center gap-2 rounded-md border px-2.5 py-1.5 text-2xs font-medium whitespace-nowrap transition-colors duration-(--motion-fast) ease-standard
							{active
							? // The same treatment the nav rail gives its current item: a solid
								// fill INSIDE the control-weight stroke. The stroke is the part
								// that matters, because appearing and disappearing is a shape
								// change and survives not being able to separate the hues.
								'border-line-strong bg-primary text-on-primary'
							: 'border-transparent text-body hover:border-line hover:bg-surface hover:text-ink'}"
					>
						<Icon
							aria-hidden="true"
							class="size-4 shrink-0 {active ? 'text-on-primary' : 'text-muted-ink'}"
						/>
						<span class="xl:truncate">{entry.label}</span>
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<div class="min-h-0 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
		<div class="mb-1.5 flex items-baseline justify-between gap-2">
			<p class="thrive-eyebrow">{copy.rail.historyHeading}</p>

			<!--
				"New conversation" is a link to the bare destination, which is exactly
				what a new conversation IS here: the same page with nothing open. A
				button holding client state would have been a second way to express a
				thing the URL already says, and it would not have survived a reload.
			-->
			{#if openId}
				<a
					href={`/ask/${destination}`}
					class="inline-flex min-h-11 items-center gap-1 rounded-sm px-1 text-3xs text-muted-ink hover:text-ink"
				>
					<MessageSquarePlus aria-hidden="true" class="size-3.5 shrink-0" />
					{copy.rail.newConversation}
				</a>
			{/if}
		</div>

		{#if visible.length === 0}
			<p class="text-3xs text-muted-ink">{copy.rail.historyEmpty}</p>
		{:else}
			<!--
				Capped and scrolling inside itself below `xl`. On a phone this sits
				ABOVE the chat, so an uncapped list of a term's conversations would push
				the composer off the bottom of the screen -- and the composer is the
				thing the page is for. Above `xl` it is the rail's own column and takes
				whatever height is left.
			-->
			<ul
				aria-label={copy.rail.historyLabel}
				class="max-h-40 min-h-0 space-y-1 overflow-y-auto xl:max-h-none xl:flex-1"
			>
				{#each visible as conversation (conversation.id)}
					{@const open = conversation.id === openId}
					<li>
						<a
							href={`/ask/${destination}?c=${conversation.id}`}
							aria-current={open ? 'page' : undefined}
							aria-label={copy.rail.openConversation(
								conversation.title,
								conversation.updatedLabel
							)}
							class="block rounded-md border px-2.5 py-2 transition-colors duration-(--motion-fast) ease-standard
								{open
								? 'border-line-strong bg-primary-soft'
								: 'border-transparent hover:border-line hover:bg-surface'}"
						>
							<span class="block truncate text-2xs text-ink">{conversation.title}</span>

							<!-- When and how long, both values, both on the numeric face so a
							     column of them lines up. -->
							<span class="thrive-numeric mt-0.5 block text-3xs text-muted-ink">
								{conversation.updatedLabel} · {copy.rail.messageCount(
									conversation.messageCount
								)}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</aside>
