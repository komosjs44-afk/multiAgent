import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import * as parser from "../lib/transcriptParser.ts";

const { parseTranscriptPages, parseTranscriptPagesLegacy } = parser;

const hanshinFixtureUrl = new URL("./fixtures/hanshin-transcript.txt", import.meta.url);
const hanshinFixture = await readFile(hanshinFixtureUrl, "utf8");
const altFormatFixtureUrl = new URL(
  "./fixtures/sample-alt-format-transcript.txt",
  import.meta.url,
);
const altFormatFixture = await readFile(altFormatFixtureUrl, "utf8");

function findCourse(courses, courseCode) {
  return courses.find((course) => course.courseCode === courseCode);
}

// --- Case A: category alias normalization ------------------------------

test("normalizes '전공선택' / '전공 선택' / '전선' to the same canonical category", () => {
  const variants = ["전공선택", "전공 선택", "전선"];
  for (const raw of variants) {
    const result = parseTranscriptPages([
      { page: 1, text: `2026학년도 1학기\n${raw} CSE301 데이터베이스 3 A+` },
    ]);
    const course = result.courses[0];
    assert.ok(course, `expected a course for category "${raw}"`);
    assert.equal(course.category, "전선");
    assert.equal(course.categoryNormalized, "전선");
    assert.equal(course.needsReview, false);
  }
});

test("normalizes '전공필수' / '전공 필수' / '전필' to the same canonical category", () => {
  const variants = ["전공필수", "전공 필수", "전필"];
  for (const raw of variants) {
    const result = parseTranscriptPages([
      { page: 1, text: `2026학년도 1학기\n${raw} CSE310 운영체제 3 B+` },
    ]);
    const course = result.courses[0];
    assert.ok(course, `expected a course for category "${raw}"`);
    assert.equal(course.category, "전필");
    assert.equal(course.categoryNormalized, "전필");
  }
});

// --- Case B: unknown category is kept, not dropped ----------------------

test("keeps a course with an unrecognized category instead of dropping the row", () => {
  const result = parseTranscriptPages([
    { page: 1, text: "2026학년도 1학기\n융합선택 CSE301 데이터베이스 3 A+" },
  ]);
  const course = result.courses[0];

  assert.ok(course, "unknown-category row must still produce a course");
  assert.equal(course.categoryRaw, "융합선택");
  assert.equal(course.categoryNormalized, "UNKNOWN");
  assert.equal(course.needsReview, true);
  assert.ok(course.reviewReasons.some((reason) => reason.includes("이수구분")));
  assert.equal(course.courseName, "데이터베이스");
  assert.equal(course.credit, 3);
  assert.equal(course.grade, "A+");
});

// --- Case C: limited multi-line reconstruction ---------------------------

test("reconstructs a course when credit/grade spill onto the next line", () => {
  const result = parseTranscriptPages([
    { page: 1, text: "2026학년도 1학기\n전선 CSE302 데이터베이스\n3.0 A+" },
  ]);
  const course = findCourse(result.courses, "CSE302");

  assert.ok(course);
  assert.equal(course.courseName, "데이터베이스");
  assert.equal(course.credit, 3);
  assert.equal(course.grade, "A+");
  assert.equal(course.reconstructed, true);
  assert.equal(course.needsReview, true);
  assert.ok(course.reviewReasons.some((reason) => reason.includes("여러 줄")));
  assert.equal(result.diagnostics.reconstructedCourseCount, 1);
});

test("reconstructs a course when the course name spills onto the next line", () => {
  const result = parseTranscriptPages([
    { page: 1, text: "2026학년도 1학기\n전선 CSE302\n데이터베이스시스템 3.0 A+" },
  ]);
  const course = findCourse(result.courses, "CSE302");

  assert.ok(course);
  assert.equal(course.courseName, "데이터베이스시스템");
  assert.equal(course.credit, 3);
  assert.equal(course.grade, "A+");
  assert.equal(course.reconstructed, true);
});

test("does not merge when the next line is itself a complete, unrelated course row", () => {
  // Same shape as the original "does not connect" regression case, restated here to make the
  // boundary explicit: a head fragment must NOT absorb a following line that is a full course
  // row on its own (5 tokens), even though both lines start with a valid category.
  const result = parseTranscriptPages([
    {
      page: 1,
      text: [
        "2026학년도 1학기",
        "전선 CSE305 이산수학 3.0",
        "전선 CSE306 컴퓨터네트워크 3.0 B+",
      ].join("\n"),
    },
  ]);

  assert.equal(findCourse(result.courses, "CSE305"), undefined);
  const network = findCourse(result.courses, "CSE306");
  assert.ok(network);
  assert.equal(network.courseName, "컴퓨터네트워크");
  assert.equal(network.credit, 3);
  assert.equal(network.grade, "B+");
  assert.equal(network.reconstructed, false);
});

test("does not merge a bare code line with a following line that has its own category", () => {
  const result = parseTranscriptPages([
    {
      page: 1,
      text: [
        "2026학년도 1학기",
        "전선 CSE307",
        "전선 CSE308 소프트웨어공학 3.0 A0",
      ].join("\n"),
    },
  ]);

  assert.equal(findCourse(result.courses, "CSE307"), undefined);
  const se = findCourse(result.courses, "CSE308");
  assert.ok(se);
  assert.equal(se.courseName, "소프트웨어공학");
});

