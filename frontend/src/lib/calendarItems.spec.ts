import { describe, expect, it } from "vitest";

import { customEventToItem, type CustomEvent } from "$lib/calendarItems";
import { isVisible, type ScheduleItem } from "$lib/schedule";

/**
 * Student-created items, and the two annotations that can land on anything.
 *
 * The store functions themselves need localStorage; the mapper and the filter
 * rules are pure and are where the decisions actually live.
 */

function event(over: Partial<CustomEvent> = {}): CustomEvent {
  return {
    id: "c1",
    title: "Coffee with Shankar",
    dayKey: "2026-08-19",
    time: "14:30",
    createdAt: 0,
    ...over,
  };
}

function item(over: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id: "i1",
    category: "task",
    title: "Item",
    timeLabel: "9:30 AM",
    detail: "",
    sortMinutes: 570,
    allDay: false,
    ...over,
  };
}

describe("customEventToItem", () => {
  it("maps a timed event onto its day", () => {
    const result = customEventToItem(event());
    expect(result?.dayKey).toBe("2026-08-19");
    expect(result?.allDay).toBe(false);
    expect(result?.sortMinutes).toBe(14 * 60 + 30);
    expect(result?.timeLabel).toBe("2:30 PM");
  });

  it("treats a missing time as all-day rather than midnight", () => {
    const result = customEventToItem(event({ time: undefined }));
    expect(result?.allDay).toBe(true);
    expect(result?.timeLabel).toBe("All day");
    expect(result?.sortMinutes).toBe(0);
  });

  it("carries label, urgent and the custom marker", () => {
    const result = customEventToItem(
      event({ label: "thesis", urgent: true }),
    );
    expect(result?.label).toBe("thesis");
    expect(result?.urgent).toBe(true);
    expect(result?.custom).toBe(true);
    expect(result?.category).toBe("custom");
  });

  it("prefixes the id so it cannot collide with a server row", () => {
    expect(customEventToItem(event({ id: "abc" }))?.id).toBe("custom-abc");
  });

  it("rejects a malformed day key instead of guessing a day", () => {
    expect(customEventToItem(event({ dayKey: "nope" }))).toBeNull();
    expect(customEventToItem(event({ dayKey: "2026-08" }))).toBeNull();
  });

  it("rejects a date that does not exist rather than rolling it forward", () => {
    // `new Date(2026, 1, 31)` silently becomes 3 March. Storing an event on
    // "2026-02-31" must not put it on a day the student never picked.
    expect(customEventToItem(event({ dayKey: "2026-02-31" }))).toBeNull();
  });
});

describe("urgent and label filtering", () => {
  it("urgentOnly keeps only flagged items", () => {
    const filter = { hidden: [], showDone: true, urgentOnly: true };
    expect(isVisible(item({ urgent: true }), filter)).toBe(true);
    expect(isVisible(item(), filter)).toBe(false);
  });

  it("hides an item whose label is switched off", () => {
    const filter = { hidden: [], showDone: true, hiddenLabels: ["thesis"] };
    expect(isVisible(item({ label: "thesis" }), filter)).toBe(false);
    expect(isVisible(item({ label: "capstone" }), filter)).toBe(true);
  });

  it("never hides an unlabelled item via a label filter", () => {
    // Otherwise "filter by label" quietly means "hide everything unlabelled",
    // which is not what switching one chip off looks like it does.
    expect(
      isVisible(item(), { hidden: [], showDone: true, hiddenLabels: ["x"] }),
    ).toBe(true);
  });
});
