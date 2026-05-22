# Career Agent 발표

## 1. 문제

공기업 전산직 준비생은 채용공고를 확인해도 자신의 현재 역량이 실제 요구역량과 얼마나 맞는지 알기 어렵습니다.

기존 취업 플랫폼은 공고를 보여주는 데 집중하지만, DB, 보안, 네트워크, 운영체제, 시스템 운영, 문서화 같은 전산직 핵심 역량 중 무엇이 부족한지 구체적으로 알려주지 않습니다.

## 2. 만든 것

공기업 전산직 준비생을 위한 AI Career Gap Analysis Agent를 만들었습니다.

`sample_profile.json`을 읽어 현재 강점, 부족 역량, 우선 보완 역량, 추천 학습 방향, 4주 실행 루틴을 출력합니다.

웹앱에서는 프로필, Evidence, Academic Record, 데모 공고를 기반으로 역량 기반 예상 적합도를 계산하고 Markdown 리포트를 복사할 수 있습니다.

## 3. 에이전트 구조

프로필 분석자 → 공고 요구역량 비교자 → Gap 분석자 → 준비 우선순위 작성자 → 로드맵 작성자 → 검토자

| 역할 | 함수/모듈 | 설명 |
|---|---|---|
| 프로필 분석자 | `analyze_profile_strengths` | 수업, 성적, 프로젝트, 자격증, 활동에서 강점을 찾습니다. |
| Gap 분석자 | `analyze_gaps` | 공기업 전산직 요구역량과 현재 근거를 비교합니다. |
| 학습 방향 작성자 | `recommend_activities` | 부족 역량별 추천 학습 방향과 추천 프로젝트를 제안합니다. |
| 로드맵 작성자 | `make_roadmap` | 4주 공기업 전산직 준비 루틴을 만듭니다. |
| 검토자 | `write_review_report` | 결과 파일 생성과 한계를 점검합니다. |

## 4. 구현 수준

Python 제출용 MVP는 기본형입니다. 외부 API 없이 `python career_agent.py`로 실행되는 규칙 기반 함수 에이전트입니다.

Next.js 웹앱은 공기업 전산직 Gap 분석 방향으로 확장되어 있으며, Supabase 기반 Profile/Evidence/Academic/Analysis History 구조를 갖고 있습니다.

## 5. 실행 결과

- `output.md`: 공기업 전산직 Gap 분석 결과
- `output_user_guide.md`: 우선 보완 역량과 4주 실행 루틴
- `review_report.md`: 점검 결과와 현재 한계
- 웹앱 Markdown Report: Public Enterprise IT Career Gap Analysis Report

## 6. 사용한 코딩에이전트와 외부 도구

- Codex: 코드 구현, 문서 정리, 실행 확인, MVP 방향 재정의에 사용
- 외부 API: 현재 실제 연동 없음
- LLM API: 현재 실제 연동 없음
- fallback: 잡알리오 API 미연결 시 데모 공고 사용

## 7. 한계

현재 분석은 키워드 기반 규칙에 의존합니다.

실제 잡알리오 API와 Supabase 키가 연결되기 전까지는 데모 공고와 체험 모드 중심으로 동작합니다.

## 8. 1분 데모 흐름

1. `sample_profile.json`에서 공기업 전산직 준비생 입력을 보여줍니다.
2. `sample_notices.txt`에서 데모 공고를 보여줍니다.
3. `python career_agent.py`를 실행합니다.
4. `output.md`의 부족 역량을 보여줍니다.
5. `output_user_guide.md`의 4주 실행 루틴을 보여줍니다.
6. 웹앱에서는 `http://127.0.0.1:3100`에서 DEMO 공고 기반 분석 결과를 보여줍니다.
