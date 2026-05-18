SAMPLE_NOTICES = """[공지 1] 2026학년도 1학기 수강신청 안내
- 대상: 전 학년
- 일시: 2026-02-10 09:00 ~ 02-12 18:00
- 준비물: 포털 로그인, 학과 시간표

[공지 2] 졸업논문 제출 안내
- 대상: 4학년
- 마감: 2026-05-31
- 제출: PDF 파일, 학과 이메일

[공지 3] 교환학생 설명회
- 대상: 2학년 이상
- 일시: 2026-04-03 15:00
- 장소: 국제교류센터
"""


def extract_facts(notices_text):
    notices = [block.strip() for block in notices_text.strip().split("\n\n") if block.strip()]
    facts = []

    for notice in notices:
        lines = [line.strip() for line in notice.splitlines() if line.strip()]
        if not lines:
            continue

        title = lines[0]
        fact = {
            "title": title,
            "target": "",
            "datetime": "",
            "deadline": "",
            "place": "",
            "prepare": "",
            "description": "\n".join(lines[1:]),
        }

        for line in lines[1:]:
            cleaned = line.lstrip("- ").strip()
            if ":" not in cleaned:
                continue
            key, value = [part.strip() for part in cleaned.split(":", 1)]
            if key in ["대상", "대상자"]:
                fact["target"] = value
            elif key == "일시":
                fact["datetime"] = value
            elif key == "마감":
                fact["deadline"] = value
            elif key == "장소":
                fact["place"] = value
            elif key in ["준비물", "제출"]:
                fact["prepare"] = value

        facts.append(fact)

    return facts


def classify_schedule(facts):
    grouped = {}

    for fact in facts:
        target = fact.get("target", "모든 학생")
        if "전 학년" in target:
            group = "전 학년"
        elif "4학년" in target:
            group = "4학년"
        elif "3학년" in target:
            group = "3학년"
        elif "2학년 이상" in target:
            group = "2학년 이상"
        else:
            group = target or "기타 대상"

        grouped.setdefault(group, []).append(fact)

    return grouped


def write_guide(grouped):
    lines = ["# 사용자별 안내문"]

    for group, items in grouped.items():
        lines.append(f"\n## {group} 대상 안내")
        for fact in items:
            lines.append(f"\n### {fact['title']}")
            if fact["datetime"]:
                lines.append(f"- 일정: {fact['datetime']}")
            if fact["deadline"]:
                lines.append(f"- 마감: {fact['deadline']}")
            if fact["place"]:
                lines.append(f"- 장소: {fact['place']}")
            if fact["prepare"]:
                lines.append(f"- 준비물/제출: {fact['prepare']}")
            lines.append(f"- 대상: {fact['target']}")
            lines.append("- 해야 할 일: 공지 내용을 확인하고, 필요한 제출물과 일정을 준비하세요.")

    return "\n".join(lines)


def main():
    print("=== SAMPLE NOTICES ===")
    print(SAMPLE_NOTICES)

    facts = extract_facts(SAMPLE_NOTICES)
    print("\n=== EXTRACTED FACTS ===")
    for fact in facts:
        print(fact)

    grouped = classify_schedule(facts)
    print("\n=== GROUPED SCHEDULES ===")
    for group, items in grouped.items():
        print(f"{group}: {len(items)} item(s)")

    guide = write_guide(grouped)
    print("\n=== USER GUIDE ===")
    print(guide)


if __name__ == "__main__":
    main()
