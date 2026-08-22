import { describe, expect, it } from "vitest";

import { buildMockCatalogue, CORE_CODES } from "./catalogue";
import { buildMockCourses } from "./courses";
import { getSuggestedCourses } from "../providers";
import { buildProgramTimeline } from "./program";

/**
 * The catalogue, and the two joins that will break silently if nobody pins them.
 *
 * Neither is a type error. A term string that does not match the timeline's, or a
 * core code that disagrees between the catalogue and the enrolment fixture, both
 * compile fine and show as an empty panel or a mislabelled row.
 */
describe("the real MSBA catalogue", () => {
  const catalogue = buildMockCatalogue();

  it("holds the twelve courses, with their real numbers", () => {
    expect(catalogue).toHaveLength(12);
    expect(catalogue.map((c) => c.code)).toEqual([
      "MGTA452",
      "MGTA453",
      "MGTA461",
      "MGTA464",
      "MGTA403",
      "MGTA451",
      "MGTA402",
      "MGTA455",
      "MGTA444",
      "MGTA454",
      "MGTA495",
      "MGT449",
    ]);
  });

  /*
   * MGT449 is cross-listed and is NOT an MGTA code. Pinned because a regex
   * expecting `MGTA` somewhere in the app would be wrong about exactly this row,
   * and would be wrong quietly.
   */
  it("keeps the one non-MGTA code as written", () => {
    const codes = catalogue.map((c) => c.code);
    expect(codes.filter((c) => !c.startsWith("MGTA"))).toEqual(["MGT449"]);
  });

  it("marks exactly the four core courses as core", () => {
    const core = catalogue.filter((c) => c.requirement === "core").map((c) => c.code);
    expect(core).toEqual([...CORE_CODES].sort((a, b) => codeOrder(catalogue, a, b)));
    expect(core.sort()).toEqual([...CORE_CODES].sort());
  });

  /*
   * THE JOIN. Every catalogue term has to be a term the timeline actually names,
   * or the panel for it can never open. `buildProgramTimeline` is the authority.
   */
  it("uses only terms the program timeline names", () => {
    const timeline = buildProgramTimeline("2026-08-03", "17 month", new Date(2026, 7, 21));
    const known = new Set(timeline.phases.map((phase) => phase.term));

    for (const course of catalogue) {
      expect(known, `${course.code} is in "${course.term}"`).toContain(course.term);
    }
  });

  /*
   * THE OTHER JOIN. The three enrolments have to agree with the catalogue about
   * their own title, instructor, term and requirement -- they are two fixtures
   * describing the same three courses, and Home renders one while the strip
   * renders the other.
   */
  it("agrees with the enrolment fixture on every shared field", () => {
    const byCode = new Map(catalogue.map((c) => [c.code, c]));

    for (const course of buildMockCourses()) {
      const entry = byCode.get(course.code);
      expect(entry, `${course.code} is missing from the catalogue`).toBeDefined();
      expect(entry!.title).toBe(course.title);
      expect(entry!.instructor).toBe(course.instructor);
      expect(entry!.term).toBe(course.term);
      expect(entry!.requirement).toBe(course.requirement);
    }
  });

  it("puts the capstone in the final catalogue term and gives it no instructor", () => {
    const capstone = catalogue.find((c) => c.code === "MGTA454")!;
    expect(capstone.term).toBe("Spring 2027");
    expect(capstone.instructor).toBeUndefined();
  });
});

describe("getSuggestedCourses", () => {
  it("returns the catalogue's courses for a term", async () => {
    const fall = await getSuggestedCourses("Fall 2026");
    expect(fall.map((c) => c.code)).toEqual(["MGTA464", "MGTA403", "MGTA451"]);
  });

  /* A core course needs no recommendation: `requirement` already says why. */
  it("gives a reason to electives and none to core courses", async () => {
    const winter = await getSuggestedCourses("Winter 2027");

    const core = winter.filter((c) => c.requirement === "core");
    const electives = winter.filter((c) => c.requirement === "elective");

    expect(core.length).toBeGreaterThan(0);
    expect(electives.length).toBeGreaterThan(0);
    for (const course of core) expect(course.reason).toBeUndefined();
    for (const course of electives) expect(course.reason).toBeTruthy();
  });

  /*
   * An unknown term is an empty list, not a throw. A term with nothing scheduled
   * and a term that does not exist are the same answer from the student's side,
   * and a throw would take Home down over a typo.
   */
  it("returns an empty array for a term it has nothing for", async () => {
    await expect(getSuggestedCourses("Winter 2099")).resolves.toEqual([]);
    await expect(getSuggestedCourses("")).resolves.toEqual([]);
  });

  /* The companion presence assertion, so the three empty cases above cannot pass
     on a provider that returns nothing at all. */
  it("is not simply returning empty for everything", async () => {
    await expect(getSuggestedCourses("Spring 2027")).resolves.toHaveLength(3);
  });

  it("returns a Promise, like every other provider", () => {
    expect(getSuggestedCourses("Fall 2026")).toBeInstanceOf(Promise);
  });
});

/** Catalogue order, so the core assertion can compare without sorting noise. */
function codeOrder(
  catalogue: ReturnType<typeof buildMockCatalogue>,
  a: string,
  b: string,
): number {
  const index = (code: string) => catalogue.findIndex((c) => c.code === code);
  return index(a) - index(b);
}
