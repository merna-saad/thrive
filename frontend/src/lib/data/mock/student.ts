import type { Student } from "../types";

/**
 * ## TWO FIELDS HERE HELD THE PRE-CATALOGUE FIXTURE, AND BOTH RENDERED
 *
 * Fixed 2026-08-21. This is the file the real-catalogue work (`fd547d8`,
 * `37c1cd1`) did not reach: it replaced `courses.ts` and `catalogue.ts` and left
 * two stale strings here, both of which were on Home.
 *
 * **`currentTerm` said "Fall 2026"** while the timeline put today in the FIRST
 * phase, whose term is Summer 2026 -- so the top bar named one term and the
 * strip three lines below it named another. Read the bar and the student's
 * current term was Fall 2026, whose courses are MGTA452, MGTA453 and MGTA461,
 * which is exactly the "Home is showing the wrong Summer courses" report. The
 * enrolment fixture and the catalogue were both correct and agreed with each
 * other the whole time; this string is what disagreed with them.
 *
 * **THE FIELD IS GONE AS OF 2026-08-22** (owner, approved as a behaviour
 * change), which is the actual fix rather than the correction. It was a second
 * answer to a question `buildProgramTimeline` already answers -- the same defect
 * `degree.ts` had with `expectedCompletion`, and `degree.track` had with the
 * line below. Read `ProgramTimeline.currentTerm`; `TopBar` does.
 *
 * > Correcting a duplicated truth buys one release. Deleting it is the only
 * > thing that stops it drifting again.
 *
 * **`standingSummary` named "Data Visualization".** That was `MGT 253` in the
 * invented four-course set the real catalogue replaced. There is no course by
 * that title in the catalogue or the enrolments, so the greeting panel was
 * telling the student a course they are not taking had slipped. It now names
 * MGTA403, which is the one enrolment carrying `standing: "needsHelp"` and the
 * nudge -- see `courses.ts`, where exactly one course being in trouble is the
 * deliberate shape.
 *
 * **That one could NOT be deleted**, and the difference is worth noting. A
 * standing summary is prose a human (or a model) writes about this student; it
 * is not derivable from anything. So it is corrected and then GATED -- see
 * `fixtureConsistency.spec.ts`, which requires it to name a course the student is
 * actually enrolled in. Derive what you can; gate what you cannot.
 */
export const mockStudent: Student = {
  id: "stu-001",
  name: "Merna",
  goal: "Data Scientist",
  track: "17 month",
  program: "MSBA",
  standing: "onTrack",
  standingSummary:
    "On pace overall. MGTA403 has slipped and is worth your attention this week.",
  /*
   * Start date, not finish date: the finish term and the percentage are both
   * derived from this plus `track` (see mock/program.ts), so neither is stored
   * anywhere and switching track moves both with no other edit.
   *
   * Why early August. The optional Fall sits at `yearOffset: 1`, so a Fall 2027
   * finish pins the start year to 2026. Every other phase window is a fixed
   * quarter date, and none of them contains mid-August -- only Orientation can,
   * because its start is the one the program start replaces. That is also the
   * honest answer: 17 months ending December 2027 begins around now, so Merna
   * is at the very start of the program rather than the end of it.
   */
  programStart: "2026-08-03",
  consent: {
    calendarRead: true,
    lmsRead: true,
    careerRecommendations: true,
    advisorSharing: false,
  },
};
