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
 * ## The term assignment is INFERRED, and that is the one soft fact here
 *
 * The course list as supplied carried no terms — twelve courses, no groupings.
 * These are assigned three per term in the order the list gave them, across the
 * four terms the source catalogue spans. That ordering is consistent with the
 * two things that can be checked: the capstone lands in the final term, and the
 * two foundational core courses land in the first.
 *
 * **If the real catalogue groups them differently, this is the file to fix and
 * nothing else needs to change** — the suggestions provider reads terms from
 * here, and `Course` (the enrolment shape) only ever holds the current term.
 *
 * ## Units are not from the source list either
 *
 * The list gave no unit counts. 4 is the standard MSBA course, and
 * `student.ts`'s `unitsRequired` is what actually drives the degree percentage,
 * so nothing here is load-bearing for that figure. Marked so nobody reads it as
 * transcribed.
 *
 * ## A NOTE THAT IS NOT ABOUT THE DATA
 *
 * These are real people's names, and this app attaches INVENTED grade, progress
 * and standing data to courses (see `courses.ts`). On a public URL that means a
 * real instructor's name can sit beside a fabricated "C+" and "Grade slipped".
 * Recorded deliberately rather than fixed, per the owner — but it is the reason
 * the README says not to share the link outside the team.
 */

/** Core requirements. Everything else in the catalogue is an elective. */
export const CORE_CODES = ["MGTA452", "MGTA453", "MGTA454", "MGTA455"] as const;

export function buildMockCatalogue(): CatalogueCourse[] {
  return [
    // ── Summer 2026 — the term the student is currently in ────────────────
    {
      code: "MGTA452",
      title: "Collecting and Analyzing Large Data",
      instructor: "Hansen",
      term: "Summer 2026",
      requirement: "core",
      units: 4,
    },
    {
      code: "MGTA453",
      title: "Business Analytics",
      instructor: "August",
      term: "Summer 2026",
      requirement: "core",
      units: 4,
    },
    {
      code: "MGTA461",
      title: "Web Mining and Recommender Systems",
      instructor: "McAuley",
      term: "Summer 2026",
      requirement: "elective",
      units: 4,
    },

    // ── Fall 2026 ─────────────────────────────────────────────────────────
    {
      code: "MGTA464",
      title: "SQL and ETL",
      instructor: "Perols",
      term: "Fall 2026",
      requirement: "elective",
      units: 4,
    },
    {
      code: "MGTA403",
      title: "AI-Assisted Math and Programming for Business Analytics",
      instructor: "Nijs",
      term: "Fall 2026",
      requirement: "elective",
      units: 4,
    },
    {
      code: "MGTA451",
      title: "Business Analytics in Marketing, Finance and Ops",
      instructor: "Buti, Shin, Wilbur",
      term: "Fall 2026",
      requirement: "elective",
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
      code: "MGTA495",
      title: "Special Topics in Business Analytics: Marketing Analytics",
      instructor: "Yavorsky",
      term: "Spring 2027",
      requirement: "elective",
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
  ];
}
