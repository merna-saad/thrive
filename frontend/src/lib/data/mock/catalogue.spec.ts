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

  /*
   * ENCODED THE OLD INFERENCE. The file is ordered by term, so this list changed
   * when the real grouping replaced the even three-per-term split. Kept as an
   * exact list rather than relaxed to a set: the order IS the term sequence, and
   * a course silently moving term is the thing most worth noticing here.
   */
  it("holds the twelve courses, in term order, with their real numbers", () => {
    expect(catalogue).toHaveLength(12);
    expect(catalogue.map((c) => c.code)).toEqual([
      // Summer 2026
      "MGTA464",
      "MGTA403",
      "MGTA451",
      // Fall 2026
      "MGTA453",
      "MGTA461",
      "MGTA452",
      // Winter 2027
      "MGTA402",
      "MGTA455",
      "MGTA444",
      // Spring 2027
      "MGTA454",
      "MGT449",
      "MGTA495",
    ]);
  });

  /*
   * A REAL RULE, and the one that makes the grouping checkable at all: each term
   * holds exactly three courses. Not an assumption about WHICH three.
   */
  it("puts three courses in each of the four terms", () => {
    const byTerm = new Map<string, number>();
    for (const course of catalogue) {
      byTerm.set(course.term, (byTerm.get(course.term) ?? 0) + 1);
    }
    expect([...byTerm.entries()]).toEqual([
      ["Summer 2026", 3],
      ["Fall 2026", 3],
      ["Winter 2027", 3],
      ["Spring 2027", 3],
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

  /*
   * FIVE, and asserted as exact MEMBERSHIP rather than as a length.
   *
   * The list was wrong once -- it had four codes and was missing MGTA451 -- and a
   * wrong list of four satisfies any check that only counts to four. Sorted on
   * both sides so this says nothing about order, which the test above owns.
   */
  it("marks exactly the five core courses as core", () => {
    const core = catalogue
      .filter((c) => c.requirement === "core")
      .map((c) => c.code)
      .sort();

    expect(core).toEqual([...CORE_CODES].sort());
    expect(core).toHaveLength(5);
  });

  /* The companion: everything not in that list is an elective, with none left
     unclassified. `requirement` is required by the type, so this is really
     asserting that nobody widened the union without revisiting the fixture. */
  it("marks everything else elective, and nothing else", () => {
    const electives = catalogue.filter((c) => c.requirement === "elective");
    expect(electives).toHaveLength(catalogue.length - 5);
    for (const course of electives) {
      expect(CORE_CODES).not.toContain(course.code);
    }
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

  /*
   * Survived the regrouping unchanged, which is worth a word: under the inferred
   * split this was a CONSEQUENCE of taking the list three at a time, and the
   * capstone landing last was the coincidence that made the inference look right.
   * It is now the real mapping saying the same thing.
   */
  it("puts the capstone in the final catalogue term and gives it no instructor", () => {
    const capstone = catalogue.find((c) => c.code === "MGTA454")!;
    expect(capstone.term).toBe("Spring 2027");
    expect(capstone.instructor).toBeUndefined();
  });
});

describe("getSuggestedCourses", () => {
  /* ENCODED THE OLD INFERENCE. Fall 2026 is a different three under the real
     mapping -- and it is now the term with TWO core courses in it. */
  it("returns the catalogue's courses for a term", async () => {
    const fall = await getSuggestedCourses("Fall 2026");
    expect(fall.map((c) => c.code)).toEqual(["MGTA453", "MGTA461", "MGTA452"]);
  });

  /*
   * A core course needs no recommendation: `requirement` already says why.
   *
   * Winter 2027 is used because it holds both, and it still does under the real
   * mapping -- MGTA455 core against MGTA402 and MGTA444. The assertions below
   * check the split rather than trusting the term, so this survives a regrouping
   * that keeps any mixed term.
   */
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
   * A REAL RULE, and the one that would have caught a dead reason: every elective
   * in the catalogue gets a sentence, and no core course does. The reasons map is
   * keyed by code and nothing checks it against the catalogue, so an entry for a
   * course that is core -- or a missing entry for an elective -- is invisible.
   */
  it("has a reason for every elective in the catalogue, and none for any core", async () => {
    const terms = ["Summer 2026", "Fall 2026", "Winter 2027", "Spring 2027"];
    const all = (await Promise.all(terms.map((term) => getSuggestedCourses(term)))).flat();

    expect(all).toHaveLength(12);
    for (const course of all) {
      if (course.requirement === "core") {
        expect(course.reason, `${course.code} is core`).toBeUndefined();
      } else {
        expect(course.reason, `${course.code} is an elective`).toBeTruthy();
      }
    }
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
