import { getProgramTimeline, getStudent } from '$lib/data';
import type { LayoutServerLoad } from './$types';

/**
 * The student and the timeline, loaded once for the whole app.
 *
 * In the Next app `AppShell` was an `async` server component that awaited
 * `getStudent()` mid-tree. This is where that goes: a root server load, so the
 * shell receives the record as data rather than fetching it while rendering.
 *
 * Server-side, and it stays server-side. Every provider will be a Django call
 * behind an authenticated session, and `+layout.server.ts` is the only place in
 * a SvelteKit app that can hold a credential without shipping it.
 *
 * `getStudent` is the real provider as of Phase 5. It was a hardcoded stub
 * through Phase 4 and this load function did not change when it was replaced --
 * only the import path did. That is the provider boundary working as intended,
 * and it is the same non-event the switch to Django should be.
 *
 * ## THE TIMELINE MOVED HERE, and it is one call rather than two
 *
 * Added 2026-08-22, when `Student.currentTerm` was deleted. `TopBar` renders the
 * student's current term on every route, and the term is now derived --
 * `ProgramTimeline.currentTerm` -- so the shell needs the timeline.
 *
 * **Home reads it from `await parent()` rather than calling the provider
 * again**, and that is the point rather than a tidy-up. `getProgramTimeline`
 * reads the clock itself, so two calls in one request are two clock reads and
 * two timelines. At a phase boundary the bar could name one term while the strip
 * beneath it named another -- which is precisely the bug deleting `currentTerm`
 * was meant to end, rebuilt one layer up.
 *
 * The cost is that Home's load now waits for this one instead of running fully
 * in parallel with it. On a mock layer that is nothing, and it buys a single
 * answer to "where is the student" for the whole request.
 */
export const load: LayoutServerLoad = async () => {
	const [student, timeline] = await Promise.all([getStudent(), getProgramTimeline()]);

	return { student, timeline };
};
