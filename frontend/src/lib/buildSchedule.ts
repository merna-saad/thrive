import { dayKeyOf } from '$lib/schedule';

/**
 * Assemble the calendar's data from the providers.
 *
 * ## Ported in Phase 2: todayKey only
 *
 * `buildScheduleData()` reads five providers (`getCourses`, `getAssignments`,
 * `getEvents`, `getMyAppointments`, `getAdvisors`) and flattens them into one
 * `ScheduleData`. Every one of those providers is a later phase, so the
 * function has nothing to read yet and is not here.
 *
 * When it lands it belongs in a SvelteKit server `load` function, not in a
 * component: the formatting it does on the way through is the mechanism behind
 * "components never see a raw timestamp". See CONVENTIONS.md.
 */

/**
 * Today's day key, decided once on the server.
 *
 * Read the clock HERE, in a `load` function, and pass the result down as a
 * string. A component that computes its own "today" disagrees with the server
 * in another timezone and freezes at whatever moment it last rendered.
 */
export function todayKey(): string {
	return dayKeyOf(new Date());
}
