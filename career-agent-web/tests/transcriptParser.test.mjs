import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import * as parser from "../lib/transcriptParser.ts";

const fixtureUrl = new URL("./fixtures/hanshin-transcript.txt", import.meta.url);
const fixture = await readFile(fixtureUrl, "utf8");
const { buildTranscriptSummary, getTranscriptDiagnostics, parseTranscriptText } =
  parser;

function parsePages(pages) {
  assert.equal(
    typeof parser.parseTranscriptPages,
    "function",
    "parseTranscriptPages must preserve page and physical row boundaries",
  );
  return parser.parseTranscriptPages(pages);
}

test("does not connect a course to credit and grade from the next physical row", () => {
  const text = [
    "2026학년도 1학기",
    "전선 SH308A 알고리즘 3.0",
    "일선 SH328D 딥러닝기초 3.0 A+",
  ].join("\n");

  const courses = parseTranscriptText(text);

  assert.equal(courses.some((course) => course.courseCode === "SH308A"), false);
  const deepLearning = courses.find((course) => course.courseCode === "SH328D");
  assert.ok(deepLearning);
  assert.equal(deepLearning.courseName, "딥러닝기초");
  assert.equal(deepLearning.credit, 3);
  assert.equal(deepLearning.grade, "A+");
});

test("parses Hanshin rows within their physical page and line", () => {
  const result = parsePages([{ page: 1, text: fixture }]);
  const algorithm = result.courses.find((course) => course.courseCode === "SH308A");

  assert.ok(algorithm);
  assert.equal(algorithm.semester, "2026-1");
  assert.equal(algorithm.category, "전선");
  assert.equal(algorithm.courseName, "알고리즘");
  assert.equal(algorithm.credit, 3);
  assert.equal(algorithm.grade, "B+");
  assert.equal(algorithm.sourcePage, 1);
  assert.equal(typeof algorithm.sourceLine, "number");
});

test("recognizes Hanshin 년도 semester headers instead of leaving courses unclassified", () => {
  const result = parsePages([
    {
      page: 1,
      text: "2026년도 1학기\n전선 SH308A 알고리즘 3.0 A0",
    },
  ]);

  assert.equal(result.courses[0]?.semester, "2026-1");
  assert.equal(result.courses[0]?.needsReview, false);
});

test("uses the latest valid course semester when an older active term is unclassified", () => {
  assert.equal(
    typeof parser.resolveAcademicTerm,
    "function",
    "resolveAcademicTerm must replace a legacy 학기 미분류 version term",
  );
  if (typeof parser.resolveAcademicTerm !== "function") return;

  assert.equal(
    parser.resolveAcademicTerm("학기 미분류", ["2024-1", "2025-2", "학기 미분류"]),
    "2025-2",
  );
  assert.equal(parser.resolveAcademicTerm("2024-1", ["2025-2"]), "2024-1");
});

test("normalizes AO to A0 and records the correction for review", () => {
  const result = parsePages([{ page: 1, text: fixture }]);
  const hci = result.courses.find((course) => course.courseCode === "HC301A");

  assert.ok(hci);
  assert.equal(hci.grade, "A0");
  assert.equal(hci.needsReview, true);
  assert.ok(hci.reviewReasons.some((reason) => reason.includes("성적")));
  assert.ok(
    hci.normalizationChanges.some(
      (change) => change.original === "AO" && change.normalized === "A0",
    ),
  );
});

test("normalizes standalone .5 to 0.5", () => {
  const result = parsePages([{ page: 1, text: fixture }]);
  const chapel = result.courses.find((course) => course.courseCode === "KY101A");

  assert.ok(chapel);
  assert.equal(chapel.credit, 0.5);
});

test("applies row-context corrections for BO, 30 credit, and AI.SW text", () => {
  const result = parsePages([
    {
      page: 2,
      text: [
        "2026학년도 2학기",
        "전선 AI402A AI.SW캡스톤 30 BO",
      ].join("\n"),
    },
  ]);
  const course = result.courses[0];

  assert.ok(course);
  assert.equal(course.courseName, "AI·SW캡스톤");
  assert.equal(course.credit, 3);
  assert.equal(course.grade, "B0");
  assert.equal(course.sourcePage, 2);
  assert.equal(course.needsReview, true);
  assert.ok(course.normalizationChanges.some((change) => change.original === "30"));
  assert.ok(course.normalizationChanges.some((change) => change.original === "BO"));
});

