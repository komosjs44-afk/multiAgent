import {
  findExistingJobDescriptionKeys,
  insertJobDescriptions,
  makeJobDescriptionKey,
  type JobDescriptionUpsertInput,
} from "@/lib/repositories/jobDescriptionRepository";

const REQUIRED_COLUMNS = ["company_name", "recruit_title", "job_field"];
const KEYWORDS = [
  "DB",
  "SQL",
  "Python",
  "Java",
  "API",
  "Linux",
  "네트워크",
  "보안",
  "운영체제",
  "클라우드",
  "데이터분석",
  "시스템운영",
  "정보보안",
  "개발",
  "전산",
  "정보화",
];

export type ImportResult = {
  totalRows: number;
  inserted: number;
  skippedDuplicates: number;
  failed: number;
  errors: Array<{ row: number; reason: string }>;
};

function parseCsvLine(line: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && next === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  result.push(current.trim());
  return result;
}

export function parseCsv(text: string) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  const headers = parseCsvLine(lines[0] ?? "").map((header) => header.trim());
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
  return { headers, rows };
}

function splitList(value: string) {
  return value
    .split(/[\n,;/|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function extractJobKeywords(text: string) {
  const normalized = text.toLowerCase();
  return KEYWORDS.filter((keyword) => normalized.includes(keyword.toLowerCase()));
}

export async function importJobDescriptionsFromCsv(csvText: string): Promise<ImportResult> {
  const { headers, rows } = parseCsv(csvText);
  const errors: ImportResult["errors"] = [];
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));

  if (missingColumns.length) {
    return {
      totalRows: rows.length,
      inserted: 0,
      skippedDuplicates: 0,
      failed: rows.length,
      errors: [{ row: 1, reason: `Missing required columns: ${missingColumns.join(", ")}` }],
    };
  }

  const existingKeys = await findExistingJobDescriptionKeys();
  const pendingKeys = new Set<string>();
  const insertRows: JobDescriptionUpsertInput[] = [];
  let skippedDuplicates = 0;

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const companyName = row.company_name?.trim() ?? "";
    const recruitTitle = row.recruit_title?.trim() ?? "";
    const jobField = row.job_field?.trim() ?? "";

    if (!companyName) {
      errors.push({ row: rowNumber, reason: "company_name is required" });
      return;
    }
    if (!recruitTitle) {
      errors.push({ row: rowNumber, reason: "recruit_title is required" });
      return;
    }
    if (!jobField) {
      errors.push({ row: rowNumber, reason: "job_field is required" });
      return;
    }

    const key = makeJobDescriptionKey({
      company_name: companyName,
      recruit_title: recruitTitle,
      job_field: jobField,
    });
    if (existingKeys.has(key) || pendingKeys.has(key)) {
      skippedDuplicates += 1;
      return;
    }
    pendingKeys.add(key);

    const textForKeywords = [
      row.required_skills,
      row.required_knowledge,
      row.required_attitude,
      row.qualifications,
      row.preferred_qualifications,
      row.description,
    ].join(" ");
    const extractedKeywords = extractJobKeywords(textForKeywords);

    insertRows.push({
      company_name: companyName,
      recruit_title: recruitTitle,
      title: recruitTitle,
      job_field: jobField,
      target_job: jobField,
      description: row.description ?? "",
      required_knowledge: splitList(row.required_knowledge ?? ""),
      required_skills: Array.from(new Set([...splitList(row.required_skills ?? ""), ...extractedKeywords])),
      required_attitude: splitList(row.required_attitude ?? ""),
      qualifications: splitList(row.qualifications ?? row.preferred_qualifications ?? ""),
      preferred_certificates: splitList(row.preferred_certificates ?? ""),
      source: row.source || "csv_import",
      source_url: row.recruit_url || row.source_url || null,
      active: true,
    });
  });

  const inserted = await insertJobDescriptions(insertRows);

  return {
    totalRows: rows.length,
    inserted: inserted.length,
    skippedDuplicates,
    failed: errors.length,
    errors,
  };
}
