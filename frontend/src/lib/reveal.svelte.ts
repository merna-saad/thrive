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

/** The class `app.css` draws the arrival ring from. */
const ARRIVED = 'thrive-arrived';

/**
 * How long a row stays marked, taken from the stylesheet.
 *
 * Read rather than repeated, so the timer that removes the class and the
 * animation that fades it cannot drift apart -- and so the duration stays a
 * design-system value rather than becoming a number in a TypeScript file.
 *
 * The fallback only fires if the token is missing or unparseable, which in
 * practice means the stylesheet did not load. Marking for a second in that case
 * is better than not marking at all: the alternative is a feature that silently
 * stops existing.
 */
function arrivalMs(): number {
	const raw = getComputedStyle(document.documentElement)
		.getPropertyValue('--thrive-arrival-duration')
		.trim();

	const value = parseFloat(raw);
	if (Number.isFinite(value) && value > 0) {
		return raw.endsWith('ms') ? value : value * 1000;
	}
	return 1000;
}

let clearMark: ReturnType<typeof setTimeout> | undefined;

/**
 * Mark a row as just-arrived-at, and unmark it a beat later.
 *
 * ## Why a mark at all
 *
 * The jump used to be focus plus a scroll, and on a page where everything is
 * already visible that is indistinguishable from nothing happening. A student
 * chose an item and concluded the click had failed. Focus is the right ACCESSIBLE
 * answer and it stays; this is the additive visual one, for the pointer user who
 * never sees a focus ring.
 *
 * ## Exactly one row at a time
 *
 * Any previous mark is cleared before this one is applied, and the pending timer
 * with it. Two rows both wearing the ring would read as two selections, and the
 * ring is not a selection -- it is an answer to the last question asked.
 *
 * ## Why the reflow
 *
 * Jumping twice to the SAME row has to show the cue twice. Removing the class and
 * adding it again inside one task is not a change the browser ever sees, so the
 * animation would not restart. Reading `offsetWidth` between the two forces the
 * style to be recomputed, which is what makes the re-add a real transition.
 */
function markArrival(row: HTMLElement): void {
	for (const previous of document.querySelectorAll(`.${ARRIVED}`)) {
		previous.classList.remove(ARRIVED);
	}
	clearTimeout(clearMark);

	row.classList.remove(ARRIVED);
	void row.offsetWidth;
	row.classList.add(ARRIVED);

	clearMark = setTimeout(() => row.classList.remove(ARRIVED), arrivalMs());
}

/**
 * Arrive at a revealed row: focus it, bring it into view, and say so.
 *
 * FOCUS, not scroll. Scrolling alone leaves a keyboard user exactly where they
 * were with the page moved underneath them, which is worse than not jumping at
 * all -- they have to hunt for what the click did. The row carries
 * `tabindex="-1"` so it can take focus without joining the tab order.
 *
 * `await tick()` because the caller has usually just expanded a card, and the
 * row does not exist in the DOM until Svelte has flushed that.
 *
 * `preventScroll` then an explicit `scrollIntoView({ block: 'nearest' })`: one
 * deliberate scroll instead of the browser's default centring followed by a
 * second correction. `nearest` is what keeps the movement inside the card's own
 * scroll container on desktop rather than jumping the page -- and it is also why
 * the mark is unconditional. A row that needed no scrolling gets no movement at
 * all, so the cue is the only thing that distinguishes a jump from a dead click.
 */
export async function arriveAtRow(target: RevealTarget): Promise<void> {
	await tick();

	const row = document.getElementById(revealRowId(target));
	if (!row) return;

	row.focus({ preventScroll: true });
	row.scrollIntoView({ block: 'nearest' });
	markArrival(row);
}
