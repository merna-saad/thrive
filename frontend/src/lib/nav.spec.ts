import { describe, expect, it } from "vitest";

import {
	allNav,
	isActiveRoute,
	isBuiltRoute,
	isKnownRoute,
	parkedNav,
	primaryNav
} from "./nav";

/**
 * The nav lists, and the two questions a card asks them.
 *
 * `isBuiltRoute` is what decides whether a Home card renders its "View all", so
 * the thing worth pinning is not the four hrefs that happen to be primary today
 * — it is the RELATIONSHIP: primary means linkable, parked means not, and moving
 * an entry between the lists is the whole operation.
 */

describe("the nav lists", () => {
	it("keeps the two lists disjoint", () => {
		// A route in both would make `isBuiltRoute` and `isKnownRoute` disagree about
		// which list won, and the answer would depend on array order.
		const parked = new Set(parkedNav.map((item) => item.href));
		expect(primaryNav.filter((item) => parked.has(item.href))).toEqual([]);
	});

	it("has no duplicate hrefs anywhere", () => {
		const hrefs = allNav.map((item) => item.href);
		expect(hrefs.length).toBe(new Set(hrefs).size);
	});

	it("is the union, in primary-then-parked order", () => {
		expect(allNav).toEqual([...primaryNav, ...parkedNav]);
	});
});

describe("isBuiltRoute", () => {
	it("accepts every primary route", () => {
		// Non-vacuous: if `primaryNav` were empty the loop below would assert nothing.
		expect(primaryNav.length).toBeGreaterThan(0);
		for (const item of primaryNav) {
			expect(isBuiltRoute(item.href)).toBe(true);
		}
	});

	it("rejects every parked route", () => {
		expect(parkedNav.length).toBeGreaterThan(0);
		for (const item of parkedNav) {
			expect(isBuiltRoute(item.href)).toBe(false);
		}
	});

	it("rejects an href in neither list", () => {
		expect(isBuiltRoute("/nope")).toBe(false);
		expect(isBuiltRoute("")).toBe(false);
	});

	it("is exact, never a prefix match", () => {
		/*
		 * The distinction from `isActiveRoute`, which DOES match prefixes so a nested
		 * route keeps its section lit. A prefix match here would call `/calendar/2026`
		 * built, and a card linking there would send someone to a 404 rather than to a
		 * placeholder — a worse failure than the one this function prevents.
		 */
		expect(isBuiltRoute("/calendar/2026")).toBe(false);
		expect(isActiveRoute("/calendar", "/calendar/2026")).toBe(true);
	});

	it("does not treat Home as a prefix of everything", () => {
		// `/` is primary, and a naive `startsWith` would make every route built.
		expect(isBuiltRoute("/")).toBe(true);
		expect(isBuiltRoute("/classes")).toBe(false);
	});
});

describe("isKnownRoute", () => {
	it("accepts primary and parked alike", () => {
		for (const item of allNav) {
			expect(isKnownRoute(item.href)).toBe(true);
		}
	});

	it("separates 'parked on purpose' from 'does not exist'", () => {
		/*
		 * The pair that matters. Both answer false to `isBuiltRoute`, for completely
		 * different reasons, and `SectionCard` warns on only the second — hiding a
		 * link because of a typo is a silent no-op, hiding one because the page is
		 * parked is the feature.
		 */
		expect(isBuiltRoute("/classes")).toBe(false);
		expect(isKnownRoute("/classes")).toBe(true);

		expect(isBuiltRoute("/clases")).toBe(false);
		expect(isKnownRoute("/clases")).toBe(false);
	});
});

describe("what Home's cards link to", () => {
	/*
	 * Not a rendering test — Vitest renders nothing here. This pins the DATA behind
	 * the decision: these are the four destinations Home's cards name, and the
	 * split between them is what a student sees as three cards without a link.
	 *
	 * It is deliberately written to survive a route being built: when `/assignments`
	 * moves into `primaryNav`, this test still passes and the link returns. What it
	 * would catch is a card pointed at an href that is in no list at all.
	 */
	const cardDestinations = ["/assignments", "/calendar", "/classes", "/events"];

	it("names only routes the nav knows about", () => {
		for (const href of cardDestinations) {
			expect(isKnownRoute(href)).toBe(true);
		}
	});

	it("has at least one linkable and at least one parked, so both branches render", () => {
		// A companion assertion: if every destination were parked, "the link is
		// hidden" would be trivially true and prove nothing about the condition.
		expect(cardDestinations.some(isBuiltRoute)).toBe(true);
		expect(cardDestinations.some((href) => !isBuiltRoute(href))).toBe(true);
	});
});
