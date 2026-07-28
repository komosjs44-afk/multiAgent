function toMessage(error: unknown): string {
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
