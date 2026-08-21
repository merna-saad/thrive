import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SlotView } from "$lib/appointmentsView";
import {
  availabilityByDay,
  bookingWindowEnd,
  firstBookableDay,
  isBookableDay,
  monthTouchesWindow,
  openCountInWindow,
  slotsForDay,
} from "$lib/availability";

/**
 * The booking window's arithmetic.
 *
 * Nothing here reads a clock -- that is the property being protected as much as
 * the answers. Every function takes "today" as a day key, so these tests are
 * timezone-independent by construction and the seven-timezone sweep has nothing
 * to disagree about.
 *
 * The one exception is the last block, which freezes the clock on purpose to
 * check the FIXTURE against the window. That coupling is the reason
 * `BOOKING_WINDOW_DAYS` is 23 and not 5, and it is the thing that would break
 * silently if either number moved alone.
 */

/** A slot, with only the fields the functions under test look at. */
function slot(
  id: string,
  dayKey: string,
  overrides: Partial<SlotView> = {},
): SlotView {
  return {
    id,
    advisorId: "adv-gsa",
    dayKey,
    timeLabel: "9:30 AM",
    mode: "in person",
    available: true,
    startISO: `${dayKey}T09:30:00.000Z`,
    endISO: `${dayKey}T10:00:00.000Z`,
    ...overrides,
  };
}

describe("bookingWindowEnd", () => {
  it("lands on the same date one month on", () => {
    expect(bookingWindowEnd("2026-08-21")).toBe("2026-09-21");
  });

  it("rolls December into the next January", () => {
    // The regression this exists for: `toDayKey` takes a 0-indexed month, so
    // handing it `month + 1` unnormalised produced "2026-13-15" -- a string that
    // sorts after every real day key, which would have opened the window
    // forever instead of by one month.
    expect(bookingWindowEnd("2026-12-15")).toBe("2027-01-15");
  });

  it("clamps to the end of a shorter target month rather than overflowing", () => {
    // February has no 31st. JavaScript would roll this to March 3rd, handing a
    // student who books on the 31st three days that a student booking on the
    // 30th does not get.
    expect(bookingWindowEnd("2027-01-31")).toBe("2027-02-28");
    expect(bookingWindowEnd("2027-01-30")).toBe("2027-02-28");
  });

  it("knows February has 29 days in a leap year", () => {
    expect(bookingWindowEnd("2028-01-31")).toBe("2028-02-29");
  });

  it("does not clamp when the target month is long enough", () => {
    expect(bookingWindowEnd("2026-08-31")).toBe("2026-09-30");
    expect(bookingWindowEnd("2026-07-31")).toBe("2026-08-31");
  });
});

describe("availabilityByDay", () => {
  it("counts the open slots on each day", () => {
    const open = availabilityByDay([
      slot("a", "2026-08-21"),
      slot("b", "2026-08-21"),
      slot("c", "2026-08-24"),
    ]);

    expect(open).toEqual({ "2026-08-21": 2, "2026-08-24": 1 });
  });

  it("counts only what is available", () => {
    const open = availabilityByDay([
      slot("a", "2026-08-21", { available: false }),
      slot("b", "2026-08-21"),
    ]);

    expect(open["2026-08-21"]).toBe(1);
  });

  it("leaves a fully booked day ABSENT rather than present as zero", () => {
    // One spelling of "nothing here", so `openByDay[key] ?? 0` is the only read
    // any consumer needs and a `0` entry cannot mean something subtly different
    // from a missing one.
    const open = availabilityByDay([
      slot("a", "2026-08-21", { available: false }),
    ]);

    expect(open).toEqual({});
    expect("2026-08-21" in open).toBe(false);
  });
});

describe("openCountInWindow", () => {
  const open = {
    "2026-08-20": 3, // before today
    "2026-08-21": 2, // today
    "2026-09-21": 1, // the window's last day
    "2026-09-22": 5, // past it
  };

  it("counts today and the last day, and nothing outside", () => {
    expect(openCountInWindow(open, "2026-08-21", "2026-09-21")).toBe(3);
  });

  it("is zero when the window holds nothing", () => {
    expect(openCountInWindow({}, "2026-08-21", "2026-09-21")).toBe(0);
  });
});

describe("isBookableDay", () => {
  const open = { "2026-08-21": 2, "2026-09-21": 1, "2026-09-22": 4 };
  const today = "2026-08-21";
  const end = "2026-09-21";

  it("accepts a day with open times inside the window", () => {
    expect(isBookableDay("2026-08-21", open, today, end)).toBe(true);
  });

  it("includes both ends of the window", () => {
    expect(isBookableDay(today, open, today, end)).toBe(true);
    expect(isBookableDay(end, open, today, end)).toBe(true);
  });

  it("refuses a day past the window even when it has open times", () => {
    // The two refusals are independent, and this is the one a five-day fixture
    // could never have exercised.
    expect(open["2026-09-22"]).toBe(4);
    expect(isBookableDay("2026-09-22", open, today, end)).toBe(false);
  });

  it("refuses a day before today", () => {
    expect(isBookableDay("2026-08-20", open, today, end)).toBe(false);
  });

  it("refuses a day inside the window with nothing open", () => {
    expect(isBookableDay("2026-08-22", open, today, end)).toBe(false);
  });
});

