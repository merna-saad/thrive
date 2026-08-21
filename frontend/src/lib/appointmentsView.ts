import type { Advisor, Appointment, MeetingMode } from "$lib/data";
import { formatTime, formatWeekdayDate } from "$lib/format";
import { messages } from "$lib/messages";
import { dayKeyOf, fromDayKey } from "$lib/schedule";

/**
 * View models for the booking surface.
 *
 * Every date field here is already a formatted string. The `load` function
 * builds these, so no component ever parses a timestamp and "what day is it"
 * stays one server-side decision -- the rule CONVENTIONS.md opens with.
 *
 * ## `DayOption` left and came back, and the round trip is the useful part
 *
 * The Next tree carried a `DayOption` -- `{ key, weekday, date, relative }` --
 * one per day in a strip of five business-day chips. Phase 8 deleted it, because
 * a month grid builds its own cell labels from a day key and pages to months no
 * `load` could pre-format.
 *
 * The redesign brings the shape back as `BookingDayView`, with two more fields.
 * **What changed is not the data, it is who has to explain itself.** A grid cell
 * is 40px and leans on a legend; a list row has room to say "4 times" or "fully
 * booked" in its own words and should not want a legend at all. Once the rows
 * carry copy, the copy has to be formatted somewhere, and that somewhere is the
 * server.
 *
 * The bounded list also gives back something the grid had to spend: with a
 * finite set of days there is no client-side date formatting on this page at
 * all.
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

/**
 * One offerable day, as the day list renders it.
 *
 * ## Why this exists and `DayOption` did not survive
 *
 * Phase 8 deleted the Next tree's `DayOption` because a month grid built its own
 * cell labels from a day key. The redesign brings a pre-formatted day view back,
 * and the reason is the interesting part: **a list row has to say its own state
 * in words**, and "4 times" / "fully booked" / "Today" are copy, not geometry.
 * A grid cell could get away with a dot because it had a legend; a row cannot,
 * and should not want one.
 *
 * Every field here is a finished string except the two counts, and the counts are
 * counts rather than dates.
 */
export interface BookingDayView {
  /** Local calendar day, "YYYY-MM-DD". The selection value, never displayed. */
  dayKey: string;
  /** "Mon" */
  weekdayLabel: string;
  /** "Aug 24" */
  dateLabel: string;
  /**
   * "Today" or "Tomorrow", else empty.
   *
   * Empty rather than absent so a caller never has to decide what a missing
   * field means. The row prints it only when it is non-empty.
   */
  relativeLabel: string;
  /**
   * "August" on the FIRST row of each month, else empty.
   *
   * The list's only structural heading, and it is what replaces the month grid's
   * paging: the window spans at most two months, so scrolling past this heading
   * IS looking further ahead. Decided on the server because it depends on the row
   * before it, which is exactly the sort of off-by-one that hides in a component.
   */
  monthHeading: string;
  /** Slots still free. Zero means fully booked, never "no such day". */
  openCount: number;
  /** Slots published at all. Always > 0 — a day with none is not in this list. */
  publishedCount: number;
}

export interface ServiceView {
  advisor: Advisor;
  /** "Academic Advising". Decided on the server, from the advisor's service. */
  serviceLabel: string;
  slots: SlotView[];
  openByDay: OpenByDay;
  /** Still-bookable slots inside the window. Shown on the service card. */
  openCount: number;
  /**
   * The days this advisor works inside the window, ascending.
   *
   * Days with nothing published are ABSENT — a weekend is not a refusal, it is
   * not a day this advisor works, and listing it as unavailable would be the
   * mostly-grey month grid in a taller shape.
   */
  days: BookingDayView[];
  /** "Mon, Sep 21" — the last day the window reaches, for the list's footer. */
  windowEndLabel: string;
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

/**
 * The day list, formatted, from the two count maps.
 *
 * ## Server-side, and this is one of the reasons the rule exists
 *
 * Four of the six fields on each row are locale-formatted dates, and the fifth
 * is a relative word that depends on what "today" is. Formatting them here means
 * `DayPicker` receives finished strings and holds no opinion about the calendar
 * at all -- it cannot disagree with the header above it about which day is today,
 * because it was never told an instant.
 *
 * Note what that buys over the month grid it replaces: `MiniCalendar` had to
 * format two things on the CLIENT, because a grid that pages to any month has no
 * finite set of months a `load` could pre-render. A list bounded by the window
 * has exactly one set of days, so nothing here needs the exception.
 *
 * `todayKey` and `windowEnd` come in as arguments. Nothing reads a clock.
 */
export function toBookingDayViews(
	openByDay: OpenByDay,
	publishedByDay: OpenByDay,
	todayKey: string,
	windowEnd: string,
	tomorrowKey: string,
): BookingDayView[] {
	const dayKeys = Object.keys(publishedByDay)
		.filter((dayKey) => dayKey >= todayKey && dayKey <= windowEnd)
		.sort();

	let lastMonth = "";

	return dayKeys.map((dayKey) => {
		const date = fromDayKey(dayKey);
		const month = date.toLocaleDateString("en-US", { month: "long" });

		/*
		 * The heading prints only when the month CHANGES, which is why this is a
		 * fold rather than a map over an independent predicate: the answer depends
		 * on the row before it. Index 0 always prints -- the first row has nothing
		 * behind it to be the same as -- which falls out of `lastMonth` starting
		 * empty rather than needing its own branch.
		 */
		const monthHeading = month === lastMonth ? "" : month;
		lastMonth = month;

		const relativeLabel =
			dayKey === todayKey
				? messages.appointments.days.today
				: dayKey === tomorrowKey
					? messages.appointments.days.tomorrow
					: "";

		return {
			dayKey,
			weekdayLabel: date.toLocaleDateString("en-US", { weekday: "short" }),
			dateLabel: date.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
			}),
			relativeLabel,
			monthHeading,
			openCount: openByDay[dayKey] ?? 0,
			publishedCount: publishedByDay[dayKey] ?? 0,
		};
	});
}
