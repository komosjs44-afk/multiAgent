import { NextResponse } from "next/server";

import { deleteJobDescription, updateJobDescription } from "@/lib/repositories/jobDescriptionRepository";
import { requireAdmin } from "@/lib/services/adminAuthService";

const ALLOWED_PATCH_FIELDS = new Set([
  "company_name",
  "recruit_title",
  "title",
  "job_field",
  "target_job",
  "description",
  "required_knowledge",
  "required_skills",
  "required_attitude",
  "qualifications",
  "preferred_certificates",
  "source",
  "source_url",
  "active",
]);

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: { message: admin.message } }, { status: admin.status });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const patch = Object.fromEntries(Object.entries(body).filter(([key]) => ALLOWED_PATCH_FIELDS.has(key)));

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { ok: false, error: { message: "수정할 필드가 없습니다." } },
      { status: 400 },
    );
  }

  const item = await updateJobDescription(id, patch);
  return NextResponse.json({ ok: true, data: { item } });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: { message: admin.message } }, { status: admin.status });
  }

  const { id } = await context.params;
  await deleteJobDescription(id);
  return NextResponse.json({ ok: true });
}
