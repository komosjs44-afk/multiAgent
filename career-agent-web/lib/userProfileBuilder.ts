import type {
  AcademicRecord,
  CareerProfileRecord,
  EvidenceRecord,
  UserProfile,
} from "@/types/career";

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function buildUserProfile({
  profile,
  academic,
  evidence,
}: {
  profile: CareerProfileRecord;
  academic: AcademicRecord[];
  evidence: EvidenceRecord[];
}): UserProfile {
  const academicSkills = academic.flatMap((item) => item.skill_mapping);
  const evidenceSkills = evidence.flatMap((item) => item.skills);
  const courses = academic.map((item) =>
    [
      item.course_name,
      item.grade ? `성적 ${item.grade}` : "",
      item.semester,
      item.skill_mapping.join(", "),
    ]
      .filter(Boolean)
      .join(" / "),
  );
  const projectEvidence = evidence
    .filter((item) =>
      ["project", "hackathon", "award", "internship", "activity", "study"].includes(
        item.type,
      ),
    )
    .map((item) =>
      [
        `[${item.type}] ${item.title}`,
        item.organization,
        item.role,
        item.result,
        item.description,
        item.evidence_text,
      ]
        .filter(Boolean)
        .join(" / "),
    );
  const certificates = evidence
    .filter((item) => item.type === "certificate")
    .map((item) => item.title);
  const gpaText = profile.gpa != null ? `GPA ${profile.gpa}` : "";
  const targetJob = profile.target_job || profile.target_career || "공기업 전산직";

  return {
    major: profile.major,
    grade: profile.grade,
    career: [profile.target_company, targetJob].filter(Boolean).join(" "),
    targetCompany: profile.target_company || undefined,
    targetCompanyType: profile.target_company_type || undefined,
    skills: unique([...academicSkills, ...evidenceSkills]).join(", "),
    projects: [...courses, ...projectEvidence, gpaText].filter(Boolean).join("\n"),
    certificates: certificates.join(", "),
  };
}
