import { describe, expect, it } from "vitest";

import { canIgnore, eventIdOf, isEventIgnored } from "$lib/ignoredEvents";
import {
  categoriesForDay,
  filterSchedule,
  isVisible,
  legendOrder,
  type DatedScheduleItem,
  type ScheduleData,
  type ScheduleItem,
} from "$lib/schedule";

/**
 * Ignoring events.
 *
 * The store itself needs localStorage, so what is pinned here is the part that
 * decides behaviour: which rows are eligible, how the two surfaces agree on an
 * id, and that hiding a row also removes it from the month grid's dots and its
 * "+n" overflow count.
 */

function item(over: Partial<DatedScheduleItem> = {}): DatedScheduleItem {
  return {
    id: "evt-evt-3-1",
    category: "club",
    title: "Product Club Mixer",
    dayKey: "2026-08-17",
    timeLabel: "5:00 PM",
    detail: "Rady Commons",
    sortMinutes: 1020,
    allDay: false,
    ...over,
  };
}

describe("eventIdOf", () => {
  it("strips the calendar's prefix to reach the raw Event.id", () => {
    // buildSchedule builds `evt-${event.id}`, and the fixtures already name
    // events `evt-3-1`, so the calendar's id is doubly prefixed.
    expect(eventIdOf("evt-evt-3-1")).toBe("evt-3-1");
  });

  it("leaves a raw id alone, so passing one through twice is safe", () => {
    expect(eventIdOf("evt-3-1")).toBe("3-1");
    expect(eventIdOf("plain")).toBe("plain");
  });

  it("is what lets both surfaces key the same event identically", () => {
    // Home holds `event.id`. The calendar holds `evt-${event.id}`.
    const fromHome = eventIdOf("evt-3-1");
    const fromCalendar = eventIdOf(eventIdOf("evt-evt-3-1"));
    expect(fromHome).toBe(fromCalendar);
  });
});

describe("canIgnore", () => {
  it("allows all five opt-in event origins", () => {
    for (const category of ["career", "rady", "club", "sandiego", "ucsd"] as const) {
      expect(canIgnore(item({ category }))).toBe(true);
    }
  });

  it("refuses everything the student is committed to", () => {
    for (const category of ["class", "assignment", "appointment"] as const) {
      expect(canIgnore(item({ category }))).toBe(false);
    }
  });

  it("refuses the student's own items too", () => {
    // Tasks, to-dos and student-created events are theirs to tick or delete,
    // not to dismiss as a recommendation.
    for (const category of ["task", "todo", "custom"] as const) {
      expect(canIgnore(item({ category }))).toBe(false);
    }
  });

  it("covers every category in the legend, so nothing is unclassified", () => {
    for (const category of legendOrder) {
      expect(typeof canIgnore(item({ category }))).toBe("boolean");
    }
  });
});

describe("isEventIgnored", () => {
  it("matches whether given a raw id or a calendar item id", () => {
    const ignored = { "3-1": true } as const;
    expect(isEventIgnored("evt-3-1", ignored)).toBe(true);
  });

  it("is false for anything not in the map", () => {
    expect(isEventIgnored("evt-9-9", { "3-1": true })).toBe(false);
  });
});

describe("filterSchedule with ignored events", () => {
  const ignoredEventIds = ["evt-3-1"];

  it("hides an ignored event by default", () => {
    expect(
      isVisible(item(), { hidden: [], showDone: true, ignoredEventIds }),
    ).toBe(false);
  });

  it("reveals it when showIgnored is on", () => {
    expect(
      isVisible(item(), {
        hidden: [],
        showDone: true,
        ignoredEventIds,
        showIgnored: true,
      }),
    ).toBe(true);
  });

  it("NEVER hides a class, even if its id collides with an ignored one", () => {
    // The guard that matters. A stale or hand-edited store entry must not be
    // able to remove an obligation from the calendar.
    const klass = item({ category: "class", id: "evt-evt-3-1" });
    expect(
      isVisible(klass, { hidden: [], showDone: true, ignoredEventIds }),
    ).toBe(true);
  });

  it("NEVER hides an assignment or a task", () => {
    for (const category of ["assignment", "task", "todo"] as const) {
      expect(
        isVisible(item({ category }), {
          hidden: [],
          showDone: true,
          ignoredEventIds,
        }),
      ).toBe(true);
    }
  });

  it("drops the row from ScheduleData so every consumer agrees", () => {
    const data: ScheduleData = {
      dated: [item({ id: "evt-evt-3-1" }), item({ id: "evt-evt-9-9" })],
      recurring: [],
    };
    const result = filterSchedule(data, {
      hidden: [],
      showDone: true,
      ignoredEventIds,
    });
    expect(result.dated.map((r) => r.id)).toEqual(["evt-evt-9-9"]);
  });
});

