export type StableJobKeyInput = {
  sourceType: "supabase" | "alio" | "fallback" | "unknown";
  id?: string | number | null;
  recruitmentNo?: string | number | null;
  companyName?: string | null;
  recruitTitle?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

export function slugifyJobKeyPart(value: string | number | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣-_]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function createStableJobKey(input: StableJobKeyInput) {
  const raw =
    input.id ??
    input.recruitmentNo ??
    `${input.companyName ?? "unknown"}-${input.recruitTitle ?? "untitled"}-${input.startDate ?? "no-start"}-${
      input.endDate ?? "no-end"
    }`;

  const slug = slugifyJobKeyPart(raw) || "unknown";
  return `${input.sourceType}-${slug}`;
}
