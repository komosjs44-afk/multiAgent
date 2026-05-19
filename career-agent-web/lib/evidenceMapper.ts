import type { EvidenceAnalysisDraft, UserProfile } from "@/types/career";

function splitAndTrim(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function dedup(items: string[]): string[] {
  return Array.from(new Set(items));
}

export function mergeEvidenceToProfile(
  profile: UserProfile,
  draft: EvidenceAnalysisDraft,
): UserProfile {
  const mergedSkills = dedup([
    ...splitAndTrim(profile.skills),
    ...splitAndTrim(draft.skills),
  ]);

  const mergedCerts = dedup([
    ...splitAndTrim(profile.certificates),
    ...splitAndTrim(draft.certificates),
  ]);

  const existingProjects = profile.projects.trim();
  const newProjects = draft.projects.trim();
  const mergedProjects =
    existingProjects && newProjects
      ? `${existingProjects}\n${newProjects}`
      : existingProjects || newProjects;

  return {
    ...profile,
    skills: mergedSkills.join(", "),
    certificates: mergedCerts.join(", "),
    projects: mergedProjects,
  };
}
