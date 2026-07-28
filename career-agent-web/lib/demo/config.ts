export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000099";
export const DEMO_USER_EMAIL = "demo@gongfit.example";
export const DEMO_USER_NAME = "데모 사용자";
