import { describe, expect, it } from "vitest";

import { buildMockCatalogue, CORE_CODES } from "./catalogue";
import { buildMockCourses } from "./courses";
import { mockDegreeProgress } from "./degree";
import { buildProgramTimeline } from "./program";
import { mockStudent } from "./student";

/**
 * HOME'S NUMBERS DESCRIBE ONE STUDENT, and this file is what says so.
 *
 * Four fixtures land on Home within about 200 pixels of each other -- the
 * timeline strip, the greeting panel, the degree chips and the top bar -- and
 * each was written at a different time. Nothing typed them together, so they
 * drifted into describing three different students:
 *
 *   - `degree.unitsCompleted: 38` of 52, beside "4% through your program"
 *   - `student.currentTerm: "Fall 2026"`, beside "Summer 2026 · you are here"
 *   - `student.standingSummary` naming "Data Visualization", a course deleted
 *     when the real catalogue landed
 *   - `degree.track: "11 month"`, beside a 17-month timeline
 *
 * ## WHY EVERY ASSERTION HERE IS A RELATIONSHIP
 *
 * The obvious test is `expect(degree.unitsCompleted).toBe(0)`. It would be green
 * today and it would have been green on `38` too, had it been written when 38 was
 * the fixture -- a literal pins whatever was there when someone looked. What
 * catches this class of bug is deriving the expected value from the OTHER fixture
 * and letting the two argue.
 *
 * So: the timeline decides where the student is, the catalogue decides what a
 * term is worth, and everything else has to agree with them. Change the start
 * date, the track, or a term's membership and these tests follow without an edit.
 *
 * ## Verified to fail, by restoring each original value in turn
 *
 *     unitsCompleted: 38      3 red
 *     unitsRequired: 52       2 red
 *     coreRequired: 9         2 red
 *     track: "11 month"       1 red
 *     currentTerm: "Fall 2026"  2 red
 *     summary: "Data Visualization…"  2 red
 *
 * The last one is the interesting entry -- see the note above that assertion. It
 * goes red for a reason other than the one the code appears to give, and the
 * counterfactual is what established that rather than my reading of it.
 */

/*
 * The fixture's own clock. Every date-shaped assertion in this repo pins `now`
 * rather than reading the wall clock -- see CONVENTIONS.md. 2026-08-21 is the day
 * the rest of the suite anchors on.
 */
const NOW = new Date(2026, 7, 21);

const timeline = () =>
  buildProgramTimeline(mockStudent.programStart, mockStudent.track, NOW);

const catalogue = buildMockCatalogue();

/** Units a student could have banked by `now`: everything in a COMPLETE term. */
function earnableUnits(at: Date): number {
  const completed = new Set(
    buildProgramTimeline(mockStudent.programStart, mockStudent.track, at)
      .phases.filter((phase) => phase.status === "complete")
      .map((phase) => phase.term),
  );

  return catalogue
    .filter((course) => completed.has(course.term))
    .reduce((total, course) => total + course.units, 0);
}

describe("the student's position in the timeline", () => {
  it("is the first term, with nothing behind it", () => {
    // Not an assertion about the fixture so much as the premise the rest of this
    // file rests on. If this ever goes red, the numbers below are being checked
    // against a student who has moved and the derivations need re-reading.
    const phases = timeline().phases;

    expect(phases.filter((phase) => phase.status === "current")).toHaveLength(1);
    expect(phases.filter((phase) => phase.status === "complete")).toHaveLength(0);
    expect(phases[0].status).toBe("current");
  });

  it("names its current term, and names the phase that is current", () => {
    /*
     * `currentTerm` replaced `Student.currentTerm`, which said "Fall 2026" while
     * the timeline put the student in Summer 2026 (see `mock/student.ts`). This
     * is not the same assertion the old one was: there is no second field left to
     * disagree, so what is checked now is that the DERIVATION is coherent —
     * `currentTerm` and `currentPhaseId` must name the same phase.
     *
     * Worth keeping even though both come from one variable in
     * `buildProgramTimeline`. That is true today; the assertion is what makes it
     * still true after somebody adds a second way to compute either.
     */
    const t = timeline();
    const current = t.phases.find((phase) => phase.status === "current");

    expect(current).toBeDefined();
    expect(t.currentPhaseId).toBe(current!.id);
    expect(t.currentTerm).toBe(current!.term);
  });

  it("agrees with the term the enrolments are in", () => {
    // The assertion the "wrong Summer courses" report was really about: the
    // courses the student is taking must be the courses of the term the student
    // is in. This is the one that now carries the weight, because the term the
    // top bar renders IS `timeline.currentTerm` rather than a copy of it.
    const terms = new Set(buildMockCourses().map((course) => course.term));

    expect([...terms]).toEqual([timeline().currentTerm]);
  });

  it("takes its track from the student and nowhere else", () => {
    /*
     * `DegreeProgress.track` used to sit beside this and said "11 month" while
     * the student said "17 month". It was deleted on 2026-08-22 rather than
     * corrected again, so there is one fewer thing to assert here — which is the
     * point. **The best outcome for a consistency test is that it gets shorter.**
     */
    expect(timeline().track).toBe(mockStudent.track);
  });
});

