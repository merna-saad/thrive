import { dayKeyOf, type DatedScheduleItem } from '$lib/schedule';

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
 * Not by task id. The ids used are the ones the calendar builds -- `asg-12`,
 * `apt-3`, `task-7`, `todo-x` -- which means a student can flag an assignment
 * urgent or label a booked appointment, neither of which they own and neither
 * of which has anywhere on the server to put that. Keying by task id would
 * have limited both features to the one stream the student can already edit,
 * which is the stream that needed them least.
 *
 * ## Why custom events are not "events"
 *
 * `getEvents()` returns programme events with an origin (career, rady, club).
 * A thing the student typed has no origin, cannot be registered for, and must
 * not appear to be Rady-issued. It gets its own category so the key can filter
 * it separately and so nothing downstream mistakes it for institutional truth.
 *
 * ## Ported in Phase 2: the type and the mapper
 *
 * The three stores (`useItemLabels`, `setItemLabel`, `useItemUrgent`,
 * `setItemUrgent`, `useCustomEvents`, `readCustomEvents`, `addCustomEvent`,
 * `updateCustomEvent`, `deleteCustomEvent`) all sit on `createOverrideStore`
 * and wait for the store phase. `customEventToItem` is the pure mapper and is
 * where the decisions that matter actually live.
 */

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

/* --- Mapping ------------------------------------------------------------ */

/** "9:30 AM" from wall-clock "HH:mm". Local by construction, no timezone. */
function clockLabel(hhmm: string): string {
	const [hour, minute] = hhmm.split(':').map(Number);
	if (Number.isNaN(hour) || Number.isNaN(minute)) return 'All day';
	const suffix = hour < 12 ? 'AM' : 'PM';
	const display = hour % 12 === 0 ? 12 : hour % 12;
	return `${display}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/**
 * A custom event as a calendar row.
 *
 * Returns null on a malformed day key rather than rendering an item onto some
 * arbitrary day, which is how a hand-edited store would otherwise put a
 * student's note on a date they never chose.
 */
export function customEventToItem(event: CustomEvent): DatedScheduleItem | null {
	const parts = event.dayKey.split('-').map(Number);
	if (parts.length !== 3 || parts.some(Number.isNaN)) return null;

	const [year, month, day] = parts;
	const date = new Date(year, month - 1, day);
	if (Number.isNaN(date.getTime())) return null;
	// A key like "2026-02-31" parses into March. Reject rather than silently move.
	if (dayKeyOf(date) !== event.dayKey) return null;

	const allDay = !event.time;
	const [hour, minute] = allDay ? [0, 0] : event.time!.split(':').map(Number);

	return {
		id: `custom-${event.id}`,
		category: 'custom',
		title: event.title,
		dayKey: event.dayKey,
		timeLabel: allDay ? 'All day' : clockLabel(event.time!),
		detail: '',
		sortMinutes: allDay ? 0 : hour * 60 + minute,
		allDay,
		startISO: new Date(year, month - 1, day, hour, minute).toISOString(),
		endISO: new Date(year, month - 1, day, hour, minute).toISOString(),
		label: event.label,
		urgent: event.urgent,
		custom: true
	};
}
