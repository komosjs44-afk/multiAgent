import json
from pathlib import Path


SAMPLE_PROFILE_PATH = Path(__file__).parent / "sample_profile.json"
OUTPUT_PATH = Path(__file__).parent / "output.md"
USER_GUIDE_PATH = Path(__file__).parent / "output_user_guide.md"
REVIEW_REPORT_PATH = Path(__file__).parent / "review_report.md"


CAREER_REQUIRED_SKILLS = {
    "공기업 전산직": [
        "DB",
        "보안",
        "네트워크",
        "운영체제",
        "시스템 운영",
        "클라우드",
        "협업 경험",
        "문서화/보고서 작성",
        "정보처리기사/전공 시험 대비",
    ],
}


SKILL_KEYWORDS = {
    "DB": ["데이터베이스", "DB", "SQL"],
    "알고리즘": ["알고리즘", "자료구조"],
    "운영체제": ["운영체제", "OS"],
    "보안": ["보안", "정보보호", "해킹"],
    "네트워크": ["네트워크", "TCP", "IP"],
    "시스템 운영": ["시스템 운영", "인프라 운영", "서버 운영", "Linux", "리눅스"],
    "클라우드": ["클라우드", "AWS", "Azure", "GCP"],
    "협업 경험": ["프로젝트", "공모전", "팀", "협업", "기획 및 개발"],
    "문서화/보고서 작성": ["보고서", "문서화", "발표 자료", "기술 문서"],
    "정보처리기사/전공 시험 대비": ["정보처리기사", "전공 시험", "기사", "필기"],
    "전공 기초": ["전공", "컴퓨터공학", "알고리즘", "운영체제", "데이터베이스"],
    "프로젝트 경험": ["프로젝트", "개발"],
    "문제 해결": ["문제", "기획", "개발"],
    "포트폴리오": ["포트폴리오", "프로젝트", "활동"],
}


def load_profile(path=SAMPLE_PROFILE_PATH):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def analyze_profile_strengths(profile):
    strengths = []

    for course in profile.get("courses", []):
        name = course.get("name", "")
        grade = course.get("grade", "")
        if grade in ["A+", "A0", "A"]:
            strengths.append(f"{name} 과목 성취도 우수({grade})")
        elif grade in ["B+", "B0", "B"]:
            strengths.append(f"{name} 과목 기본 역량 보유({grade})")

    projects = profile.get("projects", [])
    if projects:
        project_names = ", ".join(project.get("name", "이름 없는 프로젝트") for project in projects)
        strengths.append(f"프로젝트 경험 보유({project_names})")

    certificates = profile.get("certificates", [])
    if certificates:
        strengths.append(f"자격증 준비 또는 보유 경험({', '.join(certificates)})")

    activities = profile.get("activities", [])
    if activities:
        strengths.append(f"활동 경험 보유({', '.join(activities)})")

    interests = profile.get("interests", [])
    if interests:
        strengths.append(f"관심 분야가 명확함({', '.join(interests)})")

    return strengths or ["아직 명확한 강점 증거가 부족합니다."]


def get_required_skills(target_career):
    return CAREER_REQUIRED_SKILLS.get(
        target_career,
        ["전공 기초", "프로젝트 경험", "협업 경험", "문제 해결", "포트폴리오"],
    )


def analyze_gaps(profile, required_skills):
    evidence_text = _make_evidence_text(profile)
    gaps = []
    covered = []

    for skill in required_skills:
        keywords = SKILL_KEYWORDS.get(skill, [skill])
        matched_keywords = [keyword for keyword in keywords if keyword.lower() in evidence_text]
        if matched_keywords:
            covered.append({
                "skill": skill,
                "evidence": ", ".join(matched_keywords),
            })
        else:
            gaps.append(skill)

    return {
        "covered": covered,
        "gaps": gaps,
    }


