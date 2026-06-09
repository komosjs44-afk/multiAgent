import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { NextResponse } from "next/server";

import { isCareerAnalysis, isUserProfile } from "@/lib/validation";
import type { CareerAnalysis, UserProfile } from "@/types/career";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type RoadmapChatRequest = {
  question?: unknown;
  profile?: unknown;
  analysis?: unknown;
  messages?: unknown;
};

let keyEnvCache: Record<string, string> | null = null;

function getKeyEnv() {
  if (keyEnvCache) {
    return keyEnvCache;
  }

  const envPath = join(process.cwd(), "key.env");
  if (!existsSync(envPath)) {
    keyEnvCache = {};
    return keyEnvCache;
  }

  keyEnvCache = Object.fromEntries(
    readFileSync(envPath, "utf-8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const [key, ...valueParts] = line.split("=");
        return [key.trim(), valueParts.join("=").trim().replace(/^['"]|['"]$/g, "")];
      }),
  );

  return keyEnvCache;
}

function getEnvValue(key: string) {
  return process.env[key] || getKeyEnv()[key] || "";
}

function isChatMessages(value: unknown): value is ChatMessage[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        ((item as ChatMessage).role === "user" || (item as ChatMessage).role === "assistant") &&
        typeof (item as ChatMessage).content === "string",
    )
  );
}

function summarizeProfile(profile: UserProfile) {
  return [
    `학과: ${profile.major}`,
    `학년: ${profile.grade}`,
    `목표 진로: ${profile.career}`,
    `보유 기술: ${profile.skills}`,
    `프로젝트 경험: ${profile.projects}`,
    `자격증/시험 준비: ${profile.certificates}`,
  ].join("\n");
}

function summarizeAnalysis(analysis: CareerAnalysis) {
  const jobs = analysis.jobRecommendations
    .map(
      (job, index) =>
        [
          `${index + 1}. ${job.posting.organization} - ${job.posting.title}`,
          `출처: ${job.posting.source} / ${job.posting.sourceStatus}`,
          `역량 기반 예상 적합도: ${job.estimatedPassRate}점`,
          `매칭 역량: ${job.matchedSkills.join(", ") || "없음"}`,
          `보완 역량: ${job.missingSkills.join(", ") || "없음"}`,
        ].join("\n"),
    )
    .join("\n\n");

  const roadmap = analysis.roadmap
    .map((week) => `Week ${week.week}. ${week.title}\n- ${week.actions.join("\n- ")}`)
    .join("\n\n");

  return [
    `총점: ${analysis.totalScore}/100`,
    `강점: ${analysis.strengths.join(" / ")}`,
    `부족 역량: ${analysis.gaps.join(" / ")}`,
    `다음 액션: ${analysis.nextActions.join(" / ")}`,
    `알리오 기반 추천 공고:\n${jobs}`,
    `4주 로드맵:\n${roadmap}`,
  ].join("\n\n");
}

function isClearlyOffTopic(question: string) {
  const normalized = question.toLowerCase();
  return [
    "날씨",
    "weather",
    "기온",
    "미세먼지",
    "맛집",
    "점심",
    "저녁",
    "요리",
    "레시피",
    "영화",
    "노래",
    "주식",
    "코인",
    "환율",
  ].some((keyword) => normalized.includes(keyword));
}

function offTopicAnswer() {
  return [
    "이 챗봇은 공기업 전산직 로드맵 상담 전용입니다.",
    "날씨나 맛집 같은 일반 질문에는 답하지 않고, 알리오 공고 분석 결과와 4주 로드맵에 대한 질문만 상담합니다.",
    "",
    "예시 질문:",
    "1. 공기업 전산직 포트폴리오 주제 추천해줘",
    "2. 이번 주에 뭘 먼저 해야 해?",
    "3. 내 부족 역량 중 우선순위 정해줘",
  ].join("\n");
}