describe("firstBookableDay", () => {
  const today = "2026-08-21";
  const end = "2026-09-21";

  it("returns today when today is bookable", () => {
    expect(firstBookableDay({ "2026-08-21": 1 }, today, end)).toBe("2026-08-21");
  });

  it("skips past a closed today and a closed weekend", () => {
    // Friday 21 August 2026 is closed, Saturday and Sunday publish nothing, so
    // the panel should open on the Monday. Opening on today instead would show
    // an empty times list beside a calendar full of marks.
    expect(firstBookableDay({ "2026-08-24": 3 }, today, end)).toBe("2026-08-24");
  });

  it("ignores availability past the window", () => {
    expect(firstBookableDay({ "2026-09-22": 9 }, today, end)).toBeNull();
  });

  it("is null when the whole window is closed", () => {
    expect(firstBookableDay({}, today, end)).toBeNull();
  });
});

describe("slotsForDay", () => {
  const slots = [
    slot("a", "2026-08-21", { mode: "zoom" }),
    slot("b", "2026-08-21", { mode: "in person" }),
    slot("c", "2026-08-21", { mode: "zoom", available: false }),
    slot("d", "2026-08-24", { mode: "zoom" }),
  ];

  it("takes one day only", () => {
    expect(slotsForDay(slots, "2026-08-24", "any").map((s) => s.id)).toEqual([
      "d",
    ]);
  });

  it("narrows by meeting type", () => {
    expect(slotsForDay(slots, "2026-08-21", "zoom").map((s) => s.id)).toEqual([
      "a",
      "c",
    ]);
    expect(
      slotsForDay(slots, "2026-08-21", "in person").map((s) => s.id),
    ).toEqual(["b"]);
  });

  it("KEEPS taken slots", () => {
    // They render struck through and disabled. Omitting them would make a busy
    // morning look like an advisor who does not work mornings.
    expect(slotsForDay(slots, "2026-08-21", "any").map((s) => s.id)).toContain(
      "c",
    );
  });
});

describe("monthTouchesWindow", () => {
  const today = "2026-08-21";
  const end = "2026-09-21";

  it("accepts the month today is in", () => {
    expect(monthTouchesWindow("2026-08-01", today, end)).toBe(true);
  });

  it("accepts the month the window ends in", () => {
    expect(monthTouchesWindow("2026-09-01", today, end)).toBe(true);
  });

  it("refuses the month before, whose last day is behind today", () => {
    expect(monthTouchesWindow("2026-07-01", today, end)).toBe(false);
  });

  it("refuses the month after the window ends", () => {
    expect(monthTouchesWindow("2026-10-01", today, end)).toBe(false);
  });

  it("accepts a month that only overlaps at its last day", () => {
    // Today is the 31st, so July's last day IS today and paging back to July
    // still offers one bookable day.
    expect(monthTouchesWindow("2026-07-01", "2026-07-31", "2026-08-31")).toBe(
      true,
    );
  });
});

// ---------------------------------------------------------------------------
// The coupling between the fixture and the rule
// ---------------------------------------------------------------------------

describe("the published fixture covers the booking window", () => {
  /**
   * Monday 1 December 2025, 06:00 local.
   *
   * The worst case for the coupling, chosen rather than picked: a MONDAY start
   * packs the business days into the fewest calendar days, and December is 31
   * days long, so the window reaches its furthest while the fixture reaches its
   * nearest. If it holds here it holds everywhere.
   *
   * This instant is what caught BOOKING_WINDOW_DAYS = 23 being one short.
   *
   * 06:00 is before every published slot, so nothing drops out as already past.
   */
  const FROZEN = new Date(2025, 11, 1, 6, 0, 0);

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(FROZEN);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("publishes at least as far as the window reaches", async () => {
    vi.resetModules();
    const { buildSlotsFor } = await import("$lib/data/mock/appointments");
    const { dayKeyOf } = await import("$lib/schedule");

    const slots = buildSlotsFor("adv-gsa");
    const lastPublished = slots
      .map((candidate) => dayKeyOf(candidate.start))
      .sort()
      .at(-1);

    const windowEnd = bookingWindowEnd(dayKeyOf(new Date()));

    /*
     * This is the assertion that justifies BOOKING_WINDOW_DAYS = 23.
     *
     * At 5 -- the Next fixture's value -- the window reached a month out while
     * the fixture stopped after one week, so the month grid marked five days
     * and left twenty-five looking like an advisor who never works. Lowering
     * the window to match the fixture was the other way to make this pass, and
     * it would have thrown away the point of the month calendar.
     *
     * If this ever goes red, raise the fixture. Do not lower the rule.
     */
    expect(lastPublished).toBeDefined();
    expect(lastPublished! >= windowEnd).toBe(true);
  });

  it("does not publish so far that the card counts times the grid refuses", async () => {
    vi.resetModules();
    const { buildSlotsFor } = await import("$lib/data/mock/appointments");
    const { dayKeyOf } = await import("$lib/schedule");

    const todayKey = dayKeyOf(new Date());
    const windowEnd = bookingWindowEnd(todayKey);

    const slots = buildSlotsFor("adv-gsa").map((candidate) => ({
      ...slot(candidate.id, dayKeyOf(candidate.start)),
      available: candidate.available,
    }));

    const openByDay = availabilityByDay(slots);

    /*
     * The overshoot is real and bounded: the fixture is allowed to publish past
     * the window, and `openCountInWindow` is what keeps the service card from
     * counting those days. Asserting the two differ proves the clamp is load
     * bearing rather than decorative -- if the fixture ever stopped overshooting
     * this would go red and the clamp could be reconsidered.
     */
    const inWindow = openCountInWindow(openByDay, todayKey, windowEnd);
    const everything = Object.values(openByDay).reduce(
      (total, count) => total + count,
      0,
    );

    expect(inWindow).toBeGreaterThan(0);
    expect(inWindow).toBeLessThan(everything);
  });
});
