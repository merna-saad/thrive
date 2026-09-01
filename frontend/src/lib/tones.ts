import type { Standing } from '$lib/data';
import type { DueUrgency } from '$lib/format';

/**
 * Where a meaning becomes a colour.
 *
 * Every map in this file is the ONLY place its particular translation happens.
 * They live in a `.ts` rather than inside the components that use them for two
 * reasons: a Svelte component cannot export a type cleanly, and these are the
 * part of the visual system worth testing -- a map is exhaustive or it is not,
 * and `Record<Union, T>` makes that a compile error rather than a missing chip.
 *
 * The class strings name design-system utilities and nothing else. No hex, no
 * raw sizes -- `designSystem.spec.ts` fails the build on either.
 */

export type TagTone =
	| 'neutral'
	| 'quiet'
	| 'primary'
	| 'urgent'
	| 'watch'
	| 'on-track'
	| 'needs-help'
	| 'civic'
	| 'later';

/**
 * Solid fills carrying white text, measured in the contrast gate.
 *
 * `neutral` and `quiet` stay unfilled on purpose: a course code is a fact, not
 * a status, and if everything shouts then nothing does.
 */
/**
 * TINTS, NOT FILLS, as of 2026-08-31.
 *
 * Every status tone was a SOLID fill with `on-primary` lettering, and that was
 * right when a chip was a rare marker on an otherwise quiet row. It stopped being
 * right when Home put three of them on each of ten rows: thirty saturated blocks
 * is not emphasis, it is a page where the chips are the loudest thing and the
 * task titles are what you have to hunt for.
 *
 * Each tone is now its own soft tint carrying its own hue as TEXT. The chip still
 * reads as that status at a glance -- the hue is unchanged, only its area is --
 * and the row's title is once again the heaviest ink in the row.
 *
 * `bg-*-soft` and `text-*` are both existing tokens. Nothing new was added to the
 * palette and the contrast gate has no new colour to measure.
 *
 * ## The one thing this inherits, stated rather than hidden
 *
 * On DARK the soft tints are literal hexes solved so that `bg-*-soft text-*`
 * clears 4.5:1, and app.css records them measured at 4.60-4.64:1 -- which is
 * exactly the pairing this map now uses, so dark is covered by construction.
 *
 * On LIGHT they are `color-mix()`, which `check-contrast.py` deliberately does
 * not evaluate, so these pairs are measured in one theme and reasoned about in
 * the other. That asymmetry is pre-existing and documented at the tokens; this
 * map now depends on it where before it did not. Closing it means replacing seven
 * light mixes with literals, which is a palette change rather than a chip change.
 *
 * `primary` went soft too, and it was the last one to go because the argument for
 * keeping it was good: it is not a status, it marks a course code or a
 * goal-matched event, and it appears at most once per row. Rendered, that was
 * wrong -- once every status chip around it was a tint, a solid navy "MGTA451"
 * became the loudest thing in the row, louder than the task title it belongs to.
 * A chip must not outrank the thing it is describing.
 */
export const tagTones: Record<TagTone, string> = {
	neutral: 'border border-line bg-surface text-body',
	quiet: 'text-muted-ink',
	primary: 'bg-primary-soft text-primary',
	urgent: 'bg-urgent-soft text-urgent',
	watch: 'bg-watch-soft text-watch',
	'on-track': 'bg-on-track-soft text-on-track',
	'needs-help': 'bg-needs-help-soft text-needs-help',
	civic: 'bg-civic-soft text-civic',
	later: 'bg-later-soft text-later'
};

/**
 * A standing becomes a tone in exactly one place.
 *
 * Note `onTrack` is the teal that replaced the old blue when primary became
 * navy -- the token moved, this map did not.
 */
export const standingTone: Record<Standing, TagTone> = {
	onTrack: 'on-track',
	watch: 'watch',
	needsHelp: 'needs-help'
};

/**
 * A due descriptor becomes a tone.
 *
 * `upcoming` is deliberately `quiet` -- no fill. Most tasks are upcoming, and a
 * filled chip on every row would make the two that matter invisible.
 *
 * `unknown` is the fourth state added in Phase 3a-fix. It gets `neutral`, not a
 * status tone: "how urgent is it" has no answer for a date that does not exist,
 * and tinting it would be inventing one.
 */
export const urgencyTone: Record<DueUrgency | 'unknown', TagTone> = {
	overdue: 'urgent',
	today: 'watch',
	upcoming: 'quiet',
	unknown: 'neutral'
};

/** Stat pill tints. `calm` is the zero state. */
export type StatTone = 'urgent' | 'watch' | 'primary' | 'calm';

/**
 * A count of nothing is not an alarm.
 *
 * `calm` exists so a coral pill does not permanently read "0 overdue", which is
 * manufactured anxiety with no payoff -- a good day has to be able to look
 * different from a bad one.
 */
export const statTones: Record<StatTone, { wrap: string; icon: string }> = {
	urgent: { wrap: 'bg-urgent-soft text-urgent', icon: 'text-urgent' },
	watch: { wrap: 'bg-watch-soft text-watch', icon: 'text-watch' },
	primary: { wrap: 'bg-primary-soft text-primary', icon: 'text-primary' },
	// muted-ink for the icon, not faint: faint on sunken is 3.16:1, and a
	// meaningful graphic owes 3:1 -- too close to spend on decoration.
	calm: { wrap: 'bg-sunken text-muted-ink', icon: 'text-muted-ink' }
};

/** Which token paints a progress fill. `primary` is the neutral default. */
export type ProgressTone = 'primary' | Standing;

export const progressTones: Record<ProgressTone, string> = {
	primary: 'bg-primary',
	onTrack: 'bg-on-track',
	watch: 'bg-watch',
	needsHelp: 'bg-needs-help'
};

/**
 * The nudge callout on a course card, tinted by that course's standing.
 *
 * Only two standings produce a nudge in practice, so this is `Partial` and the
 * caller falls back to the primary tint. Carries a stroke of its own hue: a
 * tinted block with no edge disappeared against the panel it sits in.
 */
export const nudgeTones: Partial<Record<Standing, string>> = {
	watch: 'border-watch bg-watch-soft text-watch',
	needsHelp: 'border-needs-help bg-needs-help-soft text-needs-help'
};

export const nudgeToneFallback = 'border-primary bg-primary-soft text-primary-hover';
