import { NextResponse } from "next/server";

import { analyzeCareer } from "@/lib/careerAgent";
import type { UserProfile } from "@/types/career";

function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const profile = value as Record<string, unknown>;
  return ["major", "grade", "career", "skills", "projects", "certificates"].every(
    (key) => typeof profile[key] === "string",
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!isUserProfile(body)) {
      return NextResponse.json(
        { error: "Invalid profile payload" },
        { status: 400 },
      );
    }

    return NextResponse.json(analyzeCareer(body));
  } catch {
    return NextResponse.json(
      { error: "Failed to analyze career profile" },
      { status: 500 },
    );
  }
}
