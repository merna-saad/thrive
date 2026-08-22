import type { DueDescriptor } from '$lib/format';
import type { Course, CourseRequirement, Event, SourceSystem, Task } from '$lib/data';

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
	/**
	 * Where the course came from. Carried through from `Course.origin` rather than
	 * looked up in the component, which is this repo's rule for view models: the
	 * row arrives with everything it needs. Absent means unknown, and unknown
	 * renders no pill.
	 */
	origin?: SourceSystem;
	/** Pre-formatted wall clock, e.g. "9:30 AM". */
	time: string;
	title: string;
	location: string;
}

/**
 * One row in a term's plan, whether it is an enrolment or a suggestion.
 *
 * ONE shape for both, deliberately. The two lists differ in what they MEAN, not
 * in what they hold, and the difference is carried by `TermPlan.kind` plus the
 * copy around the list. Two row types would mean two components rendering the
 * same four fields, drifting apart at the first edit.
 */
export interface TermCourseRow {
	code: string;
	title: string;
	/** Absent when the catalogue lists none — the capstone has no instructor. */
	instructor?: string;
	requirement: CourseRequirement;
	/**
	 * Why this was suggested. Suggested terms only, and absent on core courses
	 * there too, because "it is required" is what `requirement` already says.
	 */
	reason?: string;
	/**
	 * Pre-formatted meeting pattern, e.g. "Mon/Wed 9:30 AM". Enrolled terms only:
	 * a course in a future term has no meeting times, and inventing a blank line
	 * for one would put an empty field on every suggested row.
	 */
	scheduleLabel?: string;
}

/**
 * What one term holds, keyed by phase id in `TermPlan`s below.
 *
 * `kind` is the load-bearing field. An ENROLLED term is a statement of fact; a
 * SUGGESTED term is a recommendation. They are told apart on the DATA rather
 * than on the phase's status, which matters as time passes: a term the student
 * has enrolments in is enrolled whether the timeline calls it current or
 * complete, and everything else is a suggestion.
 */
export interface TermPlan {
	term: string;
	kind: 'enrolled' | 'suggested';
	courses: TermCourseRow[];
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
	/**
	 * Inside the seven-day window the "events this week" pill counts.
	 *
	 * A flag on the row rather than a second list of ids. It replaced
	 * `weekEventIds`, which the pill received alongside the rows and which meant
	 * two shapes of the same information travelling down: the pill had ids with no
	 * titles to render, and the card had titles with no idea which were in the
	 * window. One flag answers both, and it cannot drift from the row it is on.
	 *
	 * Decided on the server, because "is this within seven days of now" is a date
	 * question and CONVENTIONS.md puts every one of those in a `load` function.
	 */
	thisWeek: boolean;
}

/** A task plus the due descriptor the server computed for it. */
export interface TaskRowData {
	task: Task;
	due: DueDescriptor;
}