describe("completed units against the timeline", () => {
  /*
   * THE ASSERTION THIS FILE EXISTS FOR.
   *
   * A student cannot have banked units from a term that has not finished. The
   * ceiling is computed from the timeline and the catalogue, so `38` fails and so
   * would any other number that outruns the student's position.
   */
  it("never exceeds what the completed terms could have awarded", () => {
    const ceiling = earnableUnits(NOW);

    expect(mockDegreeProgress.unitsCompleted).toBeLessThanOrEqual(ceiling);
  });

  it("and today that ceiling is zero, so the count is zero", () => {
    // The strict form of the same rule, true while the fixture's student is in
    // their first term. It is separate from the assertion above on purpose: that
    // one survives the student moving through the program, this one is the sharp
    // version for where they are now.
    expect(earnableUnits(NOW)).toBe(0);
    expect(mockDegreeProgress.unitsCompleted).toBe(earnableUnits(NOW));
  });

  it("can see a non-zero ceiling, so the zero above is not vacuous", () => {
    /*
     * The companion. Both assertions above are satisfied by a derivation that
     * always returns 0 -- a typo in `earnableUnits` that never matched a term
     * would make this whole describe block permanently green.
     *
     * A year later, four of the six phases are complete and the catalogue's four
     * terms are behind the student, so the ceiling is the whole 48.
     */
    const later = earnableUnits(new Date(2027, 7, 21));

    expect(later).toBeGreaterThan(0);
    expect(later).toBe(mockDegreeProgress.unitsRequired);
  });

  it("counts no finished course while every enrolment is still in progress", () => {
    // The other route to the same number, from `courses.ts` instead of the
    // timeline. Every enrolment carries a progress figure under 100, so nothing
    // is finished and the core and elective tallies are both zero.
    const courses = buildMockCourses();

    expect(courses.length).toBeGreaterThan(0);
    for (const course of courses) {
      expect(course.progress, `${course.code} is finished`).toBeLessThan(100);
    }

    expect(mockDegreeProgress.coreDone).toBe(0);
    expect(mockDegreeProgress.electiveDone).toBe(0);
  });

  it("keeps the done tallies consistent with the unit count", () => {
    // Whatever the numbers become, these two ways of saying "how far in" must
    // agree. Uses the catalogue's own unit value rather than a literal 4.
    const perCourse = catalogue[0].units;
    const done = mockDegreeProgress.coreDone + mockDegreeProgress.electiveDone;

    expect(done * perCourse).toBe(mockDegreeProgress.unitsCompleted);
  });
});

describe("the degree requirement against the catalogue", () => {
  it("requires exactly the core courses the catalogue marks core", () => {
    expect(mockDegreeProgress.coreRequired).toBe(CORE_CODES.length);
  });

  it("requires every catalogue course, split into core and elective", () => {
    // `unitsRequired: 52` implied a thirteenth four-unit course that existed
    // nowhere. Derived from the catalogue, the total cannot invent a course.
    const { coreRequired, electiveRequired } = mockDegreeProgress;

    expect(coreRequired + electiveRequired).toBe(catalogue.length);
    expect(electiveRequired).toBe(catalogue.length - CORE_CODES.length);
  });

  it("totals the units the catalogue actually adds up to", () => {
    const total = catalogue.reduce((sum, course) => sum + course.units, 0);

    expect(mockDegreeProgress.unitsRequired).toBe(total);
  });

  it("cannot report more progress than the degree requires", () => {
    expect(mockDegreeProgress.unitsCompleted).toBeLessThanOrEqual(
      mockDegreeProgress.unitsRequired,
    );
  });
});

describe("the greeting's standing summary", () => {
  /*
   * WHAT THIS CATCHES, AND HOW -- WHICH IS NOT THE WAY IT LOOKS.
   *
   * The obvious reading is that it compares named codes against the enrolment
   * list, so it would miss a course TITLE. The bug it was written for was exactly
   * a title: "Data Visualization", `MGT 253` in the invented set the real
   * catalogue replaced.
   *
   * It catches it anyway, and the counterfactual is how I know rather than the
   * reasoning -- restoring the old sentence turns this block 2 red. The mechanism
   * is the `toBeGreaterThan(0)` line, not the loop: a summary naming a course by
   * title contains NO code-shaped token, so it fails for having named nothing
   * checkable. The loop then catches the other shape, a wrong code -- and note the
   * pattern allows a space, so the old `MGT 253` form would be caught as
   * not-enrolled too.
   *
   * So the rule this really enforces is **name a course by its code in fixture
   * prose**, which is checkable, where "do not name a course that does not exist"
   * is not. Matching titles was considered and is unwriteable in the direction
   * that matters: it means scanning a sentence for any title that has EVER
   * existed, and deleted fixtures leave no list behind.
   */
  it("names only courses the student is actually enrolled in", () => {
    const enrolled = new Set(buildMockCourses().map((course) => course.code));
    const mentioned = mockStudent.standingSummary.match(/MGTA?\s?\d{3}/g) ?? [];

    expect(mentioned.length, "no course code found in the summary").toBeGreaterThan(0);
    for (const code of mentioned) {
      expect(enrolled, `the summary names ${code}`).toContain(code);
    }
  });

  it("names the course that is actually in trouble", () => {
    // The summary says a course "has slipped". The one enrolment with
    // `needsHelp` standing is the only one that claim can honestly be about, and
    // `courses.ts` keeps exactly one course in trouble on purpose.
    const struggling = buildMockCourses().filter(
      (course) => course.standing === "needsHelp",
    );

    expect(struggling).toHaveLength(1);
    expect(mockStudent.standingSummary).toContain(struggling[0].code);
  });
});
