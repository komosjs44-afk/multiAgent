import type { CareerAnalysis } from "@/types/career";

const scoreLabels: Array<[keyof CareerAnalysis["scoreItems"], string, number]> = [
  ["majorFit", "전공 적합도", 20],
  ["techStack", "기술 스택", 20],
  ["projectExperience", "프로젝트 경험", 20],
  ["contestExperience", "공모전/대외활동", 10],
  ["certificates", "자격증", 10],
  ["careerClarity", "진로 명확도", 10],
  ["actionability", "실행 가능성", 10],
];

function formatList(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

function formatChecklist(items: string[]) {
  return items.map((item) => `- [ ] ${item}`).join("\n");
}

export function formatCareerReport(analysis: CareerAnalysis) {
  const scoreLines = scoreLabels
    .map(
      ([key, label, maxScore]) =>
        `- ${label}: ${analysis.scoreItems[key]} / ${maxScore}`,
    )
    .join("\n");

  const topCareerLines = analysis.topCareers
    .map((career, index) =>
      [
        `### TOP ${index + 1}. ${career.name} (${career.fitScore}점)`,
        `- 추천 이유: ${career.reason}`,
        `- 부족 역량: ${career.missingSkills.length ? career.missingSkills.join(", ") : "큰 공백 없음"}`,
        "- 추천 액션:",
        formatList(career.recommendedActions),
      ].join("\n"),
    )
    .join("\n\n");

  const jobLines = analysis.jobRecommendations
    .map((job, index) =>
      [
        `### 공고 ${index + 1}. ${job.posting.organization} - ${job.posting.title}`,
        `- 역량 기반 예상 적합도: ${job.estimatedPassRate}점 / 100`,
        `- API 상태: ${job.posting.sourceStatus}`,
        `- 출처: ${job.posting.source}`,
        `- 마감: ${job.posting.deadline ?? "공고 원문 확인 필요"}`,
        `- 매칭 역량: ${job.matchedSkills.length ? job.matchedSkills.join(", ") : "확인된 항목 없음"}`,
        `- 보완 역량: ${job.missingSkills.length ? job.missingSkills.join(", ") : "큰 공백 없음"}`,
        `- 추천 자격증: ${job.recommendedCertificates.join(", ")}`,
        "- 합격 가능성 보완 루틴:",
        formatChecklist(job.boostRoutine),
        "- 예상 문제와 해결책:",
        job.expectedProblems
          .map(
            (item) =>
              `- ${item.problem}: ${item.impact} 해결책: ${item.solution}`,
          )
          .join("\n"),
      ].join("\n"),
    )
    .join("\n\n");

  const roadmapLines = analysis.roadmap
    .map((week) =>
      [`### ${week.week}주차. ${week.title}`, formatChecklist(week.actions)].join(
        "\n",
      ),
    )
    .join("\n\n");

  const riskLines = analysis.systemRisks
    .map((risk) => `- ${risk.risk}: ${risk.cause} 해결책: ${risk.mitigation}`)
    .join("\n");

  return [
    "# Public Enterprise IT Career Gap Analysis Report",
    "",
    "## 목표 직무",
    analysis.recommendedCareer,
    "",
    "## 총점",
    `${analysis.totalScore} / 100`,
    "",
    "## 항목별 점수",
    scoreLines,
    "",
    "## 공기업 전산직 Gap 분석 요약",
    topCareerLines,
    "",
    "## 공고 기반 역량 Gap 분석",
    "아래 점수는 이력서 검증 전, 공고 요구역량만 기준으로 계산한 예상 적합도입니다. 실제 합격률이 아닙니다.",
    jobLines || "- 아직 추천 공고가 없습니다.",
    "",
    "## 점수 산정 이유",
    formatList(analysis.scoreReasons),
    "",
    "## 강점",
    formatList(analysis.strengths),
    "",
    "## 우선 보완 역량",
    formatList(analysis.gaps),
    "",
    "## 추천 학습 방향",
    formatChecklist(analysis.nextActions),
    "",
    "## 4주 공기업 전산직 준비 루틴",
    roadmapLines,
    "",
    "## 시스템 예상 문제점과 해결책",
    riskLines,
  ].join("\n");
}
