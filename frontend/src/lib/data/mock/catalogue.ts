import type { CatalogueCourse } from "../types";

/**
 * THE REAL MSBA CATALOGUE.
 *
 * Course numbers, titles and instructors are the actual ones, transcribed
 * verbatim from the program's course list. This replaced four invented courses
 * ("MGT 142 Machine Learning for Business", "Prof. Nijs" and friends) that were
 * placeholder data from the prototype.
 *
 * ## The years are shifted forward by one, and only the years
 *
 * The source catalogue runs Summer 2025 through Spring 2026. This app's timeline
 * runs Summer 2026 onward, so every term here is the source term plus one year.
 * **The app's timeline was NOT changed to match the catalogue** — the timeline is
 * computed from `programStart` and a track (see `program.ts`), and moving it
 * would move the current phase, the percentage and the finish term with it.
 *
 * ## The terms are the REAL sequence, not an even split
 *
 * An earlier version of this file inferred the grouping by taking the supplied
 * list three at a time, because the list carried no terms. That inference was
 * wrong and is gone: the owner supplied the real mapping and these are it.
 *
 * The shape it produced is worth noting, because it is not what an even split
 * would give and it is a better sanity check than any comment: **Summer 2026
 * holds only ONE core course** (MGTA451) and two electives, while **Fall 2026
 * holds TWO** (MGTA452 and MGTA453). A program that front-loads the applied
 * course and stacks the foundations in the second term is a real curriculum
 * decision; three-cores-then-three-electives was a tidy guess.
 *
 * **If the real catalogue groups them differently, this is the first file to fix
 * but NOT the only one.** An earlier version of this comment claimed nothing else
 * would need to change, which is wrong. The full list, so nobody has to rediscover
 * it:
 *
 *  - `courses.ts` — the three ENROLMENTS are whatever Summer 2026 holds. Change
 *    that term's membership and this file has to follow, including the fabricated
 *    schedule, grade and standing on each row.
 *  - `tasks.ts`, `assignments.ts`, `syllabi.ts`, `resume.ts` — all reference the
 *    three enrolled course ids. They follow `courses.ts`.
 *  - `catalogue.spec.ts` — four assertions encode this grouping rather than a
 *    rule: the exact code ORDER, the capstone's term, `getSuggestedCourses("Fall
 *    2026")`'s contents, and which term has both a core course and an elective.
 *  - `check-interaction.mjs` — opens a specific pip index for the
 *    core-versus-elective check, and matches `MGTA45[23]` on the current term.
 *
 * The things that are REAL RULES and survive any regrouping: every catalogue term
 * must be one the timeline names, and the catalogue must agree with the enrolment
 * fixture on every shared field. Both are asserted, and those are the two that
 * matter.
 *
 * ## EVERY `units` VALUE HERE IS A PLACEHOLDER
 *
 * 4 across the board, and **that is not from the real catalogue** — the course
 * list as supplied carried no unit counts. 4 is the standard MSBA course, so it
 * is a reasonable stand-in, but no row here should be read as transcribed and
 * none should be quoted to a student as fact.
 *
 * ## AND SINCE 2026-08-21 IT HAS A CONSUMER, so correcting it is no longer free
 *
 * The note here used to say "nothing depends on it today". That stopped being
 * true when the degree audit was fixed, and it was also wrong about where the
 * total lived — it said `student.ts`, and `unitsRequired` has always been on
 * `mock/degree.ts`.
 *
 * **`mockDegreeProgress.unitsRequired` is 48, and it is 12 × 4 — this file's
 * twelve rows at this file's placeholder unit value.** So is `electiveRequired`
 * (7 = 12 − 5 core). The derivation is written out in `degree.ts` and asserted by
 * `fixtureConsistency.spec.ts`, which reads the catalogue's own summed units
 * rather than a literal.
 *
 * **So changing a `units` value here changes the degree total.** The gate will go
 * red rather than let the two drift, which is the intended behaviour and not a
 * problem to work around: re-derive `unitsRequired` in `degree.ts` in the same
 * commit. What is no longer available is treating these twelve numbers as inert.
 *
 * The request prefill still sums the three ENROLMENTS from `courses.ts` rather
 * than reading this file, so that path is unaffected.
 *
 * Left as-is deliberately (owner, 2026-08-21 and again 2026-08-22), and flagged
 * here rather than fixed.
 *
 * ## A NOTE THAT IS NOT ABOUT THE DATA
 *
 * These are real people's names, and this app attaches INVENTED grade, progress
 * and standing data to courses (see `courses.ts`). On a public URL that means a
 * real instructor's name can sit beside a fabricated "C+" and "Grade slipped".
 * Recorded deliberately rather than fixed, per the owner — but it is the reason
 * the README says not to share the link outside the team.
 */

