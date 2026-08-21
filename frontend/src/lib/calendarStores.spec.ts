import { afterEach, describe, expect, it, vi } from "vitest";

import { installStorage, uninstallStorage, type FakeStorage } from "$lib/testing/fakeStorage";
import type { ScheduleItem } from "$lib/schedule";
import type { Task } from "$lib/data";

/**
 * The remaining persisted stores: calendar prefs, the quick list, the two
 * annotation stores plus custom events, and ignored events.
 *
 * Grouped in one file because each is thin on its own, and because the thing
 * most worth pinning cuts across them: THREE SEPARATE KEY SPACES that must not
 * merge. Task id in `userEdits`, calendar item id in `calendarItems`, and raw
 * `Event.id` in `ignoredEvents`. The last block below is about exactly that.
 */

let storage: FakeStorage;

async function fresh<T>(mod: () => Promise<T>, seed: Record<string, string> = {}): Promise<T> {
	vi.resetModules();
	storage = installStorage(seed);
	return await mod();
}

const prefsModule = () => import("$lib/calendarPrefs");
const quickModule = () => import("$lib/quickList");
const itemsModule = () => import("$lib/calendarItems");
const ignoredModule = () => import("$lib/ignoredEvents");

afterEach(() => {
	uninstallStorage();
});

// ---------------------------------------------------------------------------
// calendarPrefs -- the store half
// ---------------------------------------------------------------------------

describe("calendarPrefs store", () => {
	it("returns the defaults before hydration, not an empty object", async () => {
		// The un-personalised answer is a real, usable set of prefs: everything
		// visible, month view, done items shown. An empty calendar would be worse
		// than a default one.
		const prefs = await fresh(prefsModule, {
			"thrive:calendar-prefs": '{"value":{"view":"agenda"}}',
		});

		expect(prefs.calendarPrefs()).toEqual(prefs.DEFAULT_PREFS);
	});

	it("reads the student's prefs once hydrated", async () => {
		const prefs = await fresh(prefsModule, {
			"thrive:calendar-prefs": '{"value":{"view":"agenda","showDone":false}}',
		});
		const { hydrateStores } = await import("$lib/overrideStore.svelte");

		hydrateStores();

		expect(prefs.calendarPrefs().view).toBe("agenda");
		expect(prefs.calendarPrefs().showDone).toBe(false);
		// Fields the stored value never wrote still come back normalised.
		expect(prefs.calendarPrefs().groupBy).toBe("day");
	});

	it("normalises whatever is stored, so a corrupt value cannot empty the calendar", async () => {
		const prefs = await fresh(prefsModule, {
			"thrive:calendar-prefs": '{"value":{"hidden":"club","view":"timeline"}}',
		});
		const { hydrateStores } = await import("$lib/overrideStore.svelte");

		hydrateStores();

		expect(prefs.calendarPrefs().hidden).toEqual([]);
		expect(prefs.calendarPrefs().view).toBe("month");
	});

	it("merges a partial write over the current value", async () => {
		const prefs = await fresh(prefsModule);

		prefs.setCalendarPrefs({ view: "week" });
		prefs.setCalendarPrefs({ urgentOnly: true });

		expect(prefs.calendarPrefs().view).toBe("week");
		expect(prefs.calendarPrefs().urgentOnly).toBe(true);
	});

	it("toggleCategory adds then removes", async () => {
		const prefs = await fresh(prefsModule);

		prefs.toggleCategory("club");
		expect(prefs.calendarPrefs().hidden).toEqual(["club"]);

		prefs.toggleCategory("club");
		expect(prefs.calendarPrefs().hidden).toEqual([]);
	});

	it("toggleLabel works on its own dimension, leaving categories alone", async () => {
		const prefs = await fresh(prefsModule);

		prefs.toggleCategory("club");
		prefs.toggleLabel("thesis");

		expect(prefs.calendarPrefs().hidden).toEqual(["club"]);
		expect(prefs.calendarPrefs().hiddenLabels).toEqual(["thesis"]);
	});

	it("showAllCategories clears both dimensions", async () => {
		const prefs = await fresh(prefsModule);

		prefs.toggleCategory("club");
		prefs.toggleLabel("thesis");
		prefs.showAllCategories();

		expect(prefs.calendarPrefs().hidden).toEqual([]);
		expect(prefs.calendarPrefs().hiddenLabels).toEqual([]);
	});

	it("persists under one key, as one object", async () => {
		const prefs = await fresh(prefsModule);

		prefs.setCalendarPrefs({ view: "week" });

		const written = JSON.parse(storage.dump()["thrive:calendar-prefs"]);
		expect(written.value.view).toBe("week");
	});
});

