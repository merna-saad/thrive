import { getContext, setContext, tick } from 'svelte';

import { revealRowId, type RevealTarget } from '$lib/reveal';

/**
 * The channel that carries "reveal this row" across the page.
 *
 * ## Why this is a channel and not a piece of state
 *
 * The state a reveal needs already exists and already has an owner: each card's
 * own collapse `$state`. What was missing is a way to ASK. So this carries an
 * intent, one slot at a time, and every card reads it and decides for itself
 * whether the request is about one of its rows. Nothing outside a card ever
 * writes a card's state, which is the constraint the whole design is arranged
 * around -- see `reveal.ts`.
 *
 * ## The nonce, and why a bare target is not enough
 *
 * Two clicks on the same popover item are two requests. With only the target in
 * the slot the second write is `target === target` and Svelte's equality check
 * makes it a no-op, so the second click does nothing -- which is precisely the
 * click a student makes when the first one did not seem to work. The nonce makes
 * every request distinct.
 *
 * It is also what lets a card be idempotent without the channel needing a
 * `clear()`: a card records the last nonce it handled and ignores that one
 * again. Clearing from inside a card would be one card deciding on behalf of the
 * others, and whether the second card saw the request first would come down to
 * effect ordering.
 *
 * ## Not persisted, structurally
 *
 * Created by `+page.svelte` and handed down through context, so it is scoped to
 * the page's component tree and destroyed with it. Collapse state resetting on
 * navigation is therefore a property of where this lives, not a `reset()` call
 * somebody has to remember. A module-level `$state` would survive a client-side
 * navigation and quietly reopen a card on the way back.
 */

export interface RevealRequest {
	target: RevealTarget;
	/** Distinguishes two requests for the same row. Never read for meaning. */
	nonce: number;
}

export interface RevealChannel {
	/** The outstanding request, reactive. Null before anything is asked for. */
	current: () => RevealRequest | null;
	request: (target: RevealTarget) => void;
}

export function createRevealChannel(): RevealChannel {
	let outstanding = $state<RevealRequest | null>(null);
	let nonce = 0;

	return {
		current: () => outstanding,
		request: (target: RevealTarget) => {
			nonce += 1;
			outstanding = { target, nonce };
		}
	};
}

const REVEAL_KEY = Symbol('thrive:reveal');

export function setRevealChannel(channel: RevealChannel): void {
	setContext(REVEAL_KEY, channel);
}

/**
 * The channel for the surrounding page.
 *
 * Throws rather than returning undefined, the same way `PagePlaceholder` throws
 * on an href that is in no nav list: a card whose reveal silently never fires is
 * a bug that looks like a design decision. Failing at mount says which
 * component forgot to provide it.
 */
export function getRevealChannel(): RevealChannel {
	const channel = getContext<RevealChannel | undefined>(REVEAL_KEY);
	if (!channel) {
		throw new Error(
			'No reveal channel in context. Call setRevealChannel() in the page that owns these cards.'
		);
	}
	return channel;
}

/**
 * Move focus to a revealed row, and bring it into view.
 *
 * FOCUS, not scroll. Scrolling alone leaves a keyboard user exactly where they
 * were with the page moved underneath them, which is worse than not jumping at
 * all -- they have to hunt for what the click did. The row carries
 * `tabindex="-1"` so it can take focus without joining the tab order, and it
 * keeps its focus ring: the ring is the whole point, since it is the only thing
 * saying "here is the thing you asked for".
 *
 * `await tick()` because the caller has usually just expanded a card, and the
 * row does not exist in the DOM until Svelte has flushed that.
 *
 * `preventScroll` then an explicit `scrollIntoView({ block: 'nearest' })`: one
 * deliberate scroll instead of the browser's default centring followed by a
 * second correction. `nearest` is what keeps the movement inside the card's own
 * scroll container on desktop rather than jumping the page.
 */
export async function focusRevealedRow(target: RevealTarget): Promise<void> {
	await tick();

	const row = document.getElementById(revealRowId(target));
	if (!row) return;

	row.focus({ preventScroll: true });
	row.scrollIntoView({ block: 'nearest' });
}
