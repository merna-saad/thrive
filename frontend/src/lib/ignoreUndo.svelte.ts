import { ignoredEvents, isEventIgnored, setEventIgnored } from '$lib/ignoredEvents';

/**
 * Ignore an event, with the same six-second way back that ticking a task has.
 *
 * Was `useIgnoreUndo.ts` / `useIgnoreEvents()` in the Next tree, unported until
 * now. A module singleton here rather than a hook, for the same reason
 * `taskToggle` is: there should be exactly one offer standing at a time no
 * matter how many surfaces are mounted, and a hook gave each caller its own.
 *
 * ## One slot, and a second dismissal replaces the first
 *
 * Deliberately identical to `taskToggle` and `toast`. The pending timer is
 * cleared, the new event takes the slot, and the clock restarts at a full six
 * seconds. The first event stays ignored and its undo is no longer reachable.
 *
 * A queue would stack strips down the page and make the student wait out a
 * column of them; a per-row strip would move as rows reflow. Losing the
 * second-oldest undo is the better trade, and it is the trade the rest of the
 * app already makes.
 *
 * ## Undo restores position, for free
 *
 * Undo writes `undefined` back to the store, which DELETES the override rather
 * than storing "not ignored". The row therefore returns to wherever the
 * provider's ordering puts it -- its original position -- because nothing about
 * ordering was ever changed.
 *
 * ## The key is a raw `Event.id`, never a stripped prefix
 *
 * `isIgnored` takes an `Event.id` and passes it to the store unchanged. The Next
 * version did `eventId.replace(/^evt-/, "")` inline, one of the three places
 * that stripped the prefix while the docs claimed `eventIdOf()` was the only
 * one -- MIGRATION.md section 9 defect 12, and the reason Home and the calendar
 * disagreed about what was ignored.
 *
 * There is nothing to strip here: Home holds `Event` objects and their ids are
 * already raw. `eventIdOf()` exists for CALENDAR ITEM ids (`evt-evt-3-1`), which
 * is a different key space and not one Home ever touches. Calling it here would
 * be normalising something that is already normal, which is how a second
 * normaliser gets added.
 */

const UNDO_MS = 6000;

export interface IgnoreUndo {
	/** Raw `Event.id`, so both surfaces agree on what to restore. */
	eventId: string;
	title: string;
}

let undo = $state<IgnoreUndo | null>(null);
let timer: ReturnType<typeof setTimeout> | null = null;

export const ignoreEvents = {
	/** Takes a raw `Event.id`. No prefix handling, by design -- see above. */
	isIgnored(eventId: string): boolean {
		return isEventIgnored(eventId, ignoredEvents());
	},

	/** The offer currently standing, if any. */
	get undo(): IgnoreUndo | null {
		return undo;
	},

	ignore(eventId: string, title: string): void {
		setEventIgnored(eventId, true);

		if (timer) clearTimeout(timer);
		undo = { eventId, title };
		timer = setTimeout(() => {
			undo = null;
		}, UNDO_MS);
	},

	/**
	 * Un-ignore, with no undo strip raised.
	 *
	 * The row becomes visible again in place, which is its own confirmation. A
	 * strip offering to undo the thing that just reappeared in front of you is
	 * noise. Not reachable from Home, which has no un-ignore path by design --
	 * kept because the calendar will need it.
	 */
	unIgnore(eventId: string): void {
		setEventIgnored(eventId, false);
	},

	applyUndo(): void {
		if (!undo) return;
		setEventIgnored(undo.eventId, false);
		if (timer) clearTimeout(timer);
		timer = null;
		undo = null;
	},

	/**
	 * Drop the standing offer immediately.
	 *
	 * Not in the Next version. Here for the same reason `clearToast` is: tests
	 * need to reset a module singleton between cases, and a six-second wait is
	 * not a test strategy.
	 */
	clear(): void {
		if (timer) clearTimeout(timer);
		timer = null;
		undo = null;
	}
};
