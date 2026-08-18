import { NextResponse } from "next/server";

import {
  normalizeTranscriptPageText,
  parseTranscriptPages,
} from "@/lib/transcriptParser";
import { resolveInitialTranscriptGpa } from "@/lib/transcriptSaveContract";
import {
  extractTranscriptText,
  OcrFallbackUnavailableError,
  PdfTextLayerExtractor,
  type TranscriptTextExtraction,
} from "@/lib/transcriptExtraction";
import type { EvidenceDocumentType, ExtractedEvidence } from "@/types/career";

export const runtime = "nodejs";

const VALID_DOC_TYPES: readonly EvidenceDocumentType[] = [
  "transcript",
  "contest",
  "certificate",
  "portfolio",
];

const COURSE_SKILL_ALIASES = [
  { keywords: ["자료구조"], skill: "자료구조" },
  { keywords: ["운영체제"], skill: "운영체제" },
  { keywords: ["데이터베이스", "DB"], skill: "데이터베이스" },
  { keywords: ["데이터통신", "네트워크"], skill: "네트워크" },
  { keywords: ["컴퓨터구조", "논리회로"], skill: "컴퓨터구조" },
  { keywords: ["알고리즘"], skill: "알고리즘" },
  { keywords: ["보안", "정보보안"], skill: "보안" },
  { keywords: ["소프트웨어공학", "공학설계"], skill: "소프트웨어공학" },
  { keywords: ["AI", "인공지능", "머신러닝", "딥러닝"], skill: "AI" },
  { keywords: ["프로그래밍", "C언어", "자바", "파이썬", "웹프로그래밍"], skill: "프로그래밍" },
];

const CERTIFICATE_ALIASES = [
  { keywords: ["정보처리기사", "정처기"], name: "정보처리기사" },
  { keywords: ["SQLD"], name: "SQLD" },
  { keywords: ["컴퓨터활용능력", "컴활"], name: "컴퓨터활용능력" },
  { keywords: ["한국사"], name: "한국사능력검정" },
  { keywords: ["TOEIC", "토익"], name: "TOEIC" },
  { keywords: ["OPIc", "오픽"], name: "OPIc" },
  { keywords: ["TOPCIT"], name: "TOPCIT" },
  { keywords: ["정보보안기사"], name: "정보보안기사" },
];

