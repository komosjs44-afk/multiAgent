import { NextResponse } from "next/server";

import { analyzeCareer } from "@/lib/careerAgent";
import { isUserProfile, validateProfile } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!isUserProfile(body)) {
      return NextResponse.json(
        { error: "Invalid profile payload" },
        { status: 400 },
      );
    }

    const validation = validateProfile(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: "Invalid profile input", errors: validation.errors },
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
