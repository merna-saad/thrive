import { getStudent } from '$lib/data/stubProviders';
import type { LayoutServerLoad } from './$types';

/**
 * The student, loaded once for the whole app.
 *
 * In the Next app `AppShell` was an `async` server component that awaited
 * `getStudent()` mid-tree. This is where that goes: a root server load, so the
 * shell receives the record as data rather than fetching it while rendering.
 *
 * Server-side, and it stays server-side. Every provider will be a Django call
 * behind an authenticated session, and `+layout.server.ts` is the only place in
 * a SvelteKit app that can hold a credential without shipping it.
 *
 * `getStudent` comes from the Phase 5 stub for now. The import path changes when
 * the real providers land; the shape does not.
 */
export const load: LayoutServerLoad = async () => {
	return { student: await getStudent() };
};
