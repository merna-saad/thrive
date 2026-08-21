import type { QuickItem } from '$lib/quickList';
import {
	dayKeyOf,
	minutesOf,
	wallClockLabel,
	type DatedScheduleItem,
	type ScheduleData
} from '$lib/schedule';
import type { Task } from '$lib/data';

/**
 * The client half of the calendar's data.
 *
 * ## Why this exists at all
 *
 * `buildSchedule.ts` reads the providers on the server and hands down a fully
 * formatted `ScheduleData`. That works because classes, assignments,
 * appointments and events are all server truth.
 *
 * Tasks and to-dos are not:
 *
 *   - A task's due date can be MOVED by the student, and stored only in
 *     localStorage. The server's `dueDate` is then wrong for this person.
 *   - A student can ADD a task that exists nowhere on the server.
 *   - A quick-list to-do has no server row at all. It is localStorage only.
 *
 * So the calendar cannot be fed from one pipeline. This module is the second
 * half: it reads the same stores the Tasks card reads and folds them onto the
 * server's `ScheduleData`.
 *
 * ## Why not just put them on the server
 *
 * The mock stores were module-level and shared by every visitor to the dev
 * server. Writing one student's to-dos there would put them on another
 * student's calendar. Local is the correct answer until the Django backend
 * settles it.
 *
 * ## Ported in Phase 2: the two mappers
 *
 * `useMergedSchedule` is a hook over nine localStorage stores and waits for the
 * store phase -- see the note at the top of `calendarPrefs.ts`. The mappers
 * below are where the actual decisions live (which day a thing lands on,
 * whether it is all-day, whether a bad date takes the page down) and they are
 * pure, so they are what the tests pin.
 *
 * When the merge does land, the ordering it encodes matters and is documented
 * here so it is not lost: student-created tasks are keyed by id alongside the
 * server's so one cannot be listed twice; edits apply before the due-date
 * override so a renamed AND rescheduled task lands correctly on both counts;
 * and labels and urgent are applied LAST, over everything, because they are
 * keyed by calendar item id rather than by source id. Urgent is suppressed on
 * a done item -- a finished thing is not urgent, and a coral pill on a
 * struck-through row is the contradiction the reserved palette exists to stop.
 */

/**
 * Turn a `Task` into a dated calendar row.
 *
 * Tasks are deadlines, not meetings, so they sort by their due instant exactly
 * the way assignments already do. They are never all-day: a task due "today"
 * still has a time, and treating it as all-day would float it above a class it
 * is actually due after.
 */
export function taskToItem(task: Task, done: boolean): DatedScheduleItem | null {
	const date = new Date(task.dueDate);
	if (Number.isNaN(date.getTime())) return null;

	return {
		id: `task-${task.id}`,
		category: 'task',
		title: task.title,
		dayKey: dayKeyOf(date),
		timeLabel: date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit'
		}),
		detail: task.courseCode ?? '',
		sortMinutes: date.getHours() * 60 + date.getMinutes(),
		allDay: false,
		startISO: task.dueDate,
		endISO: task.dueDate,
		done,
		priority: task.priority,
		courseCode: task.courseCode,
		// The resolved row travels with the item, so ticking never has to find it
		// again. This is the whole fix for self-added tasks: they are not in the
		// server's array, but they are right here.
		task
	};
}

/**
 * Quick-list items are all-day by design.
 *
 * A scratch to-do carries a date at most, never a time -- the picker does not
 * offer one. Marking them all-day puts them at the top of a day rather than
 * inventing a midnight slot that would sort them before every class.
 */
export function todoToItem(quick: QuickItem): DatedScheduleItem | null {
	if (!quick.dueDate) return null;

	const date = new Date(quick.dueDate);
	if (Number.isNaN(date.getTime())) return null;

	return {
		id: `todo-${quick.id}`,
		category: 'todo',
		title: quick.title,
		dayKey: dayKeyOf(date),
		timeLabel: 'All day',
		detail: '',
		sortMinutes: 0,
		allDay: true,
		startISO: quick.dueDate,
		endISO: quick.dueDate,
		done: quick.done,
		quickItem: quick
	};
}

export interface MergedSchedule {
	data: ScheduleData;
	/**
	 * To-dos the student never dated. Surfaced by the agenda, not the grid.
	 *
	 * The whole `QuickItem` rather than a flattened triple, so the agenda can
	 * attach it to the synthetic row it builds and ticking works there too. The
	 * flattened version was the reason undated to-dos silently would not tick.
	 */
	undatedTodos: QuickItem[];
}

/**
 * Minutes past midnight, right now.
 *
 * ONE OF ONLY TWO CLIENT-SIDE CLOCK READS IN THE APP, and it is deliberate.
 * Only ever called from a click handler or inside a memo on the client, never
 * during a server render, so it cannot desynchronise hydration. Exported so
 * `nextUpItem` stays pure and testable while callers stay honest about time.
 *
 * See CONVENTIONS.md. This is an exception to the rule, not a licence.
 */
export function nowMinutes(): number {
	const now = new Date();
	return now.getHours() * 60 + now.getMinutes();
}

/** Re-exported so callers building a week strip do not import two modules. */
export { minutesOf, wallClockLabel };