/**
 * The month grid draws one dot per distinct CATEGORY present on a day, capped
 * at three with a "+n" for the rest. Both the dots and that overflow number
 * come from `categoriesForDay`, which reads the already-filtered data, so
 * hiding an event has to remove its dot and shrink the cap.
 */
describe("month grid dots and the +n cap exclude ignored events", () => {
  const MAX_DOTS = 3;
  const dayKey = "2026-08-17";

  /** Mirrors MiniCalendar's arithmetic exactly. */
  function dotsFor(data: ScheduleData) {
    const categories = categoriesForDay(data, dayKey);
    const shown = categories.length > MAX_DOTS ? MAX_DOTS - 1 : MAX_DOTS;
    return { categories, shown, overflow: categories.length - shown };
  }

  const busy: ScheduleData = {
    dated: [
      item({ id: "evt-evt-1", category: "career" }),
      item({ id: "evt-evt-2", category: "rady" }),
      item({ id: "evt-evt-3", category: "club" }),
      item({ id: "evt-evt-4", category: "sandiego" }),
      item({ id: "evt-evt-5", category: "ucsd" }),
    ],
    recurring: [],
  };

  it("counts five categories and shows +n before anything is ignored", () => {
    const { categories, shown, overflow } = dotsFor(busy);
    expect(categories).toHaveLength(5);
    expect(shown).toBe(2);
    expect(overflow).toBe(3);
  });

  it("loses the dot for an ignored event", () => {
    const filtered = filterSchedule(busy, {
      hidden: [],
      showDone: true,
      ignoredEventIds: ["evt-1"],
    });
    expect(dotsFor(filtered).categories).not.toContain("career");
  });

  it("shrinks the +n rather than still counting hidden events", () => {
    const filtered = filterSchedule(busy, {
      hidden: [],
      showDone: true,
      ignoredEventIds: ["evt-1", "evt-2"],
    });
    const { categories, shown, overflow } = dotsFor(filtered);
    expect(categories).toHaveLength(3);
    // Three fits exactly, so no counter is needed at all.
    expect(shown).toBe(3);
    expect(overflow).toBe(0);
  });

  it("leaves no dot at all when every event on the day is ignored", () => {
    const filtered = filterSchedule(busy, {
      hidden: [],
      showDone: true,
      ignoredEventIds: ["evt-1", "evt-2", "evt-3", "evt-4", "evt-5"],
    });
    expect(dotsFor(filtered).categories).toEqual([]);
  });

  it("still shows the class dot on a day whose events are all ignored", () => {
    const withClass: ScheduleData = {
      dated: [...busy.dated],
      recurring: [
        {
          id: "c1",
          dayOfWeek: 1, // 2026-08-17 is a Monday
          title: "MGT 142",
          detail: "Otterson 1S118",
          startTime: "09:30",
          timeLabel: "9:30 AM",
        },
      ],
    };
    const filtered = filterSchedule(withClass, {
      hidden: [],
      showDone: true,
      ignoredEventIds: ["evt-1", "evt-2", "evt-3", "evt-4", "evt-5"],
    });
    expect(dotsFor(filtered).categories).toEqual(["class"]);
  });
});

/**
 * Undo restores position because it deletes the override rather than writing a
 * "not ignored" value, so ordering was never touched.
 */
describe("undo restores the row in its original position", () => {
  const feed: ScheduleItem[] = [
    item({ id: "evt-evt-a", title: "A" }),
    item({ id: "evt-evt-b", title: "B" }),
    item({ id: "evt-evt-c", title: "C" }),
  ];

  const visible = (ids: string[]) =>
    feed
      .filter((row) =>
        isVisible(row, { hidden: [], showDone: true, ignoredEventIds: ids }),
      )
      .map((row) => row.title);

  it("removes the middle row and closes the gap", () => {
    expect(visible(["evt-b"])).toEqual(["A", "C"]);
  });

  it("puts it back between A and C, not at the end", () => {
    expect(visible([])).toEqual(["A", "B", "C"]);
  });
});
