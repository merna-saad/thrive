/**
 * The floating quick list: a personal scratch list, deliberately separate from
 * Home's Tasks card.
 *
 * Tasks on Home come from somewhere -- a course, a deadline, an advisor -- and
 * carry a due date, a priority, and a source. These do not. They are the things
 * a student writes on the back of their hand, and mixing them into the list
 * that says "pulled from every source" would make that claim untrue.
 *
 * Items can be *copied* between the two lists, never linked. See `copiedFrom`.
 *
 * ## Ported in Phase 2: the type only
 *
 * The store and its actions (`useQuickItems`, `readQuickItems`,
 * `addQuickItem`, `toggleQuickItem`, `setQuickItemDue`, `setQuickItemNote`,
 * `deleteQuickItem`, `clearDoneQuickItems`) and the panel store all sit on
 * `createOverrideStore` / `createPanelStore` and wait for the store phase. The
 * type is here because `schedule.ts` and `calendarSources.ts` both need it,
 * type-only, to describe an attached source row.
 */

export interface QuickItem {
	id: string;
	title: string;
	done: boolean;
	/** Sort key. The map the store keeps has no order of its own. */
	createdAt: number;
	/**
	 * Set when this item was copied in from the Tasks card.
	 *
	 * A note about provenance, not a link: nothing reads it to keep the two in
	 * step, because they are deliberately not in step. Ticking or deleting here
	 * has no effect there, and the field exists so a future reader of the store
	 * can tell where a row came from.
	 */
	copiedFrom?: string;
	/**
	 * Optional. Most things on a scratch list never get one, so the chip and the
	 * picker stay out of the row until there is a date to show.
	 */
	dueDate?: string;
	/** Personal note, revealed by expanding the row. */
	note?: string;
}
