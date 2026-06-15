import { NextResponse } from "next/server";

import { listJobDescriptions } from "@/lib/repositories/jobDescriptionRepository";
import { requireAdmin } from "@/lib/services/adminAuthService";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: { message: admin.message } }, { status: admin.status });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 100);
  const activeParam = url.searchParams.get("active");
  const active = activeParam === null || activeParam === "" ? undefined : activeParam === "true" ? "true" : "false";

  const items = await listJobDescriptions({
    q: url.searchParams.get("q") ?? undefined,
    jobField: url.searchParams.get("jobField") ?? undefined,
    source: url.searchParams.get("source") ?? undefined,
    active,
    limit: Number.isFinite(limit) ? limit : 100,
  });

  return NextResponse.json({ ok: true, data: { items } });
}
