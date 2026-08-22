import type { Course } from "../types";
import { at, FRI, MON, THU, upcomingWeekday, TUE, WED } from "./relative-dates";

/**
 * The courses the student is ENROLLED IN, which is Summer 2026 — the term the
 * timeline reports as current.
 *
 * ## This is not the catalogue
 *
 * `catalogue.ts` holds all twelve courses across four terms. This holds the three
 * being taken right now, and it is a richer shape: meeting times, a progress
 * figure, a standing, a next assignment, a grade. **A course in a term that has
 * not happened has none of those**, and inventing them — progress 0, standing
 * "onTrack", an empty schedule — would put four fields on screen that mean
 * nothing and read as real. Hence two types. See `CatalogueCourse`.
 *
 * The codes, titles and instructors here are the real ones and match
 * `catalogue.ts` exactly. They used to be four invented courses.
 *
 * ## WHAT IS INVENTED, stated plainly because real names are attached to it
 *
 * `progress`, `standing`, `currentGrade`, `nudge`, `nextAssignment`, `schedule`
 * and `syllabusId` are ALL FABRICATED. The course numbers, titles and instructor
 * names are real. So a real instructor's name sits beside a made-up "C+" and a
 * made-up "Grade slipped to C+".
 *
 * That combination is the reason the README says not to share the deployed link
 * outside the team, and it is recorded here rather than fixed (owner,
 * 2026-08-21). Anyone replacing these providers with Django should expect the
 * real numbers to look nothing like this.
 *
 * ## One course in trouble, deliberately
 *
 * MGTA461 carries the nudge. Exactly one course in trouble is the point: it makes
 * "focus here this week" legible instead of leaving the student to compare three
 * progress bars and guess. It is also the ELECTIVE of the three, which is a
 * slightly better story than a core course slipping — a student can drop an
 * elective.
 *
 * `origin: "canvas"` on every row: a course roster comes from the LMS, so these
 * are the rows that carry the provenance pill.
 */
export function buildMockCourses(): Course[] {
  return [
    {
      id: "crs-mgta452",
      origin: "canvas",
      code: "MGTA452",
      title: "Collecting and Analyzing Large Data",
      instructor: "Hansen",
      term: "Summer 2026",
      units: 4,
      requirement: "core",
      progress: 72,
      standing: "onTrack",
      syllabusId: "syl-mgta452",
      currentGrade: "A-",
      nextAssignment: {
        title: "Problem Set 3",
        due: upcomingWeekday(FRI, { hour: 23, minute: 59 }),
      },
      schedule: [
        {
          dayOfWeek: MON,
          startTime: "09:30",
          endTime: "11:20",
          location: "Otterson Hall 2S111",
        },
        {
          dayOfWeek: WED,
          startTime: "09:30",
          endTime: "11:20",
          location: "Otterson Hall 2S111",
        },
      ],
    },
    {
      id: "crs-mgta453",
      origin: "canvas",
      code: "MGTA453",
      title: "Business Analytics",
      instructor: "August",
      term: "Summer 2026",
      units: 4,
      requirement: "core",
      progress: 60,
      standing: "watch",
      syllabusId: "syl-mgta453",
      currentGrade: "B",
      nextAssignment: {
        title: "Lab 4: Joins",
        due: at(1, 23, 59),
      },
      schedule: [
        {
          dayOfWeek: TUE,
          startTime: "11:00",
          endTime: "12:50",
          location: "Otterson Hall 1S118",
        },
        {
          dayOfWeek: THU,
          startTime: "11:00",
          endTime: "12:50",
          location: "Otterson Hall 1S118",
        },
      ],
    },
    {
      id: "crs-mgta461",
      origin: "canvas",
      code: "MGTA461",
      title: "Web Mining and Recommender Systems",
      instructor: "McAuley",
      term: "Summer 2026",
      units: 4,
      requirement: "elective",
      progress: 45,
      standing: "needsHelp",
      syllabusId: "syl-mgta461",
      currentGrade: "C+",
      nudge: "Grade slipped to C+. Focus here this week.",
      nextAssignment: {
        title: "Dashboard project",
        due: upcomingWeekday(MON, { hour: 23, minute: 59 }),
      },
      /*
       * FRIDAY, and the day matters.
       *
       * This met on Wednesday until the catalogue replaced four invented courses
       * with three real ones -- and the course that went was the only one meeting
       * on a Friday. That left the fixture's anchor day (a Friday) with no classes
       * at all, which `check:interaction` caught by finding no provenance pill on
       * the calendar: no class rows, nothing to mark.
       *
       * With this on Friday the three courses cover Mon-Fri between them, which is
       * both a better shape for a full-time program and the reason the day panel is
       * never empty on the day every other fixture is dated relative to.
       */
      schedule: [
        {
          dayOfWeek: FRI,
          startTime: "14:00",
          endTime: "15:50",
          location: "Wells Fargo Hall 1N108",
        },
      ],
    },
  ];
}