function isEvidenceDocumentType(value: unknown): value is EvidenceDocumentType {
  return typeof value === "string" && VALID_DOC_TYPES.includes(value as EvidenceDocumentType);
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function extractGpa(text: string) {
  const slashMatches = [...text.matchAll(/([0-4](?:\.\d{1,2})?)\s*\/\s*4\.5/gi)];
  if (slashMatches.length) {
    return slashMatches[slashMatches.length - 1]?.[1];
  }

  const patterns = [
    /(?:총\s*평점평균|평점평균|GPA|학점)[^\d]{0,16}([0-4](?:\.\d{1,2})?)/i,
    /([0-4](?:\.\d{1,2})?)\s*\/\s*4\.3/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }

  return undefined;
}

function inferSkillMapping(courseName: string) {
  return unique(
    COURSE_SKILL_ALIASES.filter((alias) =>
      alias.keywords.some((keyword) =>
        courseName.toLowerCase().includes(keyword.toLowerCase()),
      ),
    ).map((alias) => alias.skill),
  );
}

function extractCertificates(text: string) {
  return unique(
    CERTIFICATE_ALIASES.filter((certificate) =>
      certificate.keywords.some((keyword) =>
        text.toLowerCase().includes(keyword.toLowerCase()),
      ),
    ).map((certificate) => certificate.name),
  );
}

function extractProjects(text: string, fileName: string, docType: EvidenceDocumentType) {
  const projectTerms = ["프로젝트", "공모전", "해커톤", "포트폴리오", "개발", "서비스"];
  if (
    docType === "portfolio" ||
    docType === "contest" ||
    projectTerms.some((term) => text.includes(term))
  ) {
    return [`${docType === "contest" ? "공모전/해커톤" : "포트폴리오"} (${fileName})`];
  }

  return [];
}

function buildExtraction({
  fileName,
  docType,
  extraction,
}: {
  fileName: string;
  docType: EvidenceDocumentType;
  extraction: TranscriptTextExtraction;
}): ExtractedEvidence {
  const normalizedPages = extraction.pages.map((page) => ({
    page: page.page,
    text: normalizeTranscriptPageText(page.text).text,
  }));
  const normalizedText =
    docType === "transcript"
      ? normalizedPages.map((page) => page.text).join("\n\f\n")
      : normalizeText(extraction.originalText);
  const structuredResult =
    docType === "transcript" ? parseTranscriptPages(extraction.pages) : undefined;
  const parsedCourses = structuredResult?.courses ?? [];
  const diagnostics = structuredResult?.diagnostics;
  const summary = structuredResult?.summary;
  const semesterSummaries = structuredResult?.semesterSummaries;

  if (docType === "transcript") {
    // 개인정보(원문·과목명)는 남기지 않고, 진단에 필요한 개수/길이만 기록합니다.
    console.log("[evidence/extract] transcript parsed", {
      rawTextLength: extraction.originalText.length,
      detectedSemesterCount: diagnostics?.detectedSemesterCount,
      detectedCourseCodeCount: diagnostics?.detectedCourseCodeCount,
      parsedCourseCount: diagnostics?.parsedCourseCount,
      needsReviewCount: diagnostics?.needsReviewCount,
      confidencePercent: summary?.confidencePercent,
    });
  }

  const courses = parsedCourses.map((course) => ({
    semester: course.semester,
    category: course.category,
    categoryRaw: course.categoryRaw,
    categoryNormalized: course.categoryNormalized,
    courseCode: course.courseCode,
    courseName: course.courseName,
    credit: course.credit,
    grade: course.grade,
    skillMapping: inferSkillMapping(course.courseName),
    originalCredit: course.originalCredit,
    isBracketedCredit: course.isBracketedCredit,
    originalSemester: course.originalSemester,
    confidence: course.confidence,
    needsReview: course.needsReview,
    reviewReasons: [...course.reviewReasons],
    normalizationChanges: [...course.normalizationChanges],
    sourcePage: course.sourcePage,
    sourceLine: course.sourceLine,
    sourceText: course.sourceText,
  }));
  const certificates = extractCertificates(normalizedText);
  const projects = extractProjects(normalizedText, fileName, docType);
  const skills = unique([
    ...courses.flatMap((course) => course.skillMapping),
    ...projects.map(() => "프로젝트"),
    ...certificates.map(() => "자격증"),
  ]);
  const warning = diagnostics?.warnings[0];
  // PDF에 총계 문구가 명시돼 있으면 그 값을 우선 쓰고, 없으면 학기별 요약을 학점 가중평균해 계산합니다.
  const extractedGpa = extractGpa(normalizedText);
  const initialGpa =
    docType === "transcript"
      ? resolveInitialTranscriptGpa({
          declaredGpa: summary?.declaredGpa ?? null,
          summaryOverallGpa: summary?.overallGpa ?? null,
          extractedGpa: extractedGpa == null ? null : Number(extractedGpa),
        })
      : null;
  const gpa = initialGpa?.toFixed(2);

  return {
    documentType: docType,
    type: docType,
    fileName,
    extractedAt: new Date().toISOString(),
    skills,
    certificates,
    projects,
    courses,
    grade: gpa,
    extractionMethod: extraction.method,
    originalText: extraction.originalText,
    normalizedText,
    pages: extraction.pages.map((page) => ({ page: page.page, text: page.text })),
    pageCount: extraction.pages.length,
    diagnostics: diagnostics
      ? {
          ...diagnostics,
          warnings: [...diagnostics.warnings],
          mismatches: [...diagnostics.mismatches],
          unmatchedRows: [...diagnostics.unmatchedRows],
          normalizationChanges: [...diagnostics.normalizationChanges],
        }
      : undefined,
    summary,
    semesterSummaries: semesterSummaries?.map((item) => ({ ...item })),
    warning,
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const docType = formData.get("docType");
    const file = formData.get("file");

    if (!isEvidenceDocumentType(docType)) {
      return NextResponse.json({ error: "유효하지 않은 문서 유형입니다." }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });
    }

    if (file.type && file.type !== "application/pdf") {
      return NextResponse.json(
        {
          error:
            "현재 서버에는 이미지 OCR 엔진이 연결되어 있지 않습니다. 텍스트 선택이 가능한 PDF를 업로드하거나 미리보기에서 직접 입력해주세요.",
        },
        { status: 400 },
      );
    }

    const pdfExtractor = new PdfTextLayerExtractor();
    const extraction =
      docType === "transcript"
        ? await extractTranscriptText(file, pdfExtractor)
        : await pdfExtractor.extract(file);
    return NextResponse.json(buildExtraction({ fileName: file.name, docType, extraction }));
  } catch (error) {
    if (error instanceof OcrFallbackUnavailableError) {
      return NextResponse.json(
        { error: error.message, reasons: error.reasons },
        { status: 422 },
      );
    }
    // 원인 파악이 가능하도록 서버 로그에 남깁니다(에러 메시지/스택만, 문서 내용은 포함하지 않음).
    console.error("[evidence/extract] failed", error);
    const message =
      error instanceof Error ? error.message : "문서 처리에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