def recommend_activities(gaps):
    recommendations = {
        "DB": "SQL 문제 풀이와 데이터 모델링 미니 프로젝트를 진행합니다.",
        "알고리즘": "매주 알고리즘 문제 풀이 기록을 만들고 약한 유형을 정리합니다.",
        "운영체제": "프로세스, 메모리, 파일 시스템 개념을 요약하고 실습 예제를 정리합니다.",
        "보안": "보안 기초를 학습한 뒤 로그인 기능 보안 점검 미니 프로젝트를 진행합니다.",
        "네트워크": "TCP/IP, HTTP, DNS 흐름을 정리하고 패킷 흐름 실습 기록을 만듭니다.",
        "시스템 운영": "Linux 명령어, 프로세스 확인, 로그 확인 흐름을 실습합니다.",
        "클라우드": "클라우드 기본 개념을 정리하고 간단한 서버 배포 과정을 실습합니다.",
        "협업 경험": "팀 프로젝트에서 역할, 의사결정, 결과물을 포트폴리오로 정리합니다.",
        "문서화/보고서 작성": "프로젝트 개요, 문제 해결 과정, 결과를 1쪽 보고서로 작성합니다.",
        "정보처리기사/전공 시험 대비": "정보처리기사 필기 또는 전공 CS 과목별 핵심 개념을 정리합니다.",
        "전공 기초": "목표 진로와 연결되는 전공 과목을 정리합니다.",
        "프로젝트 경험": "작은 기능 하나라도 완성하는 개인 프로젝트를 진행합니다.",
        "문제 해결": "문제 상황, 해결 과정, 결과를 문서화하는 연습을 합니다.",
        "포트폴리오": "수업, 프로젝트, 활동을 목표 진로 기준으로 재정리합니다.",
    }

    if not gaps:
        return ["현재 강점과 프로젝트 경험을 목표 진로 기준으로 포트폴리오에 정리합니다."]

    return [
        recommendations.get(gap, f"{gap} 역량을 보여줄 수 있는 작은 결과물을 만듭니다.")
        for gap in gaps
    ]


def make_roadmap(gaps, activities):
    focus_items = gaps[:4] or ["포트폴리오 정리"]
    activity_items = activities[:4] or ["현재 강점을 목표 진로 기준으로 정리합니다."]
    week_plans = [
        ("개념 학습", "{focus} 핵심 개념을 정리하고 관련 키워드 10개를 요약합니다."),
        ("실습", "{activity}"),
        ("작은 결과물 제작", "{focus} 역량을 보여줄 수 있는 미니 산출물을 만듭니다."),
        ("포트폴리오 정리", "학습 내용, 실습 과정, 결과물을 포트폴리오 문장으로 정리합니다."),
    ]

    roadmap = []
    for index in range(4):
        focus = focus_items[index] if index < len(focus_items) else focus_items[-1]
        activity = activity_items[index] if index < len(activity_items) else activity_items[-1]
        goal, template = week_plans[index]
        roadmap.append({
            "week": index + 1,
            "focus": focus,
            "action": f"{goal}: {template.format(focus=focus, activity=activity)}",
        })

    return roadmap


def write_markdown(profile, strengths, gap_result, activities, roadmap):
    lines = [
        f"# {profile.get('name', '사용자')} 커리어 분석 결과",
        "",
        "## 기본 정보",
        f"- 학과: {profile.get('major', '미입력')}",
        f"- 학년: {profile.get('grade', '미입력')}",
        f"- 목표 진로: {profile.get('target_career', '미입력')}",
        "",
        "## 현재 강점",
    ]

    lines.extend(f"- {strength}" for strength in strengths)

    lines.extend([
        "",
        "## 부족 역량",
    ])

    gaps = gap_result["gaps"]
    if gaps:
        lines.extend(f"- {gap}" for gap in gaps)
    else:
        lines.append("- 입력된 정보 기준으로 주요 필요 역량의 기초 증거가 확인됩니다.")

    lines.extend([
        "",
        "## 추천 활동",
    ])

    lines.extend(f"{index}. {activity}" for index, activity in enumerate(activities, start=1))

    lines.extend([
        "",
        "## 4주 로드맵",
    ])

    for item in roadmap:
        lines.extend([
            f"### Week {item['week']}",
            f"- 집중 역량: {item['focus']}",
            f"- 실행 과제: {item['action']}",
            "",
        ])

    return "\n".join(lines).rstrip()


def write_output_markdown(profile, strengths, gap_result):
    lines = [
        "# 핵심 분석 결과",
        "",
        "## 기본 정보",
        f"- 이름: {profile.get('name', '미입력')}",
        f"- 학과: {profile.get('major', '미입력')}",
        f"- 학년: {profile.get('grade', '미입력')}",
        f"- 목표 진로: {profile.get('target_career', '미입력')}",
        "",
        "## 현재 강점",
    ]

    lines.extend(f"- {strength}" for strength in strengths)
    lines.extend(["", "## 부족 역량"])

    gaps = gap_result["gaps"]
    if gaps:
        lines.extend(f"- {gap}" for gap in gaps)
    else:
        lines.append("- 입력된 정보 기준으로 주요 필요 역량의 기초 증거가 확인됩니다.")

    lines.extend(["", "## 보유 근거"])
    covered = gap_result["covered"]
    if covered:
        for item in covered:
            lines.append(f"- {item['skill']}: {item['evidence']}")
    else:
        lines.append("- 아직 명확한 보유 근거가 부족합니다.")

    return "\n".join(lines).rstrip()


