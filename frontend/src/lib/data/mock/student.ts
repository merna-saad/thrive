import type { Student } from "../types";

/**
 * ## TWO FIELDS HERE HELD THE PRE-CATALOGUE FIXTURE, AND BOTH RENDERED
 *
 * Fixed 2026-08-21. This is the file the real-catalogue work (`fd547d8`,
 * `37c1cd1`) did not reach: it replaced `courses.ts` and `catalogue.ts` and left
 * two stale strings here, both of which are on Home.
 *
 * **`currentTerm` said "Fall 2026".** The timeline puts today in the FIRST
 * phase, whose term is Summer 2026, and Home's strip says "Summer 2026 · you are
 * here" three lines below the top bar that said Fall. Read the top bar and the
 * student's current term is Fall 2026 -- whose courses are MGTA452, MGTA453 and
 * MGTA461, which is exactly the "Home is showing the wrong Summer courses"
 * report. The enrolment fixture and the catalogue were both correct and agreed
 * with each other the whole time; this string is what disagreed with them.
 *
 * **`standingSummary` named "Data Visualization".** That was `MGT 253` in the
 * invented four-course set the real catalogue replaced. There is no course by
 * that title in the catalogue or the enrolments, so the greeting panel was
 * telling the student a course they are not taking had slipped. It now names
 * MGTA403, which is the one enrolment carrying `standing: "needsHelp"` and the
 * nudge -- see `courses.ts`, where exactly one course being in trouble is the
 * deliberate shape.
 *
 * ### `currentTerm` is derivable, and should probably not exist
 *
 * It is a second answer to a question `buildProgramTimeline` already answers --
 * the same defect `degree.ts` had with `expectedCompletion`, which was DELETED
 * rather than corrected for that reason. It is corrected rather than deleted here
 * only because `TopBar` renders it as a prop and removing it is a behaviour
 * change. **The right fix is to delete the field and have the bar read the
 * timeline's current phase**, and `fixtureConsistency.spec.ts` pins the two
 * together until someone does.
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
  currentTerm: "Summer 2026",
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