function buildMessages({
  question,
  profile,
  analysis,
  messages,
}: {
  question: string;
  profile: UserProfile;
  analysis: CareerAnalysis;
  messages: ChatMessage[];
}) {
  return [
    {
      role: "system",
      content:
        "너는 공기업 전산직 준비생을 돕는 로드맵 상담 LLM이다. 알리오 OpenAPI 기반 공고 분석 결과, 사용자 프로필, 4주 로드맵을 근거로 답한다. 실제 합격률을 예측하지 말고, 포트폴리오 주제, 이번 주 실행계획, 부족 역량 우선순위, 산출물 구성안을 구체적으로 제안한다. 한국어로 답하고 불필요한 설명은 줄인다.",
    },
    {
      role: "user",
      content: `사용자 프로필\n${summarizeProfile(profile)}\n\n분석 결과\n${summarizeAnalysis(analysis)}`,
    },
    ...messages.slice(-6).map((message) => ({
      role: message.role,
      content: message.content,
    })),
    {
      role: "user",
      content: question,
    },
  ];
}

async function callResponsesApi({
  apiKey,
  model,
  messages,
}: {
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
}) {
  const input = messages.map((message) => ({
    role: message.role === "assistant" ? "assistant" : message.role === "system" ? "system" : "user",
    content: message.content,
  }));

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input,
      reasoning: { effort: "minimal" },
      max_output_tokens: 1200,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      answer: undefined,
      error: payload?.error?.message || `Responses API failed: ${response.status}`,
    };
  }

  const outputText = payload?.output_text;
  if (typeof outputText === "string" && outputText.trim()) {
    return { answer: outputText.trim(), error: undefined };
  }

  const nestedText = payload?.output
    ?.flatMap((item: { content?: Array<{ text?: unknown }> }) => item.content ?? [])
    .map((content: { text?: unknown }) => content.text)
    .find((text: unknown) => typeof text === "string" && text.trim());
  return {
    answer: typeof nestedText === "string" && nestedText.trim() ? nestedText.trim() : undefined,
    error: undefined,
  };
}

async function callChatCompletionsApi({
  apiKey,
  model,
  messages,
}: {
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
}) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_completion_tokens: 700,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      answer: undefined,
      error: payload?.error?.message || `Chat Completions API failed: ${response.status}`,
    };
  }

  const answer = payload?.choices?.[0]?.message?.content;
  return {
    answer: typeof answer === "string" && answer.trim() ? answer.trim() : undefined,
    error: undefined,
  };
}

async function generateOpenAIAnswer({
  question,
  profile,
  analysis,
  messages,
}: {
  question: string;
  profile: UserProfile;
  analysis: CareerAnalysis;
  messages: ChatMessage[];
}) {
  const apiKey = getEnvValue("OPENAI_API_KEY");
  if (!apiKey) {
    return {
      answer: undefined,
      error: "OPENAI_API_KEY가 설정되어 있지 않습니다.",
    };
  }

  const model = getEnvValue("OPENAI_MODEL") || "gpt-5-mini";
  const openAIMessages = buildMessages({ question, profile, analysis, messages });
  const responsesResult = await callResponsesApi({ apiKey, model, messages: openAIMessages });
  if (responsesResult.answer) {
    return responsesResult;
  }

  const chatResult = await callChatCompletionsApi({ apiKey, model, messages: openAIMessages });
  if (chatResult.answer) {
    return chatResult;
  }

  return {
    answer: undefined,
    error: chatResult.error || responsesResult.error || "OpenAI API 응답에서 답변을 찾지 못했습니다.",
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RoadmapChatRequest;
    const question = typeof body.question === "string" ? body.question.trim() : "";

    if (!question || !isUserProfile(body.profile) || !isCareerAnalysis(body.analysis)) {
      return NextResponse.json({ error: "Invalid roadmap chat payload" }, { status: 400 });
    }

    if (isClearlyOffTopic(question)) {
      return NextResponse.json({ answer: offTopicAnswer(), source: "scope-guard" });
    }

    const messages = isChatMessages(body.messages) ? body.messages : [];
    const result = await generateOpenAIAnswer({
      question,
      profile: body.profile,
      analysis: body.analysis,
      messages,
    });

    if (!result.answer) {
      return NextResponse.json({
        answer: `OpenAI API 호출에 실패해서 LLM 답변을 만들지 못했습니다.\n원인: ${result.error ?? "알 수 없음"}\n\nkey.env의 OPENAI_API_KEY와 OPENAI_MODEL 설정을 확인해 주세요.`,
        source: "openai-error",
      });
    }

    return NextResponse.json({ answer: result.answer, source: "openai" });
  } catch {
    return NextResponse.json({ error: "Failed to answer roadmap question" }, { status: 500 });
  }
}
