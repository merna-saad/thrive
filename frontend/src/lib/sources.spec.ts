import { describe, expect, it } from "vitest";

import { sourceLabel, sourceSpoken } from "$lib/sources";
import { messages } from "$lib/messages";
import { buildMockAssignments } from "$lib/data/mock/assignments";
import { buildMockCourses } from "$lib/data/mock/courses";
import { buildMockTasks } from "$lib/data/mock/tasks";

/**
 * Provenance, and specifically the NEGATIVE case.
 *
 * The pill is a label with no behaviour, so almost nothing here needs a test --
 * except the one thing that regresses silently. An empty badge on every row
 * reads as a styling glitch rather than a bug, so nobody reports it, so it
 * survives. That is what these pin.
 */
describe("sourceLabel", () => {
  it("names a source it knows", () => {
    expect(sourceLabel("canvas")).toBe("Canvas");
  });

  /* THE ONE THE OWNER ASKED FOR. An absent field must produce no pill. */
  it("returns null for an item with no source, so no empty badge renders", () => {
    expect(sourceLabel(undefined)).toBeNull();
    expect(sourceLabel(null)).toBeNull();
  });

  /*
   * Absent means UNKNOWN, not "not from Canvas". The empty string is the shape a
   * serialiser produces for a missing value and must behave like absent rather
   * than like a source called "".
   */
  it("treats an empty string as absent rather than as a source", () => {
    expect(sourceLabel("")).toBeNull();
  });

  /*
   * Django can send a value newer than this build. Rendering it raw would put a
   * slug on a row; this degrades to the absent case instead.
   */
  it("returns null for a source it has never heard of", () => {
    expect(sourceLabel("handshake_v2")).toBeNull();
    expect(sourceLabel("CANVAS")).toBeNull();
  });

  /* Every declared system has a label, or the union and the map have drifted. */
  it("has a label for every system the type declares", () => {
    for (const system of ["canvas", "handshake", "student"] as const) {
      expect(sourceLabel(system)).toBeTruthy();
    }
  });

  /*
   * The map is deliberately partial, and a test asserting an absence needs a
   * companion proving it can still see a presence -- otherwise a broken lookup
   * would pass every null case above.
   */
  it("is not simply returning null for everything", () => {
    expect(sourceLabel("handshake")).toBe("Handshake");
  });
});

describe("sourceSpoken", () => {
  it("is a sentence, not the bare product name", () => {
    const spoken = sourceSpoken("canvas");
    expect(spoken).toBe(messages.common.source.spoken("Canvas"));
    expect(spoken).not.toBe("Canvas");
  });

  it("is null exactly when the label is", () => {
    expect(sourceSpoken(undefined)).toBeNull();
    expect(sourceSpoken("nope")).toBeNull();
  });
});

/**
 * The FIXTURES, because "classes and assignments are marked, everything else is
 * not" is a data claim rather than a rendering one.
 */
describe("the fixtures mark exactly what was asked for", () => {
  it("gives every course an origin", () => {
    const courses = buildMockCourses();
    expect(courses.length).toBeGreaterThan(0);
    for (const course of courses) {
      expect(sourceLabel(course.origin)).toBe("Canvas");
    }
  });

  it("gives every assignment an origin", () => {
    const assignments = buildMockAssignments();
    expect(assignments.length).toBeGreaterThan(0);
    for (const assignment of assignments) {
      expect(sourceLabel(assignment.origin)).toBe("Canvas");
    }
  });

  /*
   * And leaves tasks unmarked. SETTLED, do not relitigate.
   *
   * The obvious objection is that a task with a `courseId` came from a class, so
   * it came from Canvas, so it should say so. The answer is that the pill does
   * not mean "this was influenced by Canvas" -- it means **THIS ROW IS A CANVAS
   * OBJECT**. A task is the student's own object even when it came from a class:
   * they can rename it, repriotise it, move its due date, tick it, and delete it,
   * and none of that touches anything in Canvas. An assignment is not any of
   * those things; it is a record Canvas owns and THRIVE displays.
   *
   * So this is not a scope decision that might go the other way later. Marking
   * tasks would make the pill mean two different things on two rows of the same
   * list, which is worse than marking nothing (owner, 2026-08-21).
   */
  it("leaves tasks unmarked, because a task is the student's own object", () => {
    const tasks = buildMockTasks();
    expect(tasks.length).toBeGreaterThan(0);
    for (const task of tasks) {
      expect(sourceLabel(task.origin)).toBeNull();
    }
  });
});
