export async function postJson<T = void>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) {
    throw new Error(payload?.error ?? `${path} 요청 실패`);
  }
  return payload as T;
}

export async function patchJson(path: string, body: Record<string, unknown>): Promise<void> {
  const res = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `${path} 요청 실패`);
  }
}

export async function deleteRecord(id: string): Promise<void> {
  const res = await fetch(`/api/evidence-records?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "삭제 실패");
  }
}

export async function updateEvidence(
  oldId: string,
  newData: Record<string, unknown>,
): Promise<void> {
  await patchJson("/api/evidence-records", { id: oldId, ...newData });
}

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `${path} 요청 실패`);
  }
  return (await res.json()) as T;
}

export function toSkillCandidates(
  rows: import("@/types/career").EvidenceSkillRow[],
): import("@/types/career").EvidenceSkillCandidate[] {
  return rows.map((row) => ({
    skillCode: row.skill_code,
    contributionLevel: row.contribution_level,
    confidence: row.confidence,
    matchedKeywords: row.matched_keywords,
    reason: row.reason ?? "",
    source: row.source,
  }));
}

export async function fetchSkillPreview(
  body: Record<string, unknown>,
): Promise<import("@/types/career").EvidenceSkillCandidate[]> {
  const res = await fetch("/api/evidence/skill-preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "역량 후보 추출에 실패했습니다.");
  }
  const payload = (await res.json()) as { data: import("@/types/career").EvidenceSkillCandidate[] };
  return payload.data;
}
