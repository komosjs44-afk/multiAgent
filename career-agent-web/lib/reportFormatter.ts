import type { CareerAnalysis } from "@/types/career";

const scoreLabels: Array<[keyof CareerAnalysis["scoreItems"], string, number]> = [
  ["majorFit", "전공 적합도", 20],
  ["techStack", "기술스택", 20],
  ["projectExperience", "프로젝트 경험", 20],
  ["certificates", "자격증", 10],
  ["careerClarity", "진로 명확성", 15],
  ["actionability", "실행 가능성", 15],
];

function formatList(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

export function formatCareerReport(analysis: CareerAnalysis) {
  const scoreLines = scoreLabels
    .map(
      ([key, label, maxScore]) =>
        `- ${label}: ${analysis.scoreItems[key]} / ${maxScore}`,
    )
    .join("\n");

  return [
    "# Career Agent 분석 리포트",
    "",
    `## 추천 진로`,
    analysis.recommendedCareer,
    "",
    `## 총점`,
    `${analysis.totalScore} / 100`,
    "",
    "## 항목별 점수",
    scoreLines,
    "",
    "## 점수 산정 이유",
    formatList(analysis.scoreReasons),
    "",
    "## 강점",
    formatList(analysis.strengths),
    "",
    "## 약점",
    formatList(analysis.gaps),
    "",
    "## 다음 액션 플랜",
    analysis.nextActions
      .map((action, index) => `- [ ] ${index + 1}. ${action}`)
      .join("\n"),
  ].join("\n");
}
