import type { DayGroupMode, GroupMode, ScheduleCategory } from '$lib/schedule';

/**
 * What the student has done to the calendar's controls.
 *
 * A filter that resets on every navigation is a filter nobody uses twice. If a
 * student has decided they never want to see UCSD-wide events, that decision
 * should outlive a click on Home.
 *
 * ## Ported in Phase 2: the normaliser only
 *
 * In the Next app this module also owned the persisted store -- `useMemo` over
 * a `createOverrideStore` snapshot, plus `useCalendarPrefs`,
 * `readCalendarPrefs`, `setCalendarPrefs`, `toggleCategory`, `toggleLabel` and
 * `showAllCategories`.
 *
 * None of that is here yet. `createOverrideStore` is `useSyncExternalStore`
 * over localStorage, and its three-snapshot contract (client snapshot, server
 * snapshot, referential stability) has no one-to-one Svelte equivalent --
 * MIGRATION.md section 8 item 1 flags where the "empty until mounted" gate
 * lives as a real design decision rather than a translation. Inventing an
 * answer here would bake that decision in silently, so the store layer waits
 * for its own phase.
 *
 * What IS here is the part that was always pure and always the risky part:
 * `normalisePrefs`, whose input is whatever happens to be sitting in a
 * browser's localStorage.
 */

export type CalendarViewMode = 'month' | 'week' | 'agenda';

export interface CalendarPrefs {
	/** Categories switched off. Stored rather than derived so a new category
	 *  added later defaults to visible instead of silently hidden. */
	hidden: ScheduleCategory[];
	/** Labels switched off. Open-ended: whatever the student has typed. */
	hiddenLabels: string[];
	showDone: boolean;
	/** When true, only items flagged urgent survive anywhere on the page. */
	urgentOnly: boolean;
	/**
	 * Reveal events the student has ignored.
	 *
	 * Off by default, and it lives here rather than on the ignore store because
	 * it is a view preference, not a fact about the events. The calendar is the
	 * record of what exists, so this is the switch that makes ignored events
	 * recoverable; Home has no equivalent by design.
	 */
	showIgnored: boolean;
	view: CalendarViewMode;
	/** Agenda only. Kept even when the view is month, so switching back
	 *  restores what the student last chose. */
	groupBy: GroupMode;
	/**
	 * How the selected day's items are arranged: by type (classes, then due,
	 * then tasks...) or as one chronological list.
	 *
	 * Defaults to `type`. A day view's instinct is chronological, but the
	 * question a student actually opens it with is usually "what do I owe" --
	 * and grouping answers that first while `time` stays one click away.
	 */
	dayGroupBy: DayGroupMode;
}

export const DEFAULT_PREFS: CalendarPrefs = {
	hidden: [],
	hiddenLabels: [],
	/**
	 * TRUE on the calendar, unlike everywhere else.
	 *
	 * Found by driving the page: with done items hidden, ticking a task made it
	 * disappear under the cursor. That loses the strike-through, loses any way
	 * back, and makes the header's "0 of 2 done" count meaningless -- the
	 * denominator shrinks as you work. A calendar day is a record of the day,
	 * and a finished thing still happened.
	 */
	showDone: true,
	urgentOnly: false,
	showIgnored: false,
	view: 'month',
	groupBy: 'day',
	dayGroupBy: 'type'
};

/**
 * Merge over the defaults rather than trusting what is in storage.
 *
 * A half-written or hand-edited value must not take the page down, and a build
 * that adds a field must not read `undefined` out of a store written by the
 * previous build.
 *
 * Exported for tests: this is the only genuinely risky logic in the module,
 * because its input is whatever happens to be in a browser's localStorage.
 * It has caught four separate new-field omissions.
 */
export function normalisePrefs(stored: Partial<CalendarPrefs> | undefined): CalendarPrefs {
	if (!stored) return DEFAULT_PREFS;

	return {
		hidden: Array.isArray(stored.hidden) ? stored.hidden : [],
		hiddenLabels: Array.isArray(stored.hiddenLabels) ? stored.hiddenLabels : [],
		showDone: typeof stored.showDone === 'boolean' ? stored.showDone : true,
		urgentOnly: typeof stored.urgentOnly === 'boolean' ? stored.urgentOnly : false,
		showIgnored: typeof stored.showIgnored === 'boolean' ? stored.showIgnored : false,
		view:
			stored.view === 'week' || stored.view === 'agenda' || stored.view === 'month'
				? stored.view
				: 'month',
		groupBy:
			stored.groupBy === 'category' || stored.groupBy === 'course' || stored.groupBy === 'day'
				? stored.groupBy
				: 'day',
		dayGroupBy: stored.dayGroupBy === 'time' ? 'time' : 'type'
	};
}
