import { NextResponse } from "next/server";

import { importJobDescriptionsFromCsv } from "@/lib/services/jobDescriptionImportService";
import { requireAdmin } from "@/lib/services/adminAuthService";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: { message: admin.message } }, { status: admin.status });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: { message: "CSV 파일을 업로드해주세요." } },
      { status: 400 },
    );
  }

  const csvText = await file.text();
  const result = await importJobDescriptionsFromCsv(csvText);

  return NextResponse.json({
    ok: true,
    data: result,
  });
}
