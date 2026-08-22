import type { DegreeProgress } from "../types";

/**
 * Degree audit numbers.
 *
 * There is deliberately no `expectedCompletion` here. The Next fixture carried
 * a hardcoded "Spring 2027" while `buildProgramTimeline` derived Fall 2027 for
 * the same student -- two answers to one question, with nothing on screen to
 * reveal the disagreement because the field rendered nowhere. See MIGRATION.md
 * section 9 defect 9. The finish term is derived: read
 * `ProgramTimeline.expectedFinishTerm`.
 *
 * ## EVERY NUMBER HERE WAS WRONG, AND THEY DESCRIBED A DIFFERENT STUDENT
 *
 * Fixed 2026-08-21. The fixture said `unitsCompleted: 38` of 52 while the same
 * page said "Summer 2026 · you are here" and "4% through your program". A
 * student 18 days into a 17-month program has not banked 38 units. The numbers
 * were plausible in isolation and contradictory side by side, which is the only
 * way this kind of bug survives.
 *
 * ### How the count is DERIVED, rather than picked
 *
 * The timeline is the authority on where the student is, and the catalogue is
 * the authority on what a term is worth. Neither is guessed at:
 *
 *  1. `buildProgramTimeline("2026-08-03", "17 month")` puts today inside the
 *     FIRST phase. Exactly one phase is `current` and five are `upcoming`, so
 *     **no phase is `complete`**.
 *  2. Units are earned by finishing a course. Every enrolment in `courses.ts` is
 *     in Summer 2026 -- the current phase -- and each carries a progress figure
 *     of 72, 60 and 45. **In progress, none finished.**
 *  3. Completed courses is therefore 0, in core and in electives alike, and
 *     `unitsCompleted` is **0**.
 *
 * 0 of 52 against "4% through your program" is coherent: 4% is elapsed CALENDAR
 * time, and a student three weeks in has spent some of the clock without yet
 * closing out a course. The old 38 claimed 73% of the degree in 4% of the time.
 *
 * ### The requirement totals came from the catalogue for the same reason
 *
 * `unitsRequired: 52` implied THIRTEEN four-unit courses. The catalogue holds
 * twelve, three in each of the four terms it covers, and a student taking three
 * a term takes all of them -- so the thirteenth course did not exist anywhere.
 * Likewise `coreRequired: 9` against a `CORE_CODES` of five, and
 * `electiveRequired: 4` against seven electives in the catalogue.
 *
 *     coreRequired      5   = CORE_CODES.length, which is itself asserted
 *     electiveRequired  7   = catalogue.length - CORE_CODES.length
 *     unitsRequired    48   = 12 courses x 4 units
 *
 * **THAT 48 RESTS ON A PLACEHOLDER.** Every `units` value in `catalogue.ts` is 4
 * because the real course list carried no unit counts -- it says so at the top of
 * that file. So 48 is the right number *given the fixtures we have*, and it is
 * the first thing to re-derive if real unit counts ever arrive. It is recorded
 * as derived rather than transcribed for exactly that reason.
 *
 * ### `track` disagreed with the student
 *
 * It said `"11 month"` while `student.ts` says `"17 month"` and the timeline is
 * built from the student's. Nothing rendered this copy, so the disagreement was
 * invisible -- the same shape as the `expectedCompletion` defect above, and the
 * reason that one was deleted rather than corrected. This one is kept because
 * `DegreeProgress.track` is part of the type the backend will fill, but it is a
 * SECOND answer to a question `student.track` already answers. If it ever starts
 * rendering, delete it instead.
 *
 * `fixtureConsistency.spec.ts` pins all of this as relationships rather than as
 * numbers. A test asserting `38` would have passed on the bug.
 */
export const mockDegreeProgress: DegreeProgress = {
  /* No phase is complete, so no course is finished. See the derivation above. */
  unitsCompleted: 0,
  /* 12 catalogue courses x 4 placeholder units. */
  unitsRequired: 48,
  coreDone: 0,
  /* CORE_CODES.length. */
  coreRequired: 5,
  electiveDone: 0,
  /* catalogue.length - CORE_CODES.length. */
  electiveRequired: 7,
  track: "17 month",
  gaps: [
    {
      /*
       * REWRITTEN, because the old text described a program this one is not.
       * It said "Two electives still unplanned -- two elective slots are open
       * and neither is chosen yet". The catalogue fixes the sequence: Fall 2026
       * holds MGTA452 and MGTA453 (both core) plus MGTA461, and there is no
       * unchosen slot anywhere in it. The honest gap for a first-term student is
       * that none of it is registered yet.
       */
      id: "gap-001",
      label: "Fall courses not yet registered",
      detail:
        "Fall 2026 holds MGTA452 and MGTA453 plus MGTA461. Registration opens soon and none of the three is confirmed.",
      severity: "watch",
    },
    {
      /*
       * Kept as written. MGTA454 is the Spring 2027 capstone, three terms out,
       * and a sponsor date that is not yet confirmed is a true statement about a
       * student in their first term rather than a contradiction. `onTrack`
       * severity is what says "this is not urgent".
       */
      id: "gap-002",
      label: "Capstone deliverable not yet scheduled",
      detail:
        "The sponsor presentation date has not been confirmed with the team.",
      severity: "onTrack",
    },
  ],
};
