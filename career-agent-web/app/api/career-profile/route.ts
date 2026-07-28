import { NextResponse } from "next/server";

import { createClient, getCurrentUserId, getProfile, savePartialProfile } from "@/lib/supabase/server";
import { describeSupabaseError } from "@/lib/supabase/errors";

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(getString(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return fallback;
}

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }

    const rows = await getProfile(userId);
    return NextResponse.json({
      data: Array.isArray(rows) ? rows[0] ?? null : null,
    });
  } catch (error) {
    const { message, status } = describeSupabaseError(error, "Failed to load profile.");
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    // 부분 업데이트: body에 실제로 포함된 필드만 patch에 담습니다. 기존 행을 미리 읽어와
    // 병합하지 않으므로(그러면 다른 요청과의 read-modify-write 경쟁이 생깁니다), DB의 UPDATE가
    // 요청에 없는 컬럼은 건드리지 않습니다.
    const patch: Record<string, unknown> = {};
    if ("name" in body) patch.name = getString(body.name);
    if ("university" in body) patch.university = getString(body.university);
    if ("major" in body) patch.major = getString(body.major);
    if ("grade" in body) patch.grade = getString(body.grade);
    if ("gpa" in body) patch.gpa = getNumber(body.gpa);
    if ("target_company_type" in body) patch.target_company_type = getString(body.target_company_type);
    if ("target_company" in body) patch.target_company = getString(body.target_company);
    if ("target_job" in body) patch.target_job = getString(body.target_job) || "공기업 전산직";
    if ("target_career" in body) {
      patch.target_career =
        getString(body.target_career) || (patch.target_job as string | undefined) || "공기업 전산직";
    }

    const saved = await savePartialProfile(user.id, patch);

    return NextResponse.json({ data: saved }, { status: 201 });
  } catch (error) {
    const message = getErrorMessage(error, "Failed to save profile.");
    const status = message.includes("environment variables") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