/**
 * Core requirements. Everything else in the catalogue is an elective.
 *
 * FIVE, not four. MGTA451 was missing from an earlier version of this list — the
 * count is the reason a test asserts the exact membership rather than the length:
 * a wrong list of four passes any length check for four.
 */
export const CORE_CODES = [
  "MGTA451",
  "MGTA452",
  "MGTA453",
  "MGTA454",
  "MGTA455",
] as const;

export function buildMockCatalogue(): CatalogueCourse[] {
  return [
    // ── Summer 2026 — the term the student is currently in ────────────────
    {
      code: "MGTA464",
      title: "SQL and ETL",
      instructor: "Perols",
      term: "Summer 2026",
      requirement: "elective",
      units: 4,
    },
    {
      code: "MGTA403",
      title: "AI-Assisted Math and Programming for Business Analytics",
      instructor: "Nijs",
      term: "Summer 2026",
      requirement: "elective",
      units: 4,
    },
    {
      code: "MGTA451",
      title: "Business Analytics in Marketing, Finance and Ops",
      instructor: "Buti, Shin, Wilbur",
      term: "Summer 2026",
      requirement: "core",
      units: 4,
    },

    // ── Fall 2026 — the term with two core courses in it ──────────────────
    {
      code: "MGTA453",
      title: "Business Analytics",
      instructor: "August",
      term: "Fall 2026",
      requirement: "core",
      units: 4,
    },
    {
      code: "MGTA461",
      title: "Web Mining and Recommender Systems",
      instructor: "McAuley",
      term: "Fall 2026",
      requirement: "elective",
      units: 4,
    },
    {
      code: "MGTA452",
      title: "Collecting and Analyzing Large Data",
      instructor: "Hansen",
      term: "Fall 2026",
      requirement: "core",
      units: 4,
    },

    // ── Winter 2027 ───────────────────────────────────────────────────────
    {
      code: "MGTA402",
      title: "Data Driven Communications",
      instructor: "Salovey",
      term: "Winter 2027",
      requirement: "elective",
      units: 4,
    },
    {
      code: "MGTA455",
      title: "AI-Assisted Customer Analytics",
      instructor: "Nijs",
      term: "Winter 2027",
      requirement: "core",
      units: 4,
    },
    {
      code: "MGTA444",
      title: "Business Analytics Consulting",
      instructor: "Peterson",
      term: "Winter 2027",
      requirement: "elective",
      units: 4,
    },

    // ── Spring 2027 ───────────────────────────────────────────────────────
    {
      /*
       * No instructor in the source list, and the type allows that rather than
       * requiring a placeholder. A capstone with "TBD" beside it says the same
       * thing as no line at all and takes a row to do it.
       */
      code: "MGTA454",
      title: "Business Analytics Capstone",
      term: "Spring 2027",
      requirement: "core",
      units: 4,
    },
    {
      /*
       * The one code that is not `MGTA` — it is an MGT course cross-listed into
       * the program, and it is transcribed as given rather than normalised.
       * Anything parsing a prefix off a course code would be wrong about this
       * row, which is a reason not to parse prefixes off course codes.
       */
      code: "MGT449",
      title: "Topics in Ops and Tech: GenAI for Business",
      instructor: "Nijs, Teixeira",
      term: "Spring 2027",
      requirement: "elective",
      units: 4,
    },
    {
      code: "MGTA495",
      title: "Special Topics in Business Analytics: Marketing Analytics",
      instructor: "Yavorsky",
      term: "Spring 2027",
      requirement: "elective",
      units: 4,
    },
  ];
}
