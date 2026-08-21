import { createOverrideStore } from "$lib/overrideStore.svelte";
import { isEventCategory, type ScheduleItem } from "$lib/schedule";

/**
 * Events the student has said they are not interested in.
 *
 * ONE store, read by both surfaces. Ignore something on Home and it is gone
 * from the calendar; ignore it on the calendar and it is gone from Home. The
 * two surfaces differ in what they do with that fact, not in what they know:
 * Home hides it permanently because Home is a recommendation feed, while the
 * calendar can show it again because the calendar is the record of what exists.
 *
 * ## Only opt-in events are ignorable
 *
 * `EventType` is a closed union of the five opt-in origins (career, rady, club,
 * sandiego, ucsd) and `EVENT_CATEGORIES` is exactly that set, so
 * `isEventCategory` is a reliable guard. Classes, assignments and appointments
 * are `SCHEDULE_CATEGORIES`; tasks, to-dos and student-created events are
 * `PERSONAL_CATEGORIES`. Nothing in either of those groups can be ignored, and
 * `canIgnore` below is the one place that decision lives.
 *
 * ## The id this is keyed on
 *
 * The RAW `Event.id`, not the calendar's item id.
 *
 * The two surfaces name the same event differently. Home holds an `Event` and
 * uses `event.id`, which in the fixtures already looks like `evt-3-1`. The
 * calendar prefixes it again in `buildSchedule`, so the same event arrives as
 * `evt-evt-3-1`. Keying on the raw id and stripping the calendar's prefix in
 * one helper is what makes "one shared state" actually true rather than two
 * stores that happen to have the same name.
 *
 * This is the third of three deliberate key spaces -- task id, calendar item
 * id, raw Event.id -- and normalising through `eventIdOf` on the way in and out
 * is what keeps it its own space rather than a second calendar-item-id store.
 */

const store = createOverrideStore<true>("thrive:ignored-events");

export type IgnoredMap = Readonly<Record<string, true>>;

/** Every ignored id, reactive. Was `useIgnoredEvents()`. */
export const ignoredEvents = () => store.values;

/** Read outside a reactive context. */
export const readIgnoredEvents = () => store.read();

/**
 * The raw `Event.id` behind a calendar item id.
 *
 * `buildSchedule` builds event item ids as `evt-${event.id}`. Stripping exactly
 * one leading `evt-` recovers the original. Anything without that prefix is
 * returned unchanged, so passing a raw id through twice is safe.
 *
 * THE SINGLE NORMALISER. In the Next tree two other sites stripped the prefix
 * inline with `.replace(/^evt-/, "")` instead of calling this -- one in
 * `schedule.ts`, one in `useIgnoreUndo.ts` -- while the docs asserted there was
 * only one. See MIGRATION.md section 9 defect 12. `schedule.ts` keeps its
 * inline copy for the reason recorded there; nothing else should grow one.
 */
export function eventIdOf(itemId: string): string {
	return itemId.startsWith("evt-") ? itemId.slice("evt-".length) : itemId;
}

/**
 * Can this row be ignored at all?
 *
 * The guard, not a suggestion. A class or a deadline is something the student
 * is already committed to, and offering to hide it would be offering to hide an
 * obligation.
 */
export function canIgnore(item: ScheduleItem): boolean {
	return isEventCategory(item.category);
}

export function isEventIgnored(eventId: string, ignored: IgnoredMap): boolean {
	return ignored[eventIdOf(eventId)] === true;
}

/**
 * Not-ignored is the default, so the absence is stored rather than `false`.
 * That keeps the map small and makes un-ignoring a delete rather than a second
 * kind of truth -- which is also why undo restores a row to its original
 * position: ordering was never touched.
 */
export function setEventIgnored(eventId: string, ignored: boolean) {
	store.set(eventIdOf(eventId), ignored ? true : undefined);
}

/** The way back from an empty Home feed. */
export function clearIgnoredEvents() {
	for (const id of Object.keys(store.read())) store.set(id, undefined);
}

export function ignoredCount(ignored: IgnoredMap): number {
	return Object.keys(ignored).length;
}
