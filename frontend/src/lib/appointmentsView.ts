import type { Advisor, Appointment, MeetingMode } from "$lib/data";
import { formatTime, formatWeekdayDate } from "$lib/format";
import { messages } from "$lib/messages";
import { dayKeyOf } from "$lib/schedule";

/**
 * View models for the booking surface.
 *
 * Every date field here is already a formatted string. The `load` function
 * builds these, so no component ever parses a timestamp and "what day is it"
 * stays one server-side decision -- the rule CONVENTIONS.md opens with.
 *
 * ## What is NOT here any more
 *
 * The Next tree carried a `DayOption` -- `{ key, weekday, date, relative }` --
 * one per day in a strip of five business-day chips. Phase 8 replaced the chips
 * with a month calendar, and the calendar builds its own cell labels from a day
 * key (the documented client-format exception, see `MiniCalendar`). So there is
 * nothing left for a pre-formatted day option to carry, and carrying one anyway
 * would mean the page shipped a second answer to "what does this day look like"
 * that only one surface read.
 */

export interface SlotView {
  id: string;
  advisorId: string;
  /** Local calendar day, "YYYY-MM-DD". Grouping only, never displayed. */
  dayKey: string;
  /** "9:30 AM" */
  timeLabel: string;
  mode: MeetingMode;
  available: boolean;
  /** ISO bounds, so a confirmed booking can be exported as an .ics file. */
  startISO: string;
  endISO: string;
}

/**
 * Open slots per day, keyed by day key.
 *
 * A plain object rather than a `Map` because it crosses the `load` boundary and
 * then goes into a component prop. A day with nothing open is ABSENT rather
 * than present as `0`, so `openByDay[key] ?? 0` is the only read and there is
 * no second way to spell "nothing here".
 */
export type OpenByDay = Readonly<Record<string, number>>;

/**
 * One booked appointment, as both surfaces need it.
 *
 * The confirmation panel and the appointment list render the SAME object, which
 * is why the labels are here in three forms rather than one. The confirmation
 * wants the day and the time as separate phrases inside a sentence; the list
 * wants the single line. Formatting both on the server costs one string and
 * removes the temptation to split `whenLabel` on " at " in a component.
 *
 * `startISO` / `endISO` are here so the booking can be exported as an .ics
 * file. They are the only raw instants on this type, they are never rendered,
 * and `icsFromAppointment` is the only thing that reads them.
 */
export interface AppointmentView {
  id: string;
  advisorName: string;
  advisorRole: string;
  /** Local calendar day, so the list can point the calendar at a booking. */
  dayKey: string;
  /** "Tue, Aug 12" */
  dateLabel: string;
  /** "9:30 AM" */
  timeLabel: string;
  /** "Tue, Aug 12 at 9:30 AM" */
  whenLabel: string;
  mode: MeetingMode;
  location: string;
  reason: string;
  startISO: string;
  endISO: string;
}

export interface ServiceView {
  advisor: Advisor;
  /** "Academic Advising". Decided on the server, from the advisor's service. */
  serviceLabel: string;
  slots: SlotView[];
  openByDay: OpenByDay;
  /** Still-bookable slots inside the window. Shown on the service card. */
  openCount: number;
}

/**
 * The reason field's ceiling.
 *
 * Shared rather than a component constant because the ACTION has to enforce it
 * too. A `maxlength` on a textarea is a courtesy to the person typing, not a
 * limit -- the action is reachable by direct POST, so trusting the attribute
 * would mean the only thing standing between the store and an unbounded string
 * is markup. MIGRATION.md section 9 defect 2 is the note on that reachability.
 */
export const REASON_MAX = 200;

/**
 * One appointment, formatted.
 *
 * THE ONE MAPPER, called by the `load` function and by the booking action, so a
 * freshly booked appointment and the same appointment on the next page load
 * cannot be formatted two different ways. Every date is resolved to a string
 * here, which is what keeps this off the client.
 *
 * The advisor is passed in rather than looked up: this module has no business
 * knowing how to find one, and both callers already hold the list.
 */
export function toAppointmentView(
  appointment: Appointment,
  advisor: Advisor | undefined,
): AppointmentView {
  const dateLabel = formatWeekdayDate(appointment.start);
  const timeLabel = formatTime(appointment.start);

  return {
    id: appointment.id,
    /*
     * A missing advisor cannot happen with the mock fixtures -- both sides come
     * from `mockAdvisors` -- but the row is still rendered rather than dropped
     * if it ever does. A booking the student made is theirs whether or not we
     * can name who it is with, and silently omitting it would look like the
     * cancel had gone through.
     */
    advisorName: advisor?.name ?? messages.appointments.list.unknownAdvisor,
    advisorRole: advisor?.role ?? "",
    dayKey: dayKeyOf(appointment.start),
    dateLabel,
    timeLabel,
    whenLabel: messages.appointments.list.whenLabel(dateLabel, timeLabel),
    mode: appointment.mode,
    /*
     * Zoom's "location" is the word Zoom, not the advisor's office. Decided here
     * so the confirmation, the list and the .ics file cannot disagree about
     * where a remote meeting is -- putting an office on a Zoom booking would
     * send a student across campus for a call.
     */
    location:
      appointment.mode === "zoom"
        ? messages.appointments.panel.modeZoom
        : (advisor?.location ?? ""),
    reason: appointment.reason,
    startISO: appointment.start,
    endISO: appointment.end,
  };
}
