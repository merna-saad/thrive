import type { ScheduleItem } from "$lib/schedule";

/**
 * Minimal iCalendar (.ics) export.
 *
 * This produces a FILE the student downloads and chooses to import. THRIVE
 * still never writes to anyone's calendar -- there is no calendar API call
 * here, nothing leaves the browser, and nobody is notified.
 *
 * ## The clock is a parameter
 *
 * `DTSTAMP` is "when this file was made", so building one needs the current
 * instant. The Next version read `new Date()` inside `buildIcs`, which made the
 * whole builder untestable without faking a global and put a clock read in a
 * module a server render can reach.
 *
 * Here the instant is an argument. `buildIcs` is pure and its output is
 * assertable byte for byte; `downloadIcs` reads the clock at the boundary,
 * inside a click handler, which is where CONVENTIONS.md allows it. Same shape as
 * `describeDue(iso, now)` and `nextUpItem(items, now)`.
 */

export interface IcsEvent {
	/** Stable identifier; becomes the UID so re-importing updates rather than duplicates. */
	id: string;
	title: string;
	start: string;
	end: string;
	location?: string;
	description?: string;
}

/** iCalendar wants UTC basic format: 20260814T180000Z */
function toIcsStamp(iso: string): string {
	return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Commas, semicolons, and newlines are structural in iCalendar text values. */
function escapeText(value: string): string {
	return value
		.replace(/\\/g, "\\\\")
		.replace(/;/g, "\\;")
		.replace(/,/g, "\\,")
		.replace(/\r?\n/g, "\\n");
}

/**
 * The calendar row as one exportable event, or null when it has no instant.
 *
 * ONE mapper, called by both surfaces that offer the download. The Next tree
 * wrote this object literal twice -- once in `ItemDetail` and once in
 * `DayEventsSection` -- which is two places for the `endISO ?? startISO`
 * fallback to be got wrong independently.
 *
 * Null rather than a partial event: a recurring class meeting carries no
 * `startISO` (it is a weekday RULE, not an instant), and an .ics with no DTSTART
 * is not a shorter calendar file, it is an invalid one.
 */
export function icsFromItem(item: ScheduleItem): IcsEvent | null {
	if (!item.startISO) return null;

	return {
		id: item.id,
		title: item.title,
		start: item.startISO,
		end: item.endISO ?? item.startISO,
		location: item.detail || undefined,
		description: item.description,
	};
}

/**
 * The file's text.
 *
 * `stampISO` is the DTSTAMP instant -- when this file was produced. Passed in
 * rather than read, see the note at the top.
 */
export function buildIcs(events: IcsEvent[], stampISO: string): string {
	const lines: string[] = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//THRIVE//MSBA prototype//EN",
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
	];

	for (const event of events) {
		lines.push(
			"BEGIN:VEVENT",
			`UID:${event.id}@thrive.local`,
			`DTSTAMP:${toIcsStamp(stampISO)}`,
			`DTSTART:${toIcsStamp(event.start)}`,
			`DTEND:${toIcsStamp(event.end)}`,
			`SUMMARY:${escapeText(event.title)}`,
		);
		if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
		if (event.description) {
			lines.push(`DESCRIPTION:${escapeText(event.description)}`);
		}
		lines.push("END:VEVENT");
	}

	lines.push("END:VCALENDAR");
	// iCalendar requires CRLF line endings.
	return lines.join("\r\n");
}

/** A filename with exactly one `.ics` on the end. */
export function icsFilename(name: string): string {
	return name.endsWith(".ics") ? name : `${name}.ics`;
}

/**
 * Trigger a download of these events as one .ics file.
 *
 * CLIENT ONLY, and the one clock read in this module. Called from a click
 * handler, never during a render -- there is no `document` on the server, so a
 * server-render call would throw rather than quietly produce a wrong file.
 */
export function downloadIcs(filename: string, events: IcsEvent[]): void {
	const blob = new Blob([buildIcs(events, new Date().toISOString())], {
		type: "text/calendar;charset=utf-8",
	});
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = icsFilename(filename);
	anchor.click();
	URL.revokeObjectURL(url);
}

/** The whole download, from a calendar row. Returns false when there is nothing to export. */
export function downloadItemIcs(item: ScheduleItem): boolean {
	const event = icsFromItem(item);
	if (!event) return false;
	downloadIcs(item.id, [event]);
	return true;
}
