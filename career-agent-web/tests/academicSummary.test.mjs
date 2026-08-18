import assert from "node:assert/strict";
import test from "node:test";

import { computeCourseAggregate } from "../lib/academicSummary.ts";

// Regression coverage for a real-transcript finding: F/NP-graded courses inflated the
// calculated total credits because computeCourseAggregate summed any positive credit value
// regardless of grade. GPA handling (isPassFailGrade-based exclusion) is untouched.

test("computeCourseAggregate excludes NP-graded courses from totalCredits", () => {
  const result = computeCourseAggregate([
    { credit: 2, grade: "NP" },
    { credit: 3, grade: "A+" },
  ]);

  assert.equal(result.totalCredits, 3);
});

test("computeCourseAggregate excludes F-graded courses from totalCredits but still counts them toward GPA", () => {
  const result = computeCourseAggregate([
    { credit: 3, grade: "F" },
    { credit: 3, grade: "A+" },
  ]);

  assert.equal(result.totalCredits, 3);
  assert.equal(result.gpaCredits, 6);
  assert.equal(result.averageGpa, 2.25);
});

test("computeCourseAggregate still counts Pass (P) credit toward totalCredits", () => {
  const result = computeCourseAggregate([
    { credit: 0.5, grade: "P" },
    { credit: 3, grade: "B0" },
  ]);

  assert.equal(result.totalCredits, 3.5);
});
