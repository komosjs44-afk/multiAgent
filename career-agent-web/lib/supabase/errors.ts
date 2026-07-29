/**
 * 이번 세션에서 추가한 새 테이블/컬럼(academic_transcript_versions 등)이 아직 마이그레이션
 * 미적용으로 존재하지 않을 때 PostgREST/Postgres가 던지는 에러인지 판별합니다. 이 경우 예전
 * 화면(버전 개념 없이 기존 academic_records 그대로 표시)으로 자동 폴백하기 위해 사용합니다.
 */
export function isMissingSchemaError(error: unknown): boolean {
  const message = toMessage(error).toLowerCase();
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  return (
    code === "42p01" || // undefined_table
    code === "42703" || // undefined_column
    code === "pgrst205" || // PostgREST: table not found in schema cache
    code === "pgrst204" || // PostgREST: column not found in schema cache
    message.includes("could not find the table") ||
    message.includes("could not find the") && message.includes("column") ||
    message.includes("schema cache")
  );
}

export function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return String(error ?? "");
}

/**
 * Supabase 호출 실패를 사용자에게 보여줄 메시지/상태코드로 분류합니다.
 * 네트워크 연결 실패(521 등)는 코드에서 원인을 확정할 수 없으므로 "추정"임을 명시합니다.
 */
export function describeSupabaseError(
  error: unknown,
  fallback = "Supabase 요청 처리 중 오류가 발생했습니다.",
): { message: string; status: number } {
  const raw = toMessage(error);
  const lower = raw.toLowerCase();

  if (raw.includes("environment variables")) {
    return {
      status: 503,
      message:
        "Supabase 환경변수(NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)가 설정되지 않았습니다.",
    };
  }

  const looksLikeConnectionFailure =
    lower.includes("fetch failed") ||
    lower.includes("enotfound") ||
    lower.includes("econnrefused") ||
    lower.includes("521") ||
    lower.includes("auth retryable fetch") ||
    lower.includes("network");

  if (looksLikeConnectionFailure) {
    return {
      status: 502,
      message:
        "Supabase 서버에 연결하지 못했습니다. 프로젝트가 일시중지·삭제되었거나 " +
        "NEXT_PUBLIC_SUPABASE_URL이 올바르지 않을 수 있습니다. " +
        "(코드에서 확정할 수 없는 추정 원인이며, Supabase 대시보드에서 프로젝트 상태를 직접 확인해야 합니다.)",
    };
  }

  return { status: 500, message: raw || fallback };
}
