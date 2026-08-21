/**
 * Public entry point for the data layer.
 *
 * Import from `$lib/data` and nothing deeper. In the Next app that convention
 * kept the mock modules an implementation detail that could be deleted without
 * touching the UI; here it is what will keep the Django client swappable.
 *
 * It was violated exactly once in the Next tree -- `degree/requests/page.tsx`
 * reached into `lib/data/mock/requests` for two presentation label maps. See
 * MIGRATION.md section 9 defect 11. When those maps get ported they belong on
 * this side of the boundary.
 *
 * Types only for now. `providers.ts` is a later phase; the 25 functions it has
 * to expose are inventoried in MIGRATION.md section 2.
 */

export * from './types';
