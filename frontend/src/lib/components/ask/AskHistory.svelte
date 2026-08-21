<script lang="ts">
	import { page } from '$app/state';
	import MessageSquarePlus from '@lucide/svelte/icons/message-square-plus';

	import { conversationsFor, type ConversationView } from '$lib/ask';
	import { messages } from '$lib/messages';
	import type { AskDestination } from '$lib/data';
	import { cn } from '$lib/utils';

	/**
	 * Saved conversations, as a strip above the chat.
	 *
	 * ## Why this is not a rail any more
	 *
	 * It used to be the bottom half of a second left rail whose top half was the
	 * three destinations. Those moved into the navigation rail, which left a 224px
	 * column holding one list — and an almost-empty rail kept out of inertia is
	 * exactly what the brief said not to do.
	 *
	 * The width it was spending is the width the chat log wanted. So the history
	 * became a horizontal strip and the chat panel got the whole page.
	 *
	 * **The trade, stated:** a vertical list is easier to SCAN than a horizontal
	 * one, and this is worse for that. It is worth it because scanning is not what
	 * a student does here — they are continuing the current conversation almost
	 * always and reopening an old one occasionally, and the fixtures carry one to
	 * three per destination. If a term's worth ever accumulates, this wants to
	 * become a "see all" surface rather than a longer strip.
	 *
	 * Scoped to the destination in view, for the same reason it always was: opening
	 * a Career conversation from inside the Course Recommender would move the
	 * destination underneath the student.
	 */
	let {
		conversations,
		destination
	}: {
		conversations: ConversationView[];
		destination: AskDestination;
	} = $props();

	const copy = messages.ask;

	const visible = $derived(conversationsFor(conversations, destination));

	/** Which conversation is open, from the URL rather than from local state. */
	const openId = $derived(page.url.searchParams.get('c'));
</script>

<section aria-labelledby="ask-history-heading">
	<div class="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
		<p class="thrive-eyebrow" id="ask-history-heading">{copy.rail.historyHeading}</p>

		<!--
			"New conversation" is a link to the bare destination, which is exactly what
			a new conversation IS here: the same page with nothing open. A button
			holding client state would be a second way to express what the URL already
			says, and it would not survive a reload.
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
		<!-- Cards in a sideways scroller. Each is capped so three fit on a laptop and
		     a long title truncates rather than setting the strip's width. -->
		<ul
			aria-label={copy.rail.historyLabel}
			class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
		>
			{#each visible as conversation (conversation.id)}
				{@const open = conversation.id === openId}
				<li class="w-56 shrink-0">
					<a
						href={`/ask/${destination}?c=${conversation.id}`}
						aria-current={open ? 'page' : undefined}
						aria-label={copy.rail.openConversation(
							conversation.title,
							conversation.updatedLabel
						)}
						class={cn(
							'block h-full rounded-md border px-2.5 py-2 transition-colors duration-(--motion-fast) ease-standard',
							open
								? 'border-line-strong bg-primary-soft'
								: 'border-line bg-surface hover:border-line-strong hover:bg-primary-soft'
						)}
					>
						<span class="line-clamp-2 text-2xs text-ink">{conversation.title}</span>

						<!-- When and how long, both values, both on the numeric face so a
						     row of them lines up. -->
						<span class="thrive-numeric mt-1 block text-3xs text-muted-ink">
							{conversation.updatedLabel} · {copy.rail.messageCount(
								conversation.messageCount
							)}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>
