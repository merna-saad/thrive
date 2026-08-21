import type { Action } from 'svelte/action';

export interface HoverIntentParams {
	onEnter: () => void;
	onLeave: () => void;
}

/**
 * Hover in and out of a node, but only on a device that has a hovering pointer.
 *
 * ## Why the gate is here and not at the call site
 *
 * `(hover: hover)` is the media feature Tailwind v4 compiles every `hover:`
 * utility in this app into, so a JS opener that reads the same feature and a CSS
 * reveal that reads it in a media query cannot disagree about what a hovering
 * device is. Putting it in an action means there is ONE expression of that rule
 * rather than one per component -- which is how the two-face type rule spread in
 * the first place, and the reason `designSystem.spec.ts` exists.
 *
 * A touch device gets nothing from this. That is the point: hover is additive,
 * and anything reachable only by hover is unreachable on a phone. Whatever this
 * opens must also open on click.
 *
 * ## Why an action rather than handlers in markup
 *
 * Two reasons, and the second is the real one.
 *
 * The gate belongs with the behaviour, as above. And a wrapper element carrying
 * `onpointerenter` in markup trips Svelte's
 * `a11y_no_static_element_interactions`, which wants an ARIA role on anything
 * interactive. That check is right in general and a false positive here: the
 * interactive element is the BUTTON inside, correctly marked up, and this is a
 * redundant convenience on top of it. The alternatives were inventing a
 * `role="group"` that says nothing, or a `svelte-ignore` -- and the check is
 * worth keeping honest for the next component that really does put a click on a
 * `<div>`.
 *
 * `matchMedia` is read per event rather than once, so there is no `window` needed
 * at import time and a mouse plugged into a tablet mid-session is noticed.
 */
export const hoverIntent: Action<HTMLElement, HoverIntentParams> = (node, params) => {
	let current = params;

	function hovers(): boolean {
		return typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;
	}

	function enter() {
		if (hovers()) current.onEnter();
	}

	function leave() {
		if (hovers()) current.onLeave();
	}

	node.addEventListener('pointerenter', enter);
	node.addEventListener('pointerleave', leave);

	return {
		update(next: HoverIntentParams) {
			current = next;
		},
		destroy() {
			node.removeEventListener('pointerenter', enter);
			node.removeEventListener('pointerleave', leave);
		}
	};
};
