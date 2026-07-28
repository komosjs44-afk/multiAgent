import { extractSkillCandidates, type EvidenceMapperInput } from "@/lib/evidenceMapper";
import type { EvidenceSkillCandidate } from "@/types/career";

/**
 * Evidence 미리보기(POST /api/evidence/skill-preview)와 저장 흐름이 공유하는 단일 진입점입니다.
 * 매핑 로직은 lib/evidenceMapper.ts 한 곳에만 존재하며, 이 함수는 그것을 그대로 위임합니다.
 */
export function previewEvidenceSkillCandidates(input: EvidenceMapperInput): EvidenceSkillCandidate[] {
  return extractSkillCandidates(input);
}

export function evidenceMapperInputFromRecord(record: {
  title: string;
  type: EvidenceMapperInput["type"];
  description?: string | null;
  skills?: string[] | string | null;
  role?: string | null;
  implemented_features?: string | null;
  problem_solved?: string | null;
  result?: string | null;
  evidence_url?: string | null;
}): EvidenceMapperInput {
  return {
    title: record.title,
    type: record.type,
    description: record.description,
    technologies: record.skills,
    role: record.role,
    implementedFeatures: record.implemented_features,
    problemSolved: record.problem_solved,
    outcome: record.result,
    evidenceUrl: record.evidence_url,
  };
}
