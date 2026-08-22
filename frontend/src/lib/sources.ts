import type { SourceSystem } from "$lib/data";
import { messages } from "$lib/messages";

/**
 * Provenance: turning an origin into something a row can show.
 *
 * ## Why this is a module and not three lines in the component
 *
 * Vitest runs in Node with no jsdom, so logic inside a `.svelte` file is logic
 * no gate can see. The decision worth pinning here is a NEGATIVE one -- an
 * absent or unrecognised origin must render NOTHING -- and a negative is exactly
 * the kind of behaviour that regresses quietly: an empty badge on every row
 * looks like a styling glitch rather than a bug, so nobody reports it.
 *
 * Same reasoning as `tickItem`, `calendarEvents` and `calendarAdd`: extract by
 * failure mode, not by size.
 */

/**
 * The visible pill text for an origin, or `null` when there is nothing to say.
 *
 * TWO ways to get `null`, and they are deliberately the same path:
 *
 *  1. **No origin.** The row's provenance was never recorded. Absent means
 *     UNKNOWN, never "not from Canvas" -- so it says nothing rather than
 *     implying something.
 *  2. **An origin this build has no label for.** Django can send a value newer
 *     than the frontend. Rendering the raw value would put `handshake_v2` on a
 *     row; rendering nothing degrades to the case above.
 *
 * Note the parameter is widened to `string`. `SourceSystem` is the contract, and
 * a runtime value arriving from an API is not bound by it -- typing this as
 * `SourceSystem` would make case 2 unreachable to a caller and unprovable to a
 * test, which is the whole reason the case exists.
 */
export function sourceLabel(origin?: SourceSystem | string | null): string | null {
  if (!origin) return null;
  return messages.common.source.label[origin] ?? null;
}

/**
 * The spoken form, or `null` on the same terms.
 *
 * A bare product name beside a title tells a screen reader user the word and
 * nothing about why it is there, so the visible text and the accessible name are
 * deliberately different: one word on screen, a sentence for assistive tech.
 */
export function sourceSpoken(origin?: SourceSystem | string | null): string | null {
  const name = sourceLabel(origin);
  return name === null ? null : messages.common.source.spoken(name);
}
