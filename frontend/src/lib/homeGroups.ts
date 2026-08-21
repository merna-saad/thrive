import { messages } from '$lib/messages';
import { isTaskDone, type DoneOverrides } from '$lib/userEdits.svelte';
import type { DueDescriptor, KnownDueDescriptor } from '$lib/format';
import type { Task } from '$lib/data';

/**
 * Home's task list, grouped.
 *
 * Read-only: this is the 6a half of what the Next app's `useTaskBoard` did.
 * Reordering, moving between groups, editing a due date, and adding a task are
 * 6b, and they are what the rest of that hook was for. Grouping and counting
 * are separable from editing, so they are separate.
 *
 * Pure, and takes the done overrides as an argument rather than reading the
 * store. Everything here is testable without a browser, and the one thing that
 * genuinely needs the store -- "has the student ticked this" -- is passed in.
 */

/** A task plus the due descriptor the server computed for it. */
export interface HomeRow {
	task: Task;
	due: DueDescriptor;
}

/** A row whose date parsed, so it has a real urgency and a real `days`. */
interface KnownRow extends HomeRow {
	due: KnownDueDescriptor;
}

export type GroupKey = 'overdue' | 'today' | 'upcoming';

export const GROUP_ORDER: GroupKey[] = ['overdue', 'today', 'upcoming'];

export const groupHeading: Record<GroupKey, string> = {
	overdue: messages.taskGroups.overdue,
	today: messages.taskGroups.today,
	upcoming: messages.taskGroups.upcoming
};

/** Home is a "what's next" surface, so "This week" means it. */
const WEEK = 7;

/**
 * Narrows a row to one whose date parsed.
 *
 * A real type predicate rather than a bare `filter`, because `days` is
 * `number | null` since the Phase 3a-fix guards landed and the sort below
 * subtracts it. Without narrowing, `a.due.days - b.due.days` does not compile --
 * which is the discriminated union doing exactly the job it was built for.
 */
function isKnown(row: HomeRow): row is KnownRow {
	return row.due.urgency !== 'unknown';
}

export interface HomeGroup {
	key: GroupKey;
	heading: string;
	rows: HomeRow[];
}

export interface HomeTaskGroups {
	groups: HomeGroup[];
	done: HomeRow[];
	/**
	 * Rows whose due date would not parse, and which therefore belong to no
	 * group.
	 *
	 * The Next version dropped these silently: it filtered by
	 * `due.urgency === group.key`, and `"unknown"` matches none of the three
	 * keys, so a task with a broken deadline vanished from Home with no error.
	 * The fixtures contain no such date, which is why nobody noticed.
	 *
	 * Returned explicitly here so the information is not lost and a future
	 * decision has somewhere to land. Nothing renders it yet -- where an unknown
	 * row belongs in a grouped list is an open question in CONTEXT, and inventing
	 * an answer in the logic layer would settle it by accident.
	 */
	unclassified: HomeRow[];
	total: number;
	doneCount: number;
	percent: number;
}

/**
 * Group Home's tasks by urgency, with done pulled out.
 *
 * `total` and `percent` count every task including done ones -- the progress bar
 * reads "6 of 14 done", so the denominator has to be everything.
 */
export function buildHomeGroups(
	rows: readonly HomeRow[],
	doneOverrides: DoneOverrides
): HomeTaskGroups {
	const done: HomeRow[] = [];
	const open: HomeRow[] = [];

	for (const row of rows) {
		if (isTaskDone(row.task, doneOverrides)) done.push(row);
		else open.push(row);
	}

	const openKnown = open.filter(isKnown);
	const unclassified = open.filter((row) => !isKnown(row));

	const groups: HomeGroup[] = GROUP_ORDER.map((key) => ({
		key,
		heading: groupHeading[key],
		rows: openKnown
			.filter(
				(row) =>
					row.due.urgency === key &&
					// "This week" means it. An assignment three weeks out is real, but
					// it is not what Home is for, and letting it in is what made the
					// card fourteen rows long in the first place.
					(key !== 'upcoming' || row.due.days <= WEEK)
			)
			.sort((a, b) => a.due.days - b.due.days)
	}));

	const total = rows.length;

	return {
		groups,
		done,
		unclassified,
		total,
		doneCount: done.length,
		percent: total === 0 ? 0 : (done.length / total) * 100
	};
}

/** Groups with at least one row. The empty ones render nothing, not a heading. */
export function nonEmptyGroups(groups: HomeGroup[]): HomeGroup[] {
	return groups.filter((group) => group.rows.length > 0);
}
