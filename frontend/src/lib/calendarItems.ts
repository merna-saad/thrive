import { createOverrideStore } from "$lib/overrideStore.svelte";
import { dayKeyOf, type DatedScheduleItem } from "$lib/schedule";

/**
 * What the student adds to, or says about, the calendar.
 *
 * Three separate stores rather than one blob, because they have genuinely
 * different lifetimes:
 *
 *   labels   an annotation ON an item that may not be the student's
 *   urgent   a flag ON an item that may not be the student's
 *   custom   an item the student created, which nothing else knows about
 *
 * ## Why labels and urgent are keyed by CALENDAR item id
 *
 * Not by task id. The ids used here are the ones the calendar builds --
 * `asg-12`, `apt-3`, `task-7`, `todo-x` -- which means a student can flag an
 * assignment urgent or label a booked appointment, neither of which they own
 * and neither of which has anywhere on the server to put that. Keying by task
 * id would have limited both features to the one stream the student can
 * already edit, which is the stream that needed them least.
 *
 * This is one of THREE deliberate key spaces in the app and must not be merged
 * with the others: task id (`userEdits`), calendar item id (here), and raw
 * `Event.id` normalised through `eventIdOf` (`ignoredEvents`). Merging them is
 * the exact shape of the bug the ignore store was refactored to avoid.
 *
 * ## Why custom events are not "events"
 *
 * `getEvents()` returns programme events with an origin (career, rady, club).
 * A thing the student typed has no origin, cannot be registered for, and must
 * not appear to be Rady-issued. It gets its own category so the key can filter
 * it separately and so nothing downstream mistakes it for institutional truth.
 */

/* --- Labels ------------------------------------------------------------- */

const labelStore = createOverrideStore<string>("thrive:item-labels");

/** Was `useItemLabels()`. */
export const itemLabels = () => labelStore.values;

/** An emptied label is a removed label, not a blank chip. */
export function setItemLabel(itemId: string, label: string) {
	const trimmed = label.trim();
	labelStore.set(itemId, trimmed || undefined);
}

/* --- Urgent ------------------------------------------------------------- */

const urgentStore = createOverrideStore<true>("thrive:item-urgent");

/** Was `useItemUrgent()`. */
export const itemUrgent = () => urgentStore.values;

/**
 * Not-urgent is the default, so the absence is stored rather than `false`.
 * That keeps the map small and makes "has the student ever touched this"
 * answerable, which `false` would not.
 */
export function setItemUrgent(itemId: string, urgent: boolean) {
	urgentStore.set(itemId, urgent ? true : undefined);
}

/* --- Custom events ------------------------------------------------------ */

export interface CustomEvent {
	id: string;
	title: string;
	/** "YYYY-MM-DD", local. */
	dayKey: string;
	/** "HH:mm" wall clock. Absent means all-day. */
	time?: string;
	label?: string;
	urgent?: boolean;
	createdAt: number;
}

const customStore = createOverrideStore<CustomEvent>("thrive:custom-events");

/** Was `useCustomEvents()`. Oldest first. */
export function customEvents(): CustomEvent[] {
	return Object.values(customStore.values).sort((a, b) => a.createdAt - b.createdAt);
}

export function readCustomEvents(): CustomEvent[] {
	return Object.values(customStore.read());
}

export function addCustomEvent(
	event: Omit<CustomEvent, "id" | "createdAt"> & { id?: string },
): string {
	// `createdAt` is the sort key and the id seed. Not Math.random: two events
	// added in the same millisecond are vanishingly unlikely, and a deterministic
	// id is easier to reason about when something goes wrong.
	const createdAt = Date.now();
	const id = event.id ?? `custom-${createdAt}`;

	customStore.set(id, { ...event, id, createdAt });
	return id;
}

export function updateCustomEvent(id: string, patch: Partial<CustomEvent>) {
	const existing = customStore.read()[id];
	if (!existing) return;
	customStore.set(id, { ...existing, ...patch, id });
}

/**
 * Delete an event and everything said about it.
 *
 * Leaving the label and urgent overrides behind would orphan them against an
 * id that no longer exists, and they would silently reattach if the id were
 * ever reused. `removeAddedTask` in `userEdits` cleans up the same way.
 *
 * Note the `custom-` prefix: those two stores are keyed by CALENDAR item id,
 * and `customEventToItem` builds this event's item id as `custom-${event.id}`.
 */
export function deleteCustomEvent(id: string) {
	customStore.set(id, undefined);
	labelStore.set(`custom-${id}`, undefined);
	urgentStore.set(`custom-${id}`, undefined);
}

/* --- Mapping ------------------------------------------------------------ */

/** "9:30 AM" from wall-clock "HH:mm". Local by construction, no timezone. */
function clockLabel(hhmm: string): string {
	const [hour, minute] = hhmm.split(":").map(Number);
	if (Number.isNaN(hour) || Number.isNaN(minute)) return "All day";
	const suffix = hour < 12 ? "AM" : "PM";
	const display = hour % 12 === 0 ? 12 : hour % 12;
	return `${display}:${String(minute).padStart(2, "0")} ${suffix}`;
}

/**
 * A custom event as a calendar row.
 *
 * Returns null on a malformed day key rather than rendering an item onto some
 * arbitrary day, which is how a hand-edited store would otherwise put a
 * student's note on a date they never chose.
 */
export function customEventToItem(event: CustomEvent): DatedScheduleItem | null {
	const parts = event.dayKey.split("-").map(Number);
	if (parts.length !== 3 || parts.some(Number.isNaN)) return null;

	const [year, month, day] = parts;
	const date = new Date(year, month - 1, day);
	if (Number.isNaN(date.getTime())) return null;
	// A key like "2026-02-31" parses into March. Reject rather than silently move.
	if (dayKeyOf(date) !== event.dayKey) return null;

	const allDay = !event.time;
	const [hour, minute] = allDay ? [0, 0] : event.time!.split(":").map(Number);

	return {
		id: `custom-${event.id}`,
		category: "custom",
		title: event.title,
		dayKey: event.dayKey,
		timeLabel: allDay ? "All day" : clockLabel(event.time!),
		detail: "",
		sortMinutes: allDay ? 0 : hour * 60 + minute,
		allDay,
		startISO: new Date(year, month - 1, day, hour, minute).toISOString(),
		endISO: new Date(year, month - 1, day, hour, minute).toISOString(),
		label: event.label,
		urgent: event.urgent,
		custom: true,
	};
}
