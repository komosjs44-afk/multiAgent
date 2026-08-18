import assert from "node:assert/strict";
import test from "node:test";

import {
  assessTranscriptTextQuality,
  extractTranscriptText,
  groupPdfTextItemsIntoRows,
  OcrFallbackUnavailableError,
} from "../lib/transcriptExtraction.ts";
import * as saveContract from "../lib/transcriptSaveContract.ts";

const { persistTranscriptBundle, resolveConfirmedTranscriptGpa } = saveContract;

const validExtraction = {
  method: "pdf-text",
  pages: [
    {
      page: 1,
      text: "2026학년도 1학기\n전선 SH308A 알고리즘 3.0 A0\n일선 SH328D 딥러닝기초 3.0 A+",
    },
  ],
  originalText: "2026학년도 1학기\n전선 SH308A 알고리즘 3.0 A0\n일선 SH328D 딥러닝기초 3.0 A+",
};

test("groups coordinate text items by y and orders each physical row by x", () => {
  const rows = groupPdfTextItemsIntoRows([
    { text: "알고리즘", x: 120, y: 10 },
    { text: "SH308A", x: 60, y: 11 },
    { text: "A0", x: 260, y: 10 },
    { text: "딥러닝", x: 120, y: 24 },
  ]);

  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.text, "SH308A\t알고리즘\tA0");
  assert.equal(rows[1]?.text, "딥러닝");
});

test("accepts a transcript-like PDF text layer without OCR", async () => {
  const assessment = assessTranscriptTextQuality(validExtraction.pages);
  let ocrCalled = false;
  const result = await extractTranscriptText(
    {},
    { extract: async () => validExtraction },
    {
      extract: async () => {
        ocrCalled = true;
        return { ...validExtraction, method: "ocr" };
      },
    },
  );

  assert.equal(assessment.needed, false);
  assert.equal(result.method, "pdf-text");
  assert.equal(ocrCalled, false);
});

test("stops with a clear fallback error when a transcript has no usable text layer", async () => {
  await assert.rejects(
    () =>
      extractTranscriptText(
        {},
        {
          extract: async () => ({
            method: "pdf-text",
            pages: [{ page: 1, text: "" }],
            originalText: "",
          }),
        },
      ),
    OcrFallbackUnavailableError,
  );
});

test("uses the injected OCR provider only when PDF text quality is insufficient", async () => {
  const result = await extractTranscriptText(
    {},
    {
      extract: async () => ({
        method: "pdf-text",
        pages: [{ page: 1, text: "스캔 이미지" }],
        originalText: "스캔 이미지",
      }),
    },
    { extract: async () => ({ ...validExtraction, method: "ocr" }) },
  );

  assert.equal(result.method, "ocr");
});

test("uses confirmed GPA before declared, calculated, and aggregate values", () => {
  assert.equal(
    resolveConfirmedTranscriptGpa({
      confirmedGpa: 3.81,
      declaredGpa: 3.74,
      summaryOverallGpa: 3.7,
      calculatedGpa: 3.69,
      aggregateGpa: 3.68,
    }),
    3.81,
  );
});

test("initial review GPA uses the declared cumulative value instead of a later semester GPA", () => {
  assert.equal(
    typeof saveContract.resolveInitialTranscriptGpa,
    "function",
    "resolveInitialTranscriptGpa must keep the official cumulative GPA",
  );
  if (typeof saveContract.resolveInitialTranscriptGpa !== "function") return;

  assert.equal(
    saveContract.resolveInitialTranscriptGpa({
      declaredGpa: 3.74,
      summaryOverallGpa: 3.74,
      extractedGpa: 3.75,
    }),
    3.74,
  );
});

test("cleans up the created version when a later transcript insert fails", async () => {
  const calls = [];

  await assert.rejects(
    () =>
      persistTranscriptBundle({
        createVersion: async () => {
          calls.push("version");
          return { id: "review-version" };
        },
        insertCourses: async () => {
          calls.push("courses");
        },
        insertSemesterSummaries: async () => {
          calls.push("summaries");
          throw new Error("summary insert failed");
        },
        cleanup: async (version) => {
          calls.push(`cleanup:${version.id}`);
        },
      }),
    /summary insert failed/,
  );

  assert.deepEqual(calls, [
    "version",
    "courses",
    "summaries",
    "cleanup:review-version",
  ]);
});