test("keeps pass/fail courses but excludes them from calculated GPA", () => {
  const result = parsePages([{ page: 1, text: fixture }]);

  assert.equal(result.courses.some((course) => course.grade === "P"), true);
  assert.equal(result.summary.calculatedGpa, 3.75);
});

test("identifies parenthesized zero credit without adding earned credit", () => {
  const result = parsePages([{ page: 1, text: fixture }]);
  const aiSw = result.courses.find((course) => course.courseCode === "AI401A");

  assert.ok(aiSw);
  assert.equal(aiSw.credit, 0);
  assert.equal(aiSw.isBracketedCredit, true);
  assert.equal(result.summary.calculatedTotalCredits, 9.5);
});

test("extracts declared totals, GPA scale, and category credit totals", () => {
  const result = parsePages([{ page: 1, text: fixture }]);

  assert.equal(result.summary.declaredTotalCredits, 90.5);
  assert.equal(result.summary.declaredGpa, 3.74);
  assert.equal(result.summary.gpaScale, 4.5);
  assert.deepEqual(result.summary.categoryCredits, {
    교양: 24.5,
    전공: 54,
    계공: 9,
    일선: 3,
  });
});

test("reports total and semester credit mismatches without rejecting courses", () => {
  const result = parsePages([{ page: 1, text: fixture }]);

  assert.ok(
    result.diagnostics.mismatches.some(
      (mismatch) => mismatch.code === "TOTAL_CREDIT_MISMATCH",
    ),
  );
  const semesterMismatch = parsePages([
    {
      page: 1,
      text: [
        "2026학년도 1학기",
        "전선 SH308A 알고리즘 3.0 A0",
        "이수학점 6.0 평점평균 4.0",
      ].join("\n"),
    },
  ]);
  assert.ok(
    semesterMismatch.diagnostics.mismatches.some(
      (mismatch) => mismatch.code === "SEMESTER_CREDIT_MISMATCH",
    ),
  );
  assert.equal(result.courses.length > 0, true);
});

test("marks an unexpected credit for review instead of deleting the row", () => {
  const result = parsePages([
    { page: 1, text: "2026학년도 1학기\n전선 SH308A 알고리즘 5 A0" },
  ]);
  const course = result.courses[0];

  assert.ok(course);
  assert.equal(course.credit, 5);
  assert.equal(course.needsReview, true);
  assert.ok(course.reviewReasons.some((reason) => reason.includes("학점")));
});

test("marks an invalid grade for review instead of deleting the row", () => {
  const result = parsePages([
    { page: 1, text: "2026학년도 1학기\n전선 SH308A 알고리즘 3.0 S" },
  ]);
  const course = result.courses[0];

  assert.ok(course);
  assert.equal(course.grade, "S");
  assert.equal(course.needsReview, true);
  assert.ok(course.reviewReasons.some((reason) => reason.includes("성적")));
});

test("marks a nonstandard course code for review instead of deleting the row", () => {
  const result = parsePages([
    { page: 1, text: "2026학년도 1학기\n전선 SH-308A 알고리즘 3.0 A0" },
  ]);
  const course = result.courses[0];

  assert.ok(course);
  assert.equal(course.courseCode, "SH-308A");
  assert.equal(course.needsReview, true);
  assert.ok(course.reviewReasons.some((reason) => reason.includes("과목코드")));
});

test("marks duplicate same-semester courses for review", () => {
  const result = parsePages([
    {
      page: 1,
      text: [
        "2026학년도 1학기",
        "전선 SH308A 알고리즘 3.0 A0",
        "전선 SH308A 알고리즘 3.0 A0",
      ].join("\n"),
    },
  ]);

  assert.equal(result.courses.length, 1);
  assert.equal(result.courses[0]?.needsReview, true);
  assert.ok(
    result.courses[0]?.reviewReasons.some((reason) => reason.includes("중복")),
  );
});

test("keeps legacy summary and diagnostic helpers compatible", () => {
  const courses = parseTranscriptText(fixture);
  const diagnostics = getTranscriptDiagnostics(fixture, courses);
  const summary = buildTranscriptSummary(fixture, courses, diagnostics);

  assert.equal(summary.courseCount, courses.length);
  assert.equal(typeof summary.confidencePercent, "number");
});