// --- Case D: false-positive prevention -----------------------------------

test("does not treat an ordinary Korean sentence as a course row", () => {
  const result = parseTranscriptPages([
    { page: 1, text: "2026학년도 1학기\n환산평균 계산은 학교마다 다를 수 있습니다" },
  ]);

  assert.equal(result.courses.length, 0);
});

test("does not treat a declared-total line as a course row", () => {
  const result = parseTranscriptPages([
    { page: 1, text: "2026학년도 1학기\n총 취득학점 84.5" },
  ]);

  assert.equal(result.courses.length, 0);
});

test("does not treat a semester summary line ('이수학점 ... 평점평균 ...') as a course row", () => {
  const result = parseTranscriptPages([
    { page: 1, text: "2026학년도 1학기\n이수학점 9.5 평점평균 3.74 (95.0)" },
  ]);

  assert.equal(result.courses.length, 0);
});

test("does not treat a category-credit breakdown line as a course row", () => {
  const result = parseTranscriptPages([
    { page: 1, text: "2026학년도 1학기\n교양: 24.5 전공: 54.0 계공: 9.0 일선: 3.0" },
  ]);

  assert.equal(result.courses.length, 0);
});

// --- Earned-credit total excludes F/NP (found via real-transcript investigation) ---

test("excludes an NP-graded course from the calculated total credits", () => {
  const result = parseTranscriptPages([
    {
      page: 1,
      text: [
        "2026학년도 1학기",
        "전선 KY795A 실천교양 2 NP",
        "전선 CSE301 데이터베이스 3 A+",
      ].join("\n"),
    },
  ]);

  // Only the A+ course (3 credits) should count; the NP course's 2 credits must not.
  assert.equal(result.summary.calculatedTotalCredits, 3);
});

test("excludes an F-graded course from the calculated total credits while it still lowers GPA", () => {
  const result = parseTranscriptPages([
    {
      page: 1,
      text: [
        "2026학년도 1학기",
        "전선 CSE305 이산수학 3 F",
        "전선 CSE301 데이터베이스 3 A+",
      ].join("\n"),
    },
  ]);

  assert.equal(result.summary.calculatedTotalCredits, 3);
  // F still participates in the GPA average (0 points over 3 credits), unlike the credit total.
  assert.equal(result.summary.calculatedGpa, 2.25);
});

// --- Parser V2 vs legacy: regression parity on the known-good fixture ----

test("Parser V2 matches the legacy parser field-for-field on the existing Hanshin fixture", () => {
  const legacy = parseTranscriptPagesLegacy([{ page: 1, text: hanshinFixture }]);
  const v2 = parseTranscriptPages([{ page: 1, text: hanshinFixture }]);

  assert.equal(v2.courses.length, legacy.courses.length);
  for (const legacyCourse of legacy.courses) {
    const v2Course = findCourse(v2.courses, legacyCourse.courseCode);
    assert.ok(v2Course, `Parser V2 is missing course ${legacyCourse.courseCode}`);
    assert.equal(v2Course.semester, legacyCourse.semester);
    assert.equal(v2Course.courseName, legacyCourse.courseName);
    assert.equal(v2Course.credit, legacyCourse.credit);
    assert.equal(v2Course.grade, legacyCourse.grade);
    assert.equal(v2Course.category, legacyCourse.category);
    assert.equal(v2Course.needsReview, legacyCourse.needsReview);
  }
});

// --- Parser V2 vs legacy: recall improvement on a differently formatted fixture ----

test("Parser V2 recovers alias/unknown-category/multi-line rows that the legacy parser drops", () => {
  const legacy = parseTranscriptPagesLegacy([{ page: 1, text: altFormatFixture }]);
  const v2 = parseTranscriptPages([{ page: 1, text: altFormatFixture }]);

  // Legacy only recognizes the one row whose category is an exact, single-line whitelist match.
  assert.equal(legacy.courses.length, 1);
  assert.equal(legacy.courses[0].courseCode, "EN101");

  assert.equal(v2.courses.length, 5);

  const cse201 = findCourse(v2.courses, "CSE201");
  assert.equal(cse201.category, "전선");
  assert.equal(cse201.courseName, "자료구조");
  assert.equal(cse201.needsReview, false);

  const cse210 = findCourse(v2.courses, "CSE210");
  assert.equal(cse210.category, "전필");
  assert.equal(cse210.courseName, "운영체제");
  assert.equal(cse210.reconstructed, true);

  const cse250 = findCourse(v2.courses, "CSE250");
  assert.equal(cse250.categoryNormalized, "UNKNOWN");
  assert.equal(cse250.courseName, "캡스톤디자인");

  const en101 = findCourse(v2.courses, "EN101");
  assert.equal(en101.category, "교양");
  assert.equal(en101.needsReview, false);

  const cse302 = findCourse(v2.courses, "CSE302");
  assert.equal(cse302.courseName, "데이터베이스");
  assert.equal(cse302.reconstructed, true);
});
