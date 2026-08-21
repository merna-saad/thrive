import type { CourseMeeting, Standing } from "$lib/data";

/**
 * Formatting helpers shared across the UI.
 *
 * Anything time-aware here is called on the server and passed down as a
 * plain string. Computing "Good morning" inside a client component would
 * risk a hydration mismatch when the server and browser disagree about the
 * hour, and it would freeze at whatever the bundle was built with.
 */

/** "Good morning" / "Good afternoon" / "Good evening" for a given moment. */
export function greetingFor(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** "Monday, August 11" */
export function formatLongDate(date: Date = new Date()): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** "Aug 11" */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** "9:30 AM" */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Avatar initials: "Amber Hanna" -> "AH", "Merna" -> "M".
 *
 * A single name yields a single letter rather than its first two, because
 * "Merna" would otherwise render as "ME" -- which reads as the word "me" in a
 * circle instead of as initials.
 */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Human-readable label for a status value. */
export const standingLabel: Record<Standing, string> = {
  onTrack: "On track",
  watch: "Watch",
  needsHelp: "Needs help",
};

// ---------------------------------------------------------------------------
// Due dates
// ---------------------------------------------------------------------------

export type DueUrgency = "overdue" | "today" | "upcoming";

/** A due date reduced to what the UI actually renders. */
export interface DueDescriptor {
  urgency: DueUrgency;
  /** Short human label, e.g. "Overdue", "Today", "Fri". */
  label: string;
  /**
   * Friendly relative timer: "in 3 days", "tomorrow", "2 days ago".
   *
   * Deliberately words rather than a signed number -- "-84d" is a diff, not
   * something a student reads at a glance.
   */
  countdown: string;
  /** Whole calendar days from now. Negative once overdue. */
  days: number;
  /** Full text for tooltips and screen readers. */
  fullLabel: string;
}

/**
 * Whole days as a phrase a person would say.
 *
 * Weeks take over past a fortnight, because "in 34 days" is a number to be
 * decoded where "in 5 weeks" is a fact.
 */
function countdownPhrase(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";

  const magnitude = Math.abs(days);
  const amount =
    magnitude < 14
      ? `${magnitude} days`
      : magnitude < 60
        ? `${Math.round(magnitude / 7)} weeks`
        : `${Math.round(magnitude / 30)} months`;

  return days < 0 ? `${amount} ago` : `in ${amount}`;
}

/** Whole days between two dates, ignoring the time of day. */
function calendarDaysBetween(from: Date, to: Date): number {
  const a = new Date(from);
  const b = new Date(to);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/**
 * Classify and label a due date.
 *
 * Call this on the server and pass the result into client components. If a
 * client computed it, a browser in a different timezone from the server could
 * disagree about what "today" is and blow up hydration -- and the answer would
 * then be frozen at whatever moment the component last rendered.
 */
export function describeDue(
  iso: string,
  now: Date = new Date(),
): DueDescriptor {
  const due = new Date(iso);
  const days = calendarDaysBetween(now, due);

  const fullLabel = due.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const countdown = countdownPhrase(days);

  // "Overdue" alone, now that the countdown carries the number -- the old
  // label said "Overdue by 3 days" right next to "3 days ago".
  if (days < 0) {
    return {
      urgency: "overdue",
      label: "Overdue",
      countdown,
      days,
      fullLabel: `Was due ${fullLabel}`,
    };
  }

  if (days === 0) {
    return {
      urgency: "today",
      label: "Today",
      countdown,
      days,
      fullLabel: "Due today",
    };
  }

  if (days === 1) {
    return {
      urgency: "upcoming",
      label: "Tomorrow",
      countdown,
      days,
      fullLabel: "Due tomorrow",
    };
  }

  // Inside the coming week a weekday name is easier to place than a date.
  const label =
    days < 7
      ? due.toLocaleDateString("en-US", { weekday: "short" })
      : formatShortDate(iso);

  return {
    urgency: "upcoming",
    label,
    countdown,
    days,
    fullLabel: `Due ${fullLabel}`,
  };
}

/*
 * `localDayKey(iso)` USED TO LIVE HERE. It was collapsed into
 * `dayKeyOf(value: Date | string)` in `$lib/schedule` during the SvelteKit
 * port.
 *
 * The two functions produced the identical "YYYY-MM-DD" from local parts and
 * differed only in whether they took a Date or an ISO string. Two functions
 * computing the same string is how the two of them eventually disagree, so
 * there is now exactly one place the local-parts rule lives.
 *
 * The rule itself is unchanged and still load-bearing: build the key from
 * local parts, never `toISOString().slice(0, 10)`, which would shift an
 * evening appointment onto the next day in any timezone behind UTC.
 *
 * Call `dayKeyOf(iso)` where this used to be called.
 */

/** True when `iso` falls on today's calendar date. */
export function isToday(iso: string, now: Date = new Date()): boolean {
  return calendarDaysBetween(now, new Date(iso)) === 0;
}

/** True when `iso` falls within the next `days` calendar days (inclusive). */
export function isWithinDays(
  iso: string,
  days: number,
  now: Date = new Date(),
): boolean {
  const delta = calendarDaysBetween(now, new Date(iso));
  return delta >= 0 && delta <= days;
}

// ---------------------------------------------------------------------------
// Schedules and events
// ---------------------------------------------------------------------------

const WEEKDAY_ABBREV = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "09:30" -> "9:30 AM". Wall-clock strings, so no timezone is involved. */
export function formatClockTime(hhmm: string): string {
  const [hourText, minuteText] = hhmm.split(":");
  const hour = Number(hourText);
  const suffix = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minuteText} ${suffix}`;
}

/**
 * "Mon/Wed 9:30 AM" for a recurring course.
 *
 * Assumes every meeting starts at the same time, which is true of all four
 * courses. If that stops holding, each distinct time gets its own segment.
 */
export function formatMeetingPattern(schedule: CourseMeeting[]): string {
  if (schedule.length === 0) return "Schedule TBD";

  const byTime = new Map<string, number[]>();
  for (const meeting of schedule) {
    const days = byTime.get(meeting.startTime) ?? [];
    days.push(meeting.dayOfWeek);
    byTime.set(meeting.startTime, days);
  }

  return Array.from(byTime.entries())
    .map(
      ([time, days]) =>
        `${days.map((d) => WEEKDAY_ABBREV[d]).join("/")} ${formatClockTime(time)}`,
    )
    .join(", ");
}

/** The three strings an EventRow's date block renders. */
export function eventDateBlock(iso: string): {
  month: string;
  day: string;
  time: string;
} {
  const date = new Date(iso);
  return {
    month: date.toLocaleDateString("en-US", { month: "short" }),
    day: `${date.getDate()}`,
    time: date.toLocaleString("en-US", {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}
