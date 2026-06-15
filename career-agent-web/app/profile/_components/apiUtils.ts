export async function postJson(path: string, body: Record<string, unknown>): Promise<void> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `${path} 요청 실패`);
  }
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
