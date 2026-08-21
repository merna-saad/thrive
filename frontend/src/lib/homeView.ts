import type { DueDescriptor } from '$lib/format';
import type { Course, Event, Task } from '$lib/data';

/**
 * Home's view models.
 *
 * CONVENTIONS.md: "Return view models, not raw rows." Every date field in here
 * is ALREADY A FORMATTED STRING, decided in `+page.server.ts` against the
 * server's single instant. A component receiving one of these has nothing left
 * to interpret and no reason to touch a clock.
 *
 * They live in a `.ts` rather than in the components that consume them because
 * the LOAD FUNCTION builds them, and a load function importing a type out of a
 * `.svelte` file is backwards -- the server does not depend on the view.
 */

/** One class meeting today. */
export interface ClassRow {
	/** Stable key: a course can meet twice in one day. */
	id: string;
	/** Pre-formatted wall clock, e.g. "9:30 AM". */
	time: string;
	title: string;
	location: string;
}

/** One course, with everything its card needs already computed. */
export interface CourseRow {
	course: Course;
	nextDue: DueDescriptor;
	/** Pre-formatted meeting pattern, e.g. "Mon/Wed 9:30 AM". */
	scheduleLabel: string;
}

/** One event, with its date block already split into the three strings it renders. */
export interface EventRowData {
	event: Event;
	dateBlock: { month: string; day: string; time: string };
}

/** A task plus the due descriptor the server computed for it. */
export interface TaskRowData {
	task: Task;
	due: DueDescriptor;
}
