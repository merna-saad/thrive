import { afterEach, describe, expect, it, vi } from "vitest";

import { installStorage, uninstallStorage, type FakeStorage } from "$lib/testing/fakeStorage";

/**
 * The theme store: normalisation, the cycle, and what gets persisted.
 *
 * What is NOT here, deliberately: whether pressing the control repaints the page,
 * and whether the choice survives a reload. Vitest renders nothing in this repo
 * (no jsdom, a standing decision), so neither is visible from here -- both live in
 * `check:interaction`, which drives a real browser and reads a used colour off
 * `body`. A test here that asserted "the attribute would be set" would be
 * asserting a model of the DOM rather than the DOM.
 *
 * What IS here is the part that is pure logic and the part that decides what
 * lands in `localStorage`, which is where the store layer's four properties are
 * either honoured or quietly broken.
 */

let storage: FakeStorage;

async function fresh(seed: Record<string, string> = {}) {
	vi.resetModules();
	storage = installStorage(seed);
	return await import("$lib/theme");
}

afterEach(() => {
	uninstallStorage();
});

describe("normaliseTheme", () => {
	it("accepts the three real choices", async () => {
		const { normaliseTheme } = await fresh();

		expect(normaliseTheme("system")).toBe("system");
		expect(normaliseTheme("light")).toBe("light");
		expect(normaliseTheme("dark")).toBe("dark");
	});

	it("falls back to `system` for anything a browser could actually hold", async () => {
		const { normaliseTheme } = await fresh();

		// The input is whatever is in someone's localStorage: hand-edited, half
		// written, or written by a build that had a different set of states. Same
		// reasoning as `normalisePrefs`.
		for (const rubbish of [
			undefined,
			null,
			"",
			"Dark",
			"DARK",
			" dark",
			"sepia",
			0,
			1,
			true,
			[],
			["dark"],
			{},
			{ value: "dark" },
		]) {
			expect(normaliseTheme(rubbish), `${JSON.stringify(rubbish)}`).toBe("system");
		}
	});
});

describe("the cycle", () => {
	it("goes system -> light -> dark and wraps", async () => {
		const { nextTheme } = await fresh();

		expect(nextTheme("system")).toBe("light");
		expect(nextTheme("light")).toBe("dark");
		expect(nextTheme("dark")).toBe("system");
	});

	it("reaches every state from every state", async () => {
		const { nextTheme, THEME_ORDER } = await fresh();

		// A cycle that skipped a state, or looped between two of three, would still
		// satisfy the three assertions above if they were written less carefully.
		// This is the property: three presses from anywhere is a round trip, and
		// the three states seen on the way are all of them.
		for (const start of THEME_ORDER) {
			const seen = new Set([start]);
			let at = start;
			for (let press = 0; press < 3; press += 1) {
				at = nextTheme(at);
				seen.add(at);
			}
			expect(at, `three presses from ${start} should return to ${start}`).toBe(start);
			expect([...seen].sort()).toEqual([...THEME_ORDER].sort());
		}
	});
});

describe("themeAttribute", () => {
	it("gives `system` NO attribute rather than the word", async () => {
		const { themeAttribute } = await fresh();

		// This is the whole first-paint design in one assertion. Absence is what
		// app.css reads as "follow the OS", and it is also the markup the server
		// already sends -- so the default state needs no DOM change and cannot be
		// got wrong by arriving late. `data-theme="system"` would match neither of
		// the two selectors in app.css and would silently pin nothing.
		expect(themeAttribute("system")).toBeNull();
		expect(themeAttribute("light")).toBe("light");
		expect(themeAttribute("dark")).toBe("dark");
	});
});

describe("the theme store", () => {
	it("is `system` before hydration, whatever is stored", async () => {
		// Property 2: empty on the server, real after mount. The un-personalised
		// answer has to be `system`, because that is what the CSS is doing at that
		// moment anyway.
		const theme = await fresh({ "thrive:theme": '{"value":"dark"}' });

		expect(theme.theme()).toBe("system");
	});

	it("reads the student's choice once hydrated", async () => {
		const theme = await fresh({ "thrive:theme": '{"value":"dark"}' });
		const { hydrateStores } = await import("$lib/overrideStore.svelte");

		hydrateStores();

		expect(theme.theme()).toBe("dark");
		expect(theme.readTheme()).toBe("dark");
	});

	it("persists a choice under the key and shape it claims", async () => {
		const theme = await fresh();

		theme.setTheme("dark");

		// PIN THE STORED KEY, NEVER ROUND-TRIP. A store that mangles on write and
		// mangles identically on read is perfectly self-consistent about a key
		// nothing else uses -- and `check:interaction` reads this same literal from
		// the other side, in a real browser. Both sides hardcode it on purpose, so
		// they cannot agree by sharing a transformation.
		expect(storage.dump()["thrive:theme"]).toBe('{"value":"dark"}');
	});

	it("FORGETS the override when the student chooses `system`", async () => {
		const theme = await fresh({ "thrive:theme": '{"value":"dark"}' });
		const { hydrateStores } = await import("$lib/overrideStore.svelte");
		hydrateStores();

		theme.setTheme("system");

		// Property 4: a write matching the source value forgets the override. So a
		// student who cycles all the way round leaves nothing behind, and the
		// persisted state of the default is the same as a fresh browser's.
		expect(theme.theme()).toBe("system");
		expect(JSON.parse(storage.dump()["thrive:theme"])).toEqual({});
	});

	it("survives a corrupt stored value without taking the page down", async () => {
		// Property 3. Each of these is a real thing a localStorage can hold.
		for (const raw of ["{broken", '["dark"]', "null", '{"value":"sepia"}', '"dark"']) {
			const theme = await fresh({ "thrive:theme": raw });
			const { hydrateStores } = await import("$lib/overrideStore.svelte");

			expect(() => hydrateStores()).not.toThrow();
			expect(theme.theme(), raw).toBe("system");
		}
	});

	it("still holds the choice for this session when writes fail", async () => {
		// Private mode, or out of quota. The in-memory value keeps the edit rather
		// than silently discarding it, which is the store layer's behaviour and is
		// worth pinning here because a theme is the one preference a student will
		// change again immediately if it appears not to work.
		const theme = await fresh();
		storage.failWrites();

		expect(() => theme.setTheme("dark")).not.toThrow();
		expect(theme.theme()).toBe("dark");
	});

	it("is `system` on the server, where there is no storage at all", async () => {
		vi.resetModules();
		uninstallStorage();
		const theme = await import("$lib/theme");
		const { hydrateStores } = await import("$lib/overrideStore.svelte");

		expect(() => hydrateStores()).not.toThrow();
		expect(theme.theme()).toBe("system");
	});
});
