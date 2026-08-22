import type { Assignment } from "../types";
import { at, FRI, MON, upcomingWeekday } from "./relative-dates";

/**
 * Every row carries `origin: "canvas"`, because an assignment is a Canvas
 * artefact by definition here -- it has a course, a weight and a submission
 * status, all of which come from the LMS. See `SourceSystem` in `../types`.
 *
 * Kept in step with `courses.ts`: the first four rows are the same items each
 * course reports as its `nextAssignment`, so the Assignments page and the
 * course cards can never contradict each other.
 */
export function buildMockAssignments(): Assignment[] {
  return [
    {
      id: "asg-001",
      origin: "canvas",
      courseId: "crs-mgta453",
      title: "Lab 4: Joins",
      dueDate: at(1, 23, 59),
      weight: 5,
      status: "in-progress",
      description: "Inner, outer, and self joins over the campus dataset.",
    },
    {
      id: "asg-002",
      origin: "canvas",
      courseId: "crs-mgta452",
      title: "Problem Set 3",
      dueDate: upcomingWeekday(FRI, { hour: 23, minute: 59 }),
      weight: 8,
      status: "in-progress",
      description: "Fit, cross-validate, and write up a baseline model.",
    },
    {
      id: "asg-003",
      origin: "canvas",
      courseId: "crs-mgta452",
      title: "Quiz 5",
      dueDate: upcomingWeekday(FRI, { hour: 10, minute: 0 }),
      weight: 4,
      status: "not-started",
    },
    {
      id: "asg-004",
      origin: "canvas",
      courseId: "crs-mgta461",
      title: "Dashboard project",
      dueDate: upcomingWeekday(MON, { hour: 23, minute: 59 }),
      weight: 20,
      status: "not-started",
      description: "Interactive dashboard plus a short design rationale.",
    },
    {
      id: "asg-005",
      origin: "canvas",
      courseId: "crs-mgta461",
      title: "Peer review",
      dueDate: at(-2, 23, 59),
      weight: 3,
      status: "late",
      description: "Structured feedback on two classmates' drafts.",
    },
    {
      id: "asg-006",
      origin: "canvas",
      courseId: "crs-mgta452",
      title: "Problem Set 2",
      dueDate: at(-6, 23, 59),
      weight: 8,
      status: "graded",
      grade: "92%",
    },
    {
      id: "asg-007",
      origin: "canvas",
      courseId: "crs-mgta453",
      title: "Lab 3: Aggregation",
      dueDate: at(-8, 23, 59),
      weight: 5,
      status: "graded",
      grade: "81%",
    },
    {
      id: "asg-008",
      origin: "canvas",
      courseId: "crs-mgta461",
      title: "Chart critique",
      dueDate: at(-11, 23, 59),
      weight: 6,
      status: "graded",
      grade: "74%",
    },
  ];
}
