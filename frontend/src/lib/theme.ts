import { createOverrideStore } from "$lib/overrideStore.svelte";

/**
 * Which theme the student has chosen, persisted.
 *
 * Built on `createOverrideStore` under one fixed key, the same compromise
 * `calendarPrefs.ts` and `floatingPanel.ts` make: this is UI state rather than
 * an override over provider truth, but that module is the single persistence
 * mechanism and one seam to change later beats two. All four of its properties
 * hold here -- and property 2 ("empty on the server, real after mount") is not
 * an inconvenience for this store, it is the whole design. See below.
 *
 * ## THREE STATES, AND `system` IS NOT A THIRD COLOUR
 *
 * `system` means "no choice recorded, follow the OS". It has to be a real,
 * reachable state rather than an initial one, because a student who tries dark
 * and wants to go back needs somewhere to go back TO -- and "back" is not
 * "light", it is "whatever my machine says", which may change at sunset.
 *
 * It is stored as the ABSENCE of an override, not as the string `"system"`.
 * `setTheme('system')` calls `store.set(KEY, undefined)`, which is the override
 * layer's own word for "never touched, use the source value" (property 4: a
 * write matching the source value forgets the override). So a student who
 * toggles all the way round leaves no key behind, and the persisted state of the
 * default is the same as the persisted state of a fresh browser.
 *
 * ## THE FIRST-PAINT PROBLEM, AND WHY THERE IS NO SCRIPT IN THE HEAD
 *
 * The server cannot know a student's theme -- there is no session, and reading
 * `localStorage` needs a browser. The usual fix is a blocking inline script in
 * `<head>` that reads storage and stamps a class before the first paint. That is
 * a SECOND hydration strategy, and this app has one: strategy A, "empty on the
 * server, real after mount", stated in the root `+layout.svelte` and in
 * `overrideStore`. Adding a blocking read here would mean two different answers
 * to the same question in one codebase, and the theme is not the thing worth
 * making that exception for.
 *
 * So the DEFAULT is expressed in CSS instead of in JavaScript. `app.css` sets
 * `color-scheme: light dark` on `:root` and every colour token is a
 * `light-dark()` pair, so the browser resolves `prefers-color-scheme` itself,
 * before the first paint, with nothing in the path. The consequence is the part
 * worth stating plainly:
 *
 *   - A student on `system` -- the default, and the state with no stored key --
 *     gets the CORRECT first paint. No flash, and no script needed to avoid one.
 *   - A student who has explicitly chosen the theme their OS is NOT set to sees
 *     one frame of the other theme before `hydrateStores()` runs. That is
 *     strategy A's existing cost, on one more preference, for the subset of
 *     students who have opted out of the default.
 *
 * That is a smaller flash than the blocking script would remove, and it is paid
 * by fewer people, so the exception is not worth its precedent. Recorded rather
 * than discovered: it IS a flash, and a student who picks light on a dark
 * machine will see it.
 *
 * ## When the backend lands
 *
 * A theme belongs on the user record, not in one browser -- a student who sets
 * dark on a laptop should not meet light on a phone. `BACKEND.md` carries that
 * note. Until there are accounts there is no user record to put it on, and
 * per-device is a defensible reading of a display preference anyway.
 */

export type ThemeChoice = "system" | "light" | "dark";

/** The three states, in the order the control cycles them. */
export const THEME_ORDER: readonly ThemeChoice[] = ["system", "light", "dark"];

/**
 * Narrow whatever is in storage to a choice.
 *
 * Same shape and same reason as `normalisePrefs`: the input is a browser's
 * `localStorage`, so it can be a half-written string, a number, an object, or a
 * value written by a build that had a fourth state. Anything unrecognised is
 * `system`, which is the correct un-personalised answer rather than a guess.
 *
 * Exported for tests -- it is the only genuinely risky logic in the module.
 */
export function normaliseTheme(stored: unknown): ThemeChoice {
	return stored === "light" || stored === "dark" || stored === "system"
		? stored
		: "system";
}

/**
 * The attribute value for a choice, or `null` for "write no attribute".
 *
 * `system` deliberately produces NO attribute rather than `data-theme="system"`.
 * Absence is what `app.css` reads as "follow the OS", and it is also the markup
 * the server already sends -- so the default state needs no DOM change at all
 * and cannot be got wrong by arriving late.
 */
export function themeAttribute(choice: ThemeChoice): "light" | "dark" | null {
	return choice === "system" ? null : choice;
}

/** What pressing the control once does. Wraps. */
export function nextTheme(current: ThemeChoice): ThemeChoice {
	return THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length];
}

/* --- The store ---------------------------------------------------------- */

const KEY = "value";
const store = createOverrideStore<ThemeChoice>("thrive:theme");

/**
 * The current choice, reactive.
 *
 * Returns `system` before hydration, which is the right un-personalised answer:
 * it is also what the CSS is already doing at that moment.
 */
export const theme = (): ThemeChoice => normaliseTheme(store.values[KEY]);

/** Read outside a reactive context, for event handlers. */
export function readTheme(): ThemeChoice {
	return normaliseTheme(store.read()[KEY]);
}

export function setTheme(choice: ThemeChoice): void {
	// `undefined` for `system`, so choosing the default FORGETS the override
	// rather than storing a third value. Property 4 of the store layer.
	store.set(KEY, choice === "system" ? undefined : choice);
}

/* --- Putting it on the document ----------------------------------------- */

/**
 * Reflect a choice onto `<html>`, and keep the browser chrome with it.
 *
 * DOM code with no runes, so this file stays a plain `.ts` -- the same claim
 * `arrive.ts` makes, and the suffix has to be true in both directions.
 *
 * Called from an `$effect` in the root layout, which is what makes it run after
 * mount and re-run when the store changes. Not called on the server: there is no
 * `document`, and nothing to reflect before hydration anyway.
 *
 * ## The theme-color meta, and why both tags get written
 *
 * `app.html` carries TWO `theme-color` tags, one per `prefers-color-scheme`, so
 * the address bar matches the page with no JavaScript -- the same trick the CSS
 * uses, for the same reason. That covers `system` completely.
 *
 * An explicit choice is the case they cannot cover, because the tag is keyed on
 * the OS preference and the student has just contradicted it. The fix is to
 * write the resolved colour into BOTH tags rather than to add a third unscoped
 * one: a tag with no `media` always matches, so it would win over the pair
 * whenever it appeared first and break the no-JavaScript default. Whichever of
 * the two the browser picks, it now finds the right answer.
 *
 * The colour is READ OFF THE PAGE rather than written here. `body` resolves
 * `--thrive-bg` through the same tokens everything else does, so there is no hex
 * in this file to fall out of step with `app.css` -- and reading it after the
 * attribute is set gets the value the browser actually painted, including the
 * `system` case where neither branch of the choice names a colour at all.
 */
export function applyTheme(choice: ThemeChoice): void {
	const root = document.documentElement;
	const attribute = themeAttribute(choice);

	if (attribute === null) {
		root.removeAttribute("data-theme");
	} else {
		root.setAttribute("data-theme", attribute);
	}

	// Reading a computed style forces the style recalc, so this is the painted
	// background for the attribute just written rather than the previous one.
	const painted = getComputedStyle(document.body).backgroundColor;
	if (!painted) return;

	for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
		meta.setAttribute("content", painted);
	}
}
