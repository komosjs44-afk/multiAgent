import { NextResponse } from "next/server";

import type { EvidenceDocumentType, ExtractedEvidence } from "@/types/career";

const VALID_DOC_TYPES: readonly EvidenceDocumentType[] = [
  "transcript",
  "contest",
  "certificate",
  "portfolio",
];

function isEvidenceDocumentType(value: unknown): value is EvidenceDocumentType {
  return (
    typeof value === "string" &&
    VALID_DOC_TYPES.includes(value as EvidenceDocumentType)
  );
}

function getMockExtraction(
  fileName: string,
  docType: EvidenceDocumentType,
): ExtractedEvidence {
  const base = {
    documentType: docType,
    fileName,
    extractedAt: new Date().toISOString(),
  };

  switch (docType) {
    case "transcript":
      return { ...base, skills: [], certificates: [], projects: [], grade: "3.8" };
    case "contest":
      return {
        ...base,
        skills: ["팀 협업", "프로젝트 기획"],
        certificates: [],
        projects: [`공모전/해커톤 (${fileName})`],
      };
    case "certificate":
      return {
        ...base,
        skills: [],
        certificates: [`자격증 (${fileName})`],
        projects: [],
      };
    case "portfolio":
      return {
        ...base,
        skills: ["개발", "UI 설계"],
        certificates: [],
        projects: [`포트폴리오 프로젝트 (${fileName})`],
      };
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const docType = formData.get("docType");
    const fileName = formData.get("fileName");

    if (!isEvidenceDocumentType(docType)) {
      return NextResponse.json(
        { error: "유효하지 않은 문서 유형입니다." },
        { status: 400 },
      );
    }

    if (typeof fileName !== "string" || !fileName.trim()) {
      return NextResponse.json(
        { error: "파일 이름이 필요합니다." },
        { status: 400 },
      );
    }

    return NextResponse.json(getMockExtraction(fileName.trim(), docType));
  } catch {
    return NextResponse.json(
      { error: "문서 처리에 실패했습니다." },
      { status: 500 },
    );
  }
}
