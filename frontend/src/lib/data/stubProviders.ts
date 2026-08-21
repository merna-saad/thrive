import type { Student } from '$lib/data/types';

/**
 * TEMPORARY. Replaced in Phase 5 by the real provider layer.
 *
 * The shell needs a student to render an identity and a term, and the 25
 * providers inventoried in MIGRATION.md section 2 do not exist yet. Rather than
 * thread a fake through the components, the one provider the shell actually
 * calls is stubbed here with a single hardcoded record.
 *
 * ## What Phase 5 changes, and what it must not
 *
 * DELETE this file. `getStudent` moves to `providers.ts` with the same
 * signature -- `(): Promise<Student>` -- so the root `load` that calls it does
 * not change. That is the whole point of the provider boundary: the seam is the
 * function signature, not the data behind it.
 *
 * The fixture matches the Next app's `mock/student.ts` field for field so the
 * shell renders identically. Note `programStart` is a START date: the finish
 * term and the progress percentage are both DERIVED from it plus `track`, and
 * neither is stored anywhere.
 */

const stubStudent: Student = {
	id: 'stu-001',
	name: 'Merna',
	goal: 'Data Scientist',
	track: '17 month',
	program: 'MSBA',
	standing: 'onTrack',
	standingSummary:
		'On pace overall. Data Visualization has slipped and is worth your attention this week.',
	currentTerm: 'Fall 2026',
	programStart: '2026-08-03',
	consent: {
		calendarRead: true,
		lmsRead: true,
		careerRecommendations: true,
		advisorSharing: false
	}
};

/**
 * The student record.
 *
 * Async on purpose, even though it resolves immediately: every provider returns
 * a Promise today and will keep returning one when the body becomes a Django
 * call, so callers already `await` and swapping the implementation touches no
 * caller. The Next version also slept 120ms here to make loading states real;
 * that is left out until there is a loading state to exercise.
 */
export function getStudent(): Promise<Student> {
	return Promise.resolve(stubStudent);
}
