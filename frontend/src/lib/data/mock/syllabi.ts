import type { Syllabus } from "../types";
import { onDay } from "./relative-dates";

export function buildMockSyllabi(): Syllabus[] {
  /*
   * THREE, matching the three enrolled courses. There was a fourth, for a course
   * the student is no longer modelled as taking -- a syllabus with no enrolment
   * behind it is a row nothing can reach, so it went with the course.
   */
  return [
    {
      id: "syl-mgta452",
      courseId: "crs-mgta452",
      description:
        "Supervised and unsupervised learning applied to business problems, with an emphasis on model selection and honest evaluation.",
      gradeBreakdown: [
        { label: "Problem sets", weight: 40 },
        { label: "Midterm", weight: 20 },
        { label: "Final project", weight: 30 },
        { label: "Participation", weight: 10 },
      ],
      policies: [
        "Every model ships with a held-out evaluation.",
        "Problem sets may be discussed in groups but written up individually.",
        "Generative AI is permitted if disclosed in the submission notes.",
      ],
      officeHours: "Wednesdays 14:00-16:00, Otterson 3W120",
      lastUpdated: onDay(-21),
    },
    {
      id: "syl-mgta453",
      courseId: "crs-mgta453",
      description:
        "Relational modeling, SQL, and the practical work of getting messy campus and business data into a queryable shape.",
      gradeBreakdown: [
        { label: "Labs", weight: 45 },
        { label: "Midterm", weight: 25 },
        { label: "Final exam", weight: 30 },
      ],
      policies: [
        "Labs are due at 11:59pm on the posted date.",
        "Late work loses 10% per day, up to three days.",
      ],
      officeHours: "Thursdays 15:00-16:30, Otterson 4E210",
      lastUpdated: onDay(-14),
    },
    {
      id: "syl-mgta461",
      courseId: "crs-mgta461",
      description:
        "Encoding, perception, and narrative in visual analytics, ending in an interactive dashboard built for a real audience.",
      gradeBreakdown: [
        { label: "Critiques", weight: 20 },
        { label: "Peer reviews", weight: 10 },
        { label: "Dashboard project", weight: 45 },
        { label: "Final presentation", weight: 25 },
      ],
      policies: [
        "Peer reviews are part of the grade and are not dropped.",
        "Projects are presented live in the final session.",
      ],
      officeHours: "Wednesdays 16:00-17:00, Wells Fargo 1N108",
      lastUpdated: onDay(-9),
    },
  ];
}