// ---------------------------------------------------------------------------
// quickList
// ---------------------------------------------------------------------------

describe("quickList store", () => {
	it("is empty until hydrated", async () => {
		const quick = await fresh(quickModule, {
			"thrive:quicklist": '{"q1":{"id":"q1","title":"Email Amber","done":false,"createdAt":1}}',
		});

		expect(quick.quickItems()).toEqual([]);
	});

	it("adds an item and returns its id", async () => {
		const quick = await fresh(quickModule);

		const id = quick.addQuickItem("Email Amber");

		expect(id).not.toBeNull();
		expect(quick.quickItems()).toHaveLength(1);
		expect(quick.quickItems()[0].title).toBe("Email Amber");
		expect(quick.quickItems()[0].done).toBe(false);
	});

	it("refuses an empty title", async () => {
		const quick = await fresh(quickModule);

		expect(quick.addQuickItem("   ")).toBeNull();
		expect(quick.quickItems()).toEqual([]);
	});

	it("gives two items added in the same millisecond distinct ids", async () => {
		// The counter suffix. Not hypothetical when the second one comes from a
		// "copy" button.
		const quick = await fresh(quickModule);

		const first = quick.addQuickItem("one");
		const second = quick.addQuickItem("two");

		expect(first).not.toBe(second);
		expect(quick.quickItems()).toHaveLength(2);
	});

	it("sorts oldest first", async () => {
		const quick = await fresh(quickModule, {
			"thrive:quicklist": JSON.stringify({
				late: { id: "late", title: "later", done: false, createdAt: 200 },
				early: { id: "early", title: "earlier", done: false, createdAt: 100 },
			}),
		});
		const { hydrateStores } = await import("$lib/overrideStore.svelte");
		hydrateStores();

		expect(quick.quickItems().map((i) => i.id)).toEqual(["early", "late"]);
	});

	it("toggles, dates, notes and deletes", async () => {
		const quick = await fresh(quickModule);
		quick.addQuickItem("Email Amber");

		let item = quick.quickItems()[0];
		quick.toggleQuickItem(item);
		expect(quick.quickItems()[0].done).toBe(true);

		item = quick.quickItems()[0];
		const iso = new Date(2026, 7, 18, 9, 0).toISOString();
		quick.setQuickItemDue(item, iso);
		expect(quick.quickItems()[0].dueDate).toBe(iso);

		item = quick.quickItems()[0];
		quick.setQuickItemNote(item, "  ask about units  ");
		expect(quick.quickItems()[0].note).toBe("ask about units");

		// An emptied note is a deleted note.
		item = quick.quickItems()[0];
		quick.setQuickItemNote(item, "  ");
		expect(quick.quickItems()[0].note).toBeUndefined();

		quick.deleteQuickItem(quick.quickItems()[0].id);
		expect(quick.quickItems()).toEqual([]);
	});

	it("clears only the done items", async () => {
		const quick = await fresh(quickModule);
		quick.addQuickItem("keep");
		quick.addQuickItem("drop");

		quick.toggleQuickItem(quick.quickItems()[1]);
		quick.clearDoneQuickItems();

		expect(quick.quickItems().map((i) => i.title)).toEqual(["keep"]);
	});

	it("records provenance on a copied row without linking it", async () => {
		const quick = await fresh(quickModule);

		quick.addQuickItem("Submit peer review", { copiedFrom: "t1" });

		expect(quick.quickItems()[0].copiedFrom).toBe("t1");
	});

	it("keeps its panel geometry in a separate key from its items", async () => {
		const quick = await fresh(quickModule);

		quick.addQuickItem("an item");
		quick.setQuickListPanel({ ...quick.readQuickListPanel(), open: true });

		expect(storage.dump()["thrive:quicklist"]).toBeDefined();
		expect(storage.dump()["thrive:quicklist-panel"]).toBeDefined();
		expect(quick.quickListPanel().open).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// calendarItems -- labels, urgent, custom events
// ---------------------------------------------------------------------------

describe("calendarItems stores", () => {
	it("labels an item and forgets an emptied label", async () => {
		const items = await fresh(itemsModule);

		items.setItemLabel("asg-12", "  thesis  ");
		expect(items.itemLabels()).toEqual({ "asg-12": "thesis" });

		items.setItemLabel("asg-12", "   ");
		expect(items.itemLabels()).toEqual({});
	});

	it("stores the absence rather than false for urgent", async () => {
		const items = await fresh(itemsModule);

		items.setItemUrgent("asg-12", true);
		expect(items.itemUrgent()).toEqual({ "asg-12": true });

		items.setItemUrgent("asg-12", false);
		expect(items.itemUrgent()).toEqual({});
	});

	it("can annotate a row the student does not own", async () => {
		// The reason these are keyed by calendar item id: an assignment and a
		// booked appointment have nowhere on the server to record either flag.
		const items = await fresh(itemsModule);

		items.setItemUrgent("asg-12", true);
		items.setItemLabel("apt-3", "advising");

		expect(items.itemUrgent()["asg-12"]).toBe(true);
		expect(items.itemLabels()["apt-3"]).toBe("advising");
	});

	it("adds a custom event with a derived id", async () => {
		const items = await fresh(itemsModule);

		const id = items.addCustomEvent({ title: "Coffee", dayKey: "2026-08-19" });

		expect(id).toMatch(/^custom-\d+$/);
		expect(items.customEvents()).toHaveLength(1);
		expect(items.customEvents()[0].title).toBe("Coffee");
	});

	it("updates a custom event and ignores an unknown id", async () => {
		const items = await fresh(itemsModule);
		const id = items.addCustomEvent({ title: "Coffee", dayKey: "2026-08-19" });

		items.updateCustomEvent(id, { title: "Coffee with Shankar" });
		expect(items.customEvents()[0].title).toBe("Coffee with Shankar");

		expect(() => items.updateCustomEvent("nope", { title: "x" })).not.toThrow();
		expect(items.customEvents()).toHaveLength(1);
	});

	it("deleting a custom event takes its label and urgent flag with it", async () => {
		/*
		 * Otherwise both overrides orphan against an id that no longer exists, and
		 * would silently reattach if the id were ever reused. Note the key: the
		 * annotation stores use the CALENDAR item id, which for a custom event is
		 * `custom-${event.id}`.
		 */
		const items = await fresh(itemsModule);
		const id = items.addCustomEvent({ title: "Coffee", dayKey: "2026-08-19" });

		items.setItemLabel(`custom-${id}`, "personal");
		items.setItemUrgent(`custom-${id}`, true);

		items.deleteCustomEvent(id);

		expect(items.customEvents()).toEqual([]);
		expect(items.itemLabels()).toEqual({});
		expect(items.itemUrgent()).toEqual({});
	});
});

// ---------------------------------------------------------------------------
// ignoredEvents -- the third key space
// ---------------------------------------------------------------------------

describe("ignoredEvents store", () => {
	it("keys on the raw Event.id, not the calendar item id", async () => {
		const ignored = await fresh(ignoredModule);

		ignored.setEventIgnored("evt-evt-3-1", true);

		// Stored normalised, so Home and the calendar agree.
		expect(ignored.ignoredEvents()).toEqual({ "evt-3-1": true });
	});

	it("DEFECT: the two surfaces do NOT share a key space", async () => {
		/*
		 * PORTED BEHAVIOUR, NOT DESIRED BEHAVIOUR. Recorded so the defect cannot
		 * be lost, and deliberately not fixed here -- picking the canonical key
		 * space is a decision with consequences for already-stored data.
		 *
		 * The module's own headline says "ONE store, read by both surfaces. Ignore
		 * something on Home and it is gone from the calendar." That is not what
		 * the code does.
		 *
		 * `eventIdOf` strips exactly one leading `evt-`. But the raw `Event.id` in
		 * the fixtures is ITSELF `evt-3-1`, and the calendar prefixes it again to
		 * `evt-evt-3-1`. So the function cannot tell the two apart, and each
		 * surface ends up in its own space:
		 *
		 *   calendar  evt-evt-3-1  -> eventIdOf -> "evt-3-1"
		 *   Home      evt-3-1      -> eventIdOf -> "3-1"
		 *
		 * Self-consistent within a surface, invisible across them. Ignoring an
		 * event on Home leaves it showing on the calendar and vice versa.
		 *
		 * No existing test caught this because each exercises one side only, and
		 * the two Phase 2 cases encode CONTRADICTORY conventions: one asserts the
		 * map is keyed "3-1", the other feeds `filterSchedule` ids keyed
		 * "evt-3-1". Both pass. Together they cannot both be right.
		 */
		const ignored = await fresh(ignoredModule);

		// The calendar ignores it, storing the once-stripped calendar id.
		ignored.setEventIgnored("evt-evt-3-1", true);
		expect(Object.keys(ignored.ignoredEvents())).toEqual(["evt-3-1"]);

		// Home, holding the raw Event.id, strips again and misses it.
		expect(ignored.isEventIgnored("evt-3-1", ignored.ignoredEvents())).toBe(false);

		// And the reverse: Home's write lands in a key the calendar never looks up.
		ignored.clearIgnoredEvents();
		ignored.setEventIgnored("evt-3-1", true);
		expect(Object.keys(ignored.ignoredEvents())).toEqual(["3-1"]);
		// `isVisible` strips the calendar item id to "evt-3-1", which is not "3-1".
		expect("evt-evt-3-1".replace(/^evt-/, "")).toBe("evt-3-1");
	});

	it("is self-consistent within one surface, which is why it went unnoticed", async () => {
		const ignored = await fresh(ignoredModule);

		// Calendar to calendar: fine.
		ignored.setEventIgnored("evt-evt-3-1", true);
		expect(ignored.isEventIgnored("evt-evt-3-1", ignored.ignoredEvents())).toBe(true);

		// Home to Home: also fine.
		ignored.clearIgnoredEvents();
		ignored.setEventIgnored("evt-3-1", true);
		expect(ignored.isEventIgnored("evt-3-1", ignored.ignoredEvents())).toBe(true);
	});

	it("un-ignoring deletes rather than storing false", async () => {
		// Which is why undo restores a row to its original position: ordering was
		// never touched, only the presence of a key.
		const ignored = await fresh(ignoredModule);

		ignored.setEventIgnored("evt-3-1", true);
		ignored.setEventIgnored("evt-3-1", false);

		expect(ignored.ignoredEvents()).toEqual({});
	});

	it("counts and clears", async () => {
		const ignored = await fresh(ignoredModule);

		ignored.setEventIgnored("evt-1", true);
		ignored.setEventIgnored("evt-2", true);
		expect(ignored.ignoredCount(ignored.ignoredEvents())).toBe(2);

		ignored.clearIgnoredEvents();
		expect(ignored.ignoredEvents()).toEqual({});
		expect(ignored.ignoredCount(ignored.ignoredEvents())).toBe(0);
	});

	it("is empty until hydrated", async () => {
		const ignored = await fresh(ignoredModule, {
			"thrive:ignored-events": '{"3-1":true}',
		});

		expect(ignored.ignoredEvents()).toEqual({});
	});
});

describe("the three key spaces stay separate", () => {
	it("the same id in all three stores means three different things", async () => {
		/*
		 * `evt-3-1` as a task id, as a calendar item id, and as an event id are
		 * three unrelated facts. Merging any two of these stores is the exact
		 * shape of the bug the ignore store was refactored to avoid: two stores
		 * wearing one localStorage key.
		 */
		vi.resetModules();
		storage = installStorage();

		const edits = await import("$lib/userEdits.svelte");
		const items = await import("$lib/calendarItems");
		const ignored = await import("$lib/ignoredEvents");

		const task: Task = {
			id: "evt-3-1",
			title: "a task that happens to share the id",
			dueDate: new Date(2026, 7, 17, 9, 0).toISOString(),
			source: "admin",
			priority: "low",
			done: false,
			subtasks: [],
		};

		edits.setTaskDone(task, true);
		items.setItemLabel("evt-3-1", "a label on a calendar row");
		ignored.setEventIgnored("evt-3-1", true);

		expect(edits.taskDoneOverrides()).toEqual({ "evt-3-1": true });
		expect(items.itemLabels()).toEqual({ "evt-3-1": "a label on a calendar row" });
		// Normalised on the way in, which is what makes this a different space.
		expect(ignored.ignoredEvents()).toEqual({ "3-1": true });

		// Four distinct localStorage keys, no overlap.
		expect(Object.keys(storage.dump()).sort()).toEqual([
			"thrive:ignored-events",
			"thrive:item-labels",
			"thrive:task-done",
		]);
	});
});

// ---------------------------------------------------------------------------
// tickItem -- writing back through the attached source row
// ---------------------------------------------------------------------------

describe("tickItem writes to the store the row came from", () => {
	function scheduleItem(over: Partial<ScheduleItem> = {}): ScheduleItem {
		return {
			id: "x",
			category: "task",
			title: "Item",
			timeLabel: "9:30 AM",
			detail: "",
			sortMinutes: 570,
			allDay: false,
			...over,
		};
	}

	it("ticks a task through userEdits", async () => {
		vi.resetModules();
		storage = installStorage();
		const { tickItem } = await import("$lib/tickItem");
		const edits = await import("$lib/userEdits.svelte");

		const task: Task = {
			id: "t1",
			title: "Submit peer review",
			dueDate: new Date(2026, 7, 17, 14, 30).toISOString(),
			source: "class",
			priority: "high",
			done: false,
			subtasks: [],
		};

		tickItem(scheduleItem({ task }), true);

		expect(edits.taskDoneOverrides()).toEqual({ t1: true });
	});

	it("ticks a self-added task the server has never seen", async () => {
		// The bug that started all of this: an id-based lookup could never resolve
		// a task that is not in the server's array. The attached row makes
		// provenance irrelevant.
		vi.resetModules();
		storage = installStorage();
		const { tickItem } = await import("$lib/tickItem");
		const edits = await import("$lib/userEdits.svelte");

		const own: Task = {
			id: "own-1755300000000",
			title: "Mine",
			dueDate: new Date(2026, 7, 17, 9, 0).toISOString(),
			source: "admin",
			priority: "medium",
			done: false,
			subtasks: [],
		};
		edits.addTask(own);

		tickItem(scheduleItem({ task: own }), true);

		expect(edits.taskDoneOverrides()).toEqual({ "own-1755300000000": true });
	});

	it("ticks a to-do through quickList", async () => {
		vi.resetModules();
		storage = installStorage();
		const { tickItem } = await import("$lib/tickItem");
		const quick = await import("$lib/quickList");

		quick.addQuickItem("Email Amber");
		const quickItem = quick.quickItems()[0];

		tickItem(scheduleItem({ category: "todo", quickItem }), true);

		expect(quick.quickItems()[0].done).toBe(true);
	});

	it("does nothing when the state already matches", async () => {
		vi.resetModules();
		storage = installStorage();
		const { tickItem } = await import("$lib/tickItem");
		const quick = await import("$lib/quickList");

		quick.addQuickItem("Email Amber");
		const quickItem = quick.quickItems()[0];

		tickItem(scheduleItem({ category: "todo", quickItem }), false);

		expect(quick.quickItems()[0].done).toBe(false);
	});

	it("is a no-op for a row with no source attached", async () => {
		vi.resetModules();
		storage = installStorage();
		const { tickItem } = await import("$lib/tickItem");
		const edits = await import("$lib/userEdits.svelte");

		expect(() => tickItem(scheduleItem({ category: "class" }), true)).not.toThrow();
		expect(edits.taskDoneOverrides()).toEqual({});
	});
});
