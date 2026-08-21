import type { MeetingMode } from "$lib/data";
import type { OpenByDay, SlotView } from "$lib/appointmentsView";
import { addDays, fromDayKey, toDayKey } from "$lib/schedule";

/**
 * The booking window, and what a day has open in it.
 *
 * All pure, all clock-free. Every function takes "today" as a day key rather
 * than reading it, for the same reason `describeDue` takes `now`: the server
 * decides what today is, once, and this module answers questions against that
 * answer. A `new Date()` in here would put a second opinion behind the day list
 * and let it disagree with the header above it.
 *
 * ## The rule this module owns
 *
 * Booking runs ONE CALENDAR MONTH ahead. That is a product rule and it lives
 * here, not in the fixture. `mock/appointments.ts` publishes 25 business days
 * of slots, which exists only to be long enough that the fixture never runs out
 * before this rule does -- the spec asserts that coupling in both directions.
 *
 * A day is bookable when BOTH hold: the advisor has something open on it, and
 * it falls inside the window.
 *
 * ## What the surface does with the days it CANNOT offer
 *
 * Phase 8 rendered a month grid, so every refusal had to be drawn: past days,
 * days beyond the window and fully-booked days were all grey cells, and 26 of 35
 * read as "this system is broken" rather than as three different facts.
 *
 * The redesign shows a LIST of the days this advisor actually works inside the
 * window, so two of those three refusals stop being drawn at all -- a past day
 * and a day beyond the window are simply not options, and the list's own bounds
 * say so. The third, a working day whose slots are all taken, IS listed and says
 * "fully booked" in words. `publishedByDay` beside `availabilityByDay` is what
 * makes that distinction possible.
 */

export type ModeFilter = MeetingMode | "any";

/**
 * One calendar month after `todayKey`, inclusive.
 *
 * Clamped to the end of the target month rather than allowed to overflow.
 * `new Date(2027, 0, 31)` plus one month is February 31st, which JavaScript
 * rolls forward to March 3rd -- so a student booking on the 31st of January
 * would be handed three extra days that a student booking on the 30th would
 * not. Clamping makes the window's LENGTH vary by a day or two instead of its
 * END date lurching, which is the smaller surprise and the one a calendar grid
 * can actually show.
 */
export function bookingWindowEnd(todayKey: string): string {
  const today = fromDayKey(todayKey);
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  /*
   * Both bounds go through `Date` so December rolls into the next January.
   * `toDayKey` takes a 0-indexed month and pads it, so handing it `month + 1`
   * raw would produce "2026-13-15" every December -- a string that sorts after
   * every real day key and would quietly open the window forever.
   */
  const target = new Date(year, month + 1, 1);
  // Day 0 of the month after next is the last day of the month after this one.
  const lastDayOfTargetMonth = new Date(year, month + 2, 0).getDate();

  return toDayKey(
    target.getFullYear(),
    target.getMonth(),
    Math.min(day, lastDayOfTargetMonth),
  );
}

/**
 * How many slots each day still has open.
 *
 * Only `available` slots count. A day whose every slot is taken is absent from
 * the result rather than present as zero, so the grid's "is anything open here"
 * test is one lookup with no second spelling of nothing.
 */
export function availabilityByDay(slots: readonly SlotView[]): OpenByDay {
  const open: Record<string, number> = {};

  for (const slot of slots) {
    if (!slot.available) continue;
    open[slot.dayKey] = (open[slot.dayKey] ?? 0) + 1;
  }

  return open;
}

/**
 * How many slots each day publishes AT ALL, taken or not.
 *
 * The companion to `availabilityByDay`, and the two together are what let the day
 * list tell "fully booked" apart from "not a working day". Open alone cannot: both
 * are zero.
 *
 * A day the advisor does not work is absent from BOTH maps, which is what the day
 * list uses to leave weekends out entirely rather than listing them as refusals.
 */
export function publishedByDay(slots: readonly SlotView[]): OpenByDay {
  const published: Record<string, number> = {};

  for (const slot of slots) {
    published[slot.dayKey] = (published[slot.dayKey] ?? 0) + 1;
  }

  return published;
}

/** Every open slot inside the window, for the count on a service card. */
export function openCountInWindow(
  openByDay: OpenByDay,
  todayKey: string,
  windowEnd: string,
): number {
  let total = 0;

  for (const [dayKey, count] of Object.entries(openByDay)) {
    if (dayKey >= todayKey && dayKey <= windowEnd) total += count;
  }

  return total;
}

/**
 * Can this day be chosen?
 *
 * Day keys are compared as STRINGS. "YYYY-MM-DD" is zero-padded and
 * big-endian, so lexicographic order is chronological order -- no parsing, and
 * no timezone can get between the comparison and the answer.
 */
export function isBookableDay(
  dayKey: string,
  openByDay: OpenByDay,
  todayKey: string,
  windowEnd: string,
): boolean {
  if (dayKey < todayKey || dayKey > windowEnd) return false;
  return (openByDay[dayKey] ?? 0) > 0;
}

/**
 * The day the panel should open on: the soonest bookable one.
 *
 * Not simply today. Today is frequently NOT bookable -- an advisor may publish
 * nothing on a Saturday, and slots that have already passed are gone from
 * `available` by mid-afternoon. Opening on an unbookable day would show an
 * empty times list beside a calendar full of marks, which reads as broken
 * rather than as "not today".
 *
 * Null when the whole window is closed, so the caller can say so instead of
 * pointing at a day it cannot serve.
 */
export function firstBookableDay(
  openByDay: OpenByDay,
  todayKey: string,
  windowEnd: string,
): string | null {
  for (let dayKey = todayKey; dayKey <= windowEnd; dayKey = addDays(dayKey, 1)) {
    if (isBookableDay(dayKey, openByDay, todayKey, windowEnd)) return dayKey;
  }

  return null;
}

/**
 * One day's slots, narrowed by meeting type.
 *
 * Taken slots are KEPT. The panel renders them struck through and disabled,
 * because "10:30 is gone" is information a student uses to read the shape of an
 * advisor's day, and silently omitting them makes a busy morning look like an
 * advisor who simply does not work mornings.
 */
export function slotsForDay(
  slots: readonly SlotView[],
  dayKey: string,
  mode: ModeFilter,
): SlotView[] {
  return slots.filter(
    (slot) =>
      slot.dayKey === dayKey && (mode === "any" || slot.mode === mode),
  );
}
