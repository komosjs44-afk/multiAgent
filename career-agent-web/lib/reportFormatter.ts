import type { CareerAnalysis } from "@/types/career";

const scoreLabels: Array<[keyof CareerAnalysis["scoreItems"], string, number]> = [
  ["majorFit", "전공 적합도", 20],
  ["techStack", "기술스택", 20],
  ["projectExperience", "프로젝트 경험", 20],
  ["contestExperience", "공모전 경험", 10],
  ["certificates", "자격증", 10],
  ["careerClarity", "진로 명확성", 10],
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
    .map(
      (career, index) =>
        [
          `### TOP ${index + 1}. ${career.name} (${career.fitScore}점)`,
          `- 추천 이유: ${career.reason}`,
          `- 부족 역량: ${
            career.missingSkills.length
              ? career.missingSkills.join(", ")
              : "큰 공백 없음"
          }`,
          "- 추천 액션:",
          formatList(career.recommendedActions),
        ].join("\n"),
    )
    .join("\n\n");

  const roadmapLines = analysis.roadmap
    .map(
      (week) =>
        [
          `### ${week.week}주차. ${week.title}`,
          formatChecklist(week.actions),
        ].join("\n"),
    )
    .join("\n\n");

  return [
    "# Career Agent 분석 리포트",
    "",
    "## 추천 진로",
    analysis.recommendedCareer,
    "",
    "## 총점",
    `${analysis.totalScore} / 100`,
    "",
    "## 항목별 점수",
    scoreLines,
    "",
    "## 추천 진로 TOP 3",
    topCareerLines,
    "",
    "## 점수 산정 이유",
    formatList(analysis.scoreReasons),
    "",
    "## 강점",
    formatList(analysis.strengths),
    "",
    "## 부족한 점",
    formatList(analysis.gaps),
    "",
    "## 다음 액션 플랜",
    formatChecklist(analysis.nextActions),
    "",
    "## 4주 성장 로드맵",
    roadmapLines,
  ].join("\n");
}
