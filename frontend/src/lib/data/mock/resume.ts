import type {
  ResumeCourse,
  ResumeExperience,
  ResumeVersion,
  Skill,
} from "../types";
import { at } from "./relative-dates";

/**
 * Skills, tied to the courses that produced them.
 *
 * The course link is the whole point of the feature: a student should be able
 * to see that "SQL" on their resume came from MGTA464, not wonder where it
 * appeared from.
 */
export const mockSkills: Skill[] = [
  // MGTA464 · SQL and ETL
  { id: "skl-sql", name: "SQL", source: "course", courseId: "crs-mgta464" },
  {
    id: "skl-datamodel",
    name: "Relational data modeling",
    source: "course",
    courseId: "crs-mgta464",
  },
  // MGTA403 · AI-Assisted Math and Programming for Business Analytics
  {
    id: "skl-ml",
    name: "Machine learning",
    source: "course",
    courseId: "crs-mgta403",
  },
  {
    id: "skl-modeleval",
    name: "Model evaluation",
    source: "course",
    courseId: "crs-mgta403",
  },
  { id: "skl-python", name: "Python", source: "course", courseId: "crs-mgta403" },
  // MGTA451 · Business Analytics in Marketing, Finance and Ops
  {
    id: "skl-dataviz",
    name: "Data visualization",
    source: "course",
    courseId: "crs-mgta451",
  },
  { id: "skl-tableau", name: "Tableau", source: "course", courseId: "crs-mgta451" },
  /*
   * These two used to hang off a fourth enrolled course. There are three now, and
   * both belong to MGTA451 -- "Business Analytics in Marketing, Finance and Ops"
   * is where campaign measurement and A/B testing come from.
   *
   * `skl-recsys` lived here for one commit, while the inferred grouping had the
   * recommender course in this slot. The real catalogue puts MGTA461 in Fall, so
   * the skill went back to marketing analytics.
   */
  {
    id: "skl-mktg",
    name: "Marketing analytics",
    source: "course",
    courseId: "crs-mgta451",
  },
  {
    id: "skl-abtest",
    name: "A/B testing",
    source: "course",
    courseId: "crs-mgta451",
  },
  // Added by the student
  { id: "skl-git", name: "Git & version control", source: "manual" },
  { id: "skl-spanish", name: "Spanish (professional)", source: "manual" },
];

/** Course entries, phrased as what the student can now do. */
export const mockResumeCourses: ResumeCourse[] = [
  {
    code: "MGTA464",
    title: "SQL and ETL",
    highlight: "Modeled, queried and loaded relational data at scale.",
  },
  {
    code: "MGTA403",
    title: "AI-Assisted Math and Programming for Business Analytics",
    highlight: "Built and validated models with AI-assisted tooling.",
  },
  {
    code: "MGTA451",
    title: "Business Analytics in Marketing, Finance and Ops",
    highlight: "Measured campaign response across marketing, finance and ops.",
  },
];

const mockExperience: ResumeExperience[] = [
  {
    id: "exp-capstone",
    title: "Analytics Capstone, Team Lead",
    organization: "UC San Diego Rady School of Management",
    period: "Jun 2026 - present",
    bullets: [
      "Leading a four-person team on a sponsored forecasting project.",
      "Owning model validation and the sponsor-facing deliverable.",
    ],
  },
  {
    id: "exp-ta",
    title: "Teaching Assistant, Business Statistics",
    organization: "UC San Diego",
    period: "Jan 2026 - Jun 2026",
    bullets: [
      "Ran weekly sections for 40 undergraduates.",
      "Built practice notebooks used across all sections.",
    ],
  },
];

/**
 * Version history.
 *
 * Three versions with real gaps between them, so the history list has
 * something to say and "restore an older version" is a meaningful action.
 * The earliest deliberately has fewer skills and courses -- that is what
 * makes regeneration visibly add something.
 */
function seedVersions(): ResumeVersion[] {
  const skillsBy = (ids: string[]) =>
    mockSkills.filter((skill) => ids.includes(skill.id));

  return [
    {
      id: "res-001",
      label: "First draft",
      createdAt: at(-96, 10, 0),
      summary:
        "MSBA candidate at UC San Diego with a background in business analysis, moving toward a data science role.",
      skills: skillsBy(["skl-sql", "skl-python", "skl-git"]),
      courses: mockResumeCourses.slice(0, 2),
      experience: mockExperience.slice(1),
      isCurrent: false,
    },
    {
      id: "res-002",
      label: "After spring coursework",
      createdAt: at(-45, 16, 30),
      summary:
        "MSBA candidate at UC San Diego building toward a Data Scientist role, with hands-on work in SQL, Python, and predictive modeling.",
      skills: skillsBy([
        "skl-sql",
        "skl-datamodel",
        "skl-python",
        "skl-ml",
        "skl-git",
        "skl-spanish",
      ]),
      courses: mockResumeCourses.slice(0, 3),
      experience: mockExperience,
      isCurrent: false,
    },
    {
      id: "res-003",
      label: "Current term update",
      createdAt: at(-12, 9, 15),
      summary:
        "MSBA candidate at UC San Diego working toward a Data Scientist role. Comfortable across the full analysis path: modeling data in SQL, building and evaluating models in Python, and communicating results through dashboards.",
      skills: skillsBy([
        "skl-sql",
        "skl-datamodel",
        "skl-python",
        "skl-ml",
        "skl-modeleval",
        "skl-dataviz",
        "skl-git",
        "skl-spanish",
      ]),
      courses: mockResumeCourses.slice(0, 3),
      experience: mockExperience,
      isCurrent: true,
    },
  ];
}

/**
 * In-memory resume store. Same caveats as the other two: process-global,
 * shared by every visitor, wiped on restart (MIGRATION.md section 9 defect 1).
 *
 * Seeded lazily for the same reason as the request store -- `createdAt` on
 * every version is relative to "now", and module load may be hours earlier.
 */
interface ResumeStore {
  versions: ResumeVersion[];
  nextId: number;
  seeded: boolean;
}

/** `nextId` is 4, not 1: `seedVersions` already occupies res-001..res-003. */
const store: ResumeStore = { versions: [], nextId: 4, seeded: false };

export function readResumeStore(): ResumeStore {
  if (!store.seeded) {
    store.seeded = true;
    store.versions = seedVersions();
  }
  return store;
}

/**
 * The next version id, starting at `res-004`.
 *
 * The manual fix for the hazard documented on `nextRequestId`: the counter is
 * set past the seed by hand. Add a fourth seeded version and this has to move
 * to 5 or the first regeneration overwrites it.
 */
export function nextVersionId(): string {
  return `res-${String(store.nextId++).padStart(3, "0")}`;
}

export { mockExperience };
