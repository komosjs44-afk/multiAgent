"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  AcademicRecord,
  ExtractedEvidence,
  TranscriptDiff,
  TranscriptVersion,
} from "@/types/career";
import { getJson, postJson } from "../apiUtils";
import type { TranscriptRow } from "./TranscriptCourseEditor";
import {
  buildEditableTranscriptSummary,
  emptyTranscriptRow,
  rowsFromExtraction,
  rowsFromRecords,
  updateTranscriptRowFields,
} from "./transcriptReviewRows";

type Options = {
  pendingReviewVersion: TranscriptVersion | null;
  onRefresh: () => void;
  onToast: (message: string, type: "success" | "error") => void;
};

export default function useTranscriptReview({
  pendingReviewVersion,
  onRefresh,
  onToast,
}: Options) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [isSavingTranscript, setIsSavingTranscript] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [modalStage, setModalStage] = useState<"review" | "saved">("review");
  const [savedVersionId, setSavedVersionId] = useState<string | null>(null);
  const [versionDiff, setVersionDiff] = useState<TranscriptDiff | null>(null);
  const [transcriptRows, setTranscriptRows] = useState<TranscriptRow[]>([]);
  const [extractedGpa, setExtractedGpa] = useState("");
  const [diagnostics, setDiagnostics] = useState<ExtractedEvidence["diagnostics"]>();
  const [transcriptSummary, setTranscriptSummary] = useState<ExtractedEvidence["summary"]>();
  const [semesterSummaries, setSemesterSummaries] = useState<ExtractedEvidence["semesterSummaries"]>();
  const [lastFileName, setLastFileName] = useState("");
  const [sourceUrl, setSourceUrl] = useState<string>();
  const [extractionMethod, setExtractionMethod] = useState<"pdf-text" | "ocr">();
  const [transcriptNotice, setTranscriptNotice] =
    useState<{ message: string; type: "success" | "error" } | null>(null);
  const editableSummary = useMemo(
    () => buildEditableTranscriptSummary(transcriptSummary, transcriptRows),
    [transcriptRows, transcriptSummary],
  );

  useEffect(
    () => () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    },
    [sourceUrl],
  );

  function updateTranscriptRow(id: string, patch: Partial<TranscriptRow>) {
    setTranscriptRows((current) => updateTranscriptRowFields(current, id, patch));
  }

  function removeTranscriptRow(id: string) {
    setTranscriptRows((current) => current.filter((row) => row.id !== id));
  }

  function addTranscriptRow(semester = "") {
    setTranscriptRows((current) => [...current, emptyTranscriptRow(semester)]);
  }

  function resetReviewState() {
    setTranscriptRows([]);
    setExtractedGpa("");
    setDiagnostics(undefined);
    setTranscriptSummary(undefined);
    setSemesterSummaries(undefined);
    setLastFileName("");
    setSourceUrl(undefined);
    setExtractionMethod(undefined);
    setTranscriptNotice(null);
    setModalStage("review");
    setSavedVersionId(null);
    setVersionDiff(null);
  }

  async function handleTranscriptSelect(file: File | undefined) {
    if (!file) return;
    setIsExtracting(true);
    setSourceUrl(URL.createObjectURL(file));
    try {
      const formData = new FormData();
      formData.append("docType", "transcript");
      formData.append("file", file);
      const response = await fetch("/api/evidence/extract", { method: "POST", body: formData });
      const payload = (await response.json().catch(() => null)) as
        | (ExtractedEvidence & { error?: string })
        | null;
      if (!response.ok || !payload) {
        throw new Error(payload?.error ?? "성적표 추출에 실패했습니다.");
      }

      const rows = rowsFromExtraction(payload.courses ?? []);
      setModalStage("review");
      setSavedVersionId(null);
      setVersionDiff(null);
      setTranscriptRows(rows.length ? rows : [emptyTranscriptRow()]);
      setExtractedGpa(payload.grade ?? "");
      setDiagnostics(payload.diagnostics);
      setTranscriptSummary(payload.summary);
      setSemesterSummaries(payload.semesterSummaries);
      setLastFileName(file.name);
      setExtractionMethod(payload.extractionMethod);
      setPreviewOpen(true);
      const warning = payload.warning ?? payload.diagnostics?.warnings[0];
      setTranscriptNotice({
        message:
          warning ??
          `${file.name}에서 ${rows.length}개 과목을 추출했습니다. 저장 전에 확인해주세요.`,
        type: warning ? "error" : "success",
      });
    } catch (error) {
      setModalStage("review");
      setSavedVersionId(null);
      setVersionDiff(null);
      setTranscriptRows([emptyTranscriptRow()]);
      setExtractedGpa("");
      setDiagnostics(undefined);
      setTranscriptSummary(undefined);
      setSemesterSummaries(undefined);
      setLastFileName(file.name);
      setExtractionMethod(undefined);
      setPreviewOpen(true);
      setTranscriptNotice({
        message: error instanceof Error ? error.message : "성적표 추출에 실패했습니다.",
        type: "error",
      });
    } finally {
      setIsExtracting(false);
    }
  }

  async function resumeReview() {
    if (!pendingReviewVersion) return;
    setIsResuming(true);
    try {
      const payload = await getJson<{
        version: TranscriptVersion;
        records: AcademicRecord[];
      }>(`/api/academic-transcripts/${pendingReviewVersion.id}`);
      setTranscriptRows(rowsFromRecords(payload.records));
      setExtractedGpa(
        payload.version.cumulative_gpa == null ? "" : String(payload.version.cumulative_gpa),
      );
      setDiagnostics(undefined);
      setTranscriptSummary({
        totalCredits: payload.version.total_credits,
        overallGpa: payload.version.cumulative_gpa,
        percentile: payload.version.percentile,
        courseCount: payload.version.total_course_count,
        confidencePercent: 100,
        declaredTotalCredits: payload.version.total_credits,
        declaredGpa: payload.version.cumulative_gpa,
        gpaScale: payload.version.gpa_scale,
      });
      setSemesterSummaries(undefined);
      setLastFileName(payload.version.file_name);
      setSourceUrl(undefined);
      setExtractionMethod(undefined);
      setModalStage("saved");
      setSavedVersionId(payload.version.id);
      setVersionDiff(null);
      setTranscriptNotice({
        message: "이미 검토 저장된 성적표입니다. 내용을 확인한 뒤 적용해주세요.",
        type: "success",
      });
      setPreviewOpen(true);
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : "검토 중인 성적표를 불러오지 못했습니다.",
        "error",
      );
    } finally {
      setIsResuming(false);
    }
  }

  async function saveTranscriptVersion() {
    if (isSavingTranscript) return;
    const rowsToSave = transcriptRows
      .map((row) => ({
        ...row,
        semester: row.semester.trim() || "학기 미분류",
        category: row.category.trim(),
        courseCode: row.courseCode.trim(),
        courseName: row.courseName.trim(),
        credit: row.credit.trim(),
        grade: row.grade.trim().toUpperCase(),
      }))
      .filter((row) => row.courseName);
    if (!rowsToSave.length) {
      onToast("저장할 과목이 없습니다.", "error");
      return;
    }
    if (rowsToSave.some((row) => row.needsReview)) {
      onToast("검토 필요 행을 확인한 뒤 각 행의 ‘검토 완료’를 눌러주세요.", "error");
      return;
    }
    const confirmedGpa = Number(extractedGpa);
    if (!Number.isFinite(confirmedGpa) || confirmedGpa < 0 || confirmedGpa > 5) {
      onToast("최종 확인 GPA는 0에서 5 사이 숫자로 입력해주세요.", "error");
      return;
    }

    setIsSavingTranscript(true);
    try {
      const payload = await postJson<{ version: TranscriptVersion; diff: TranscriptDiff }>(
        "/api/academic-transcripts",
        {
          fileName: lastFileName,
          courses: rowsToSave,
          summary: editableSummary,
          semesterSummaries,
          declaredGpa: editableSummary?.declaredGpa ?? null,
          calculatedGpa: editableSummary?.calculatedGpa ?? null,
          confirmedGpa,
          gpaScale: editableSummary?.gpaScale ?? 4.5,
        },
      );
      onRefresh();
      setModalStage("saved");
      setSavedVersionId(payload.version.id);
      setVersionDiff(payload.diff);
      setTranscriptNotice({
        message: "성적표를 검토 저장했습니다. 내용을 확인한 뒤 적용해주세요.",
        type: "success",
      });
      onToast("성적표를 검토 저장했습니다.", "success");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "성적표 저장에 실패했습니다.", "error");
    } finally {
      setIsSavingTranscript(false);
    }
  }

  async function activateTranscriptVersion() {
    if (!savedVersionId || isActivating) return;
    setIsActivating(true);
    try {
      await postJson(`/api/academic-transcripts/${savedVersionId}/activate`, {});
      onRefresh();
      onToast("성적표를 적용했습니다. 이제 이 버전 기준으로 GPA와 분석이 계산됩니다.", "success");
      setPreviewOpen(false);
      resetReviewState();
    } catch (error) {
      onToast(error instanceof Error ? error.message : "성적표 적용에 실패했습니다.", "error");
    } finally {
      setIsActivating(false);
    }
  }

  return {
    isExtracting, isResuming, isSavingTranscript, isActivating, previewOpen, setPreviewOpen,
    modalStage, versionDiff, transcriptRows, extractedGpa, setExtractedGpa, diagnostics,
    transcriptSummary: editableSummary, semesterSummaries, lastFileName, sourceUrl, extractionMethod,
    transcriptNotice, updateTranscriptRow, removeTranscriptRow, addTranscriptRow,
    handleTranscriptSelect, resumeReview, saveTranscriptVersion, activateTranscriptVersion,
  };
}