def write_user_guide_markdown(profile, activities, roadmap):
    lines = [
        "# 사용자 실행 가이드",
        "",
        f"대상: {profile.get('name', '사용자')}",
        f"목표 진로: {profile.get('target_career', '미입력')}",
        "",
        "## 추천 활동",
    ]

    lines.extend(f"{index}. {activity}" for index, activity in enumerate(activities, start=1))

    lines.extend(["", "## 4주 실행 로드맵"])
    for item in roadmap:
        lines.extend([
            f"### Week {item['week']}",
            f"- 집중 역량: {item['focus']}",
            f"- 실행 과제: {item['action']}",
            "",
        ])

    return "\n".join(lines).rstrip()


def write_review_report(profile, gap_result, activities, roadmap):
    checks = [
        ("입력 파일을 읽었는가", bool(profile)),
        ("목표 진로가 있는가", bool(profile.get("target_career"))),
        ("부족 역량을 생성했는가", bool(gap_result["gaps"])),
        ("추천 활동을 생성했는가", bool(activities)),
        ("4주 로드맵을 생성했는가", len(roadmap) == 4),
    ]

    lines = [
        "# 검토 보고서",
        "",
        "## 점검 결과",
        "| 항목 | 결과 |",
        "|---|---|",
    ]

    for label, passed in checks:
        result = "통과" if passed else "확인 필요"
        lines.append(f"| {label} | {result} |")

    lines.extend([
        "",
        "## 구현 수준",
        "- 기본형: 규칙 기반 함수 에이전트",
        "- 외부 API, LLM, Docker, LangGraph, RAG는 사용하지 않음",
        "",
        "## 현재 한계",
        "- 입력 데이터의 표현이 크게 바뀌면 키워드 기반 판단이 부정확할 수 있습니다.",
        "- 목표 진로별 필요 역량은 현재 코드에 정의된 규칙에 의존합니다.",
        "- 관심 분야는 참고 정보이며 실제 보유 역량으로 바로 인정하지 않습니다.",
    ])

    return "\n".join(lines).rstrip()


def save_outputs(profile, strengths, gap_result, activities, roadmap):
    OUTPUT_PATH.write_text(
        write_output_markdown(profile, strengths, gap_result),
        encoding="utf-8",
    )
    USER_GUIDE_PATH.write_text(
        write_user_guide_markdown(profile, activities, roadmap),
        encoding="utf-8",
    )
    REVIEW_REPORT_PATH.write_text(
        write_review_report(profile, gap_result, activities, roadmap),
        encoding="utf-8",
    )


def main():
    profile = load_profile()
    target_career = profile.get("target_career", "")
    strengths = analyze_profile_strengths(profile)
    required_skills = get_required_skills(target_career)
    gap_result = analyze_gaps(profile, required_skills)
    activities = recommend_activities(gap_result["gaps"])
    roadmap = make_roadmap(gap_result["gaps"], activities)
    markdown = write_markdown(profile, strengths, gap_result, activities, roadmap)
    save_outputs(profile, strengths, gap_result, activities, roadmap)

    print(markdown)


def _make_evidence_text(profile):
    evidence_parts = []

    for course in profile.get("courses", []):
        evidence_parts.append(course.get("name", ""))
        evidence_parts.append(course.get("grade", ""))

    for project in profile.get("projects", []):
        evidence_parts.append(project.get("name", ""))
        evidence_parts.append(project.get("role", ""))
        evidence_parts.append(project.get("description", ""))

    evidence_parts.extend(profile.get("certificates", []))
    evidence_parts.extend(_strong_activity_evidence(profile.get("activities", [])))

    return " ".join(evidence_parts).lower()


def _strong_activity_evidence(activities):
    weak_words = ["관심", "준비", "예정", "희망"]
    return [
        activity
        for activity in activities
        if not any(weak_word in activity for weak_word in weak_words)
    ]


if __name__ == "__main__":
    main()
