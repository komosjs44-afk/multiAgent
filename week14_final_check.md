# 14주차 최종 점검

## GitHub 저장소

- URL: 제출 전 입력 필요

## 내 에이전트

- 이름: Evidence-based Career Agent
- 해결하려는 문제: 대학생이 목표 진로 기준으로 현재 부족한 역량과 다음 실행 활동을 알기 어렵다는 문제
- 구현 수준: 기본형

## 실행 명령

- `python career_agent.py`

## 생성된 출력 파일

- output.md: 현재 강점, 부족 역량, 보유 근거
- output_user_guide.md: 추천 활동, 4주 실행 로드맵
- review_report.md: 점검 결과, 구현 수준, 현재 한계

## 에이전트 역할

| 역할 | 함수 | 설명 |
|---|---|---|
| 입력 읽기 | `load_profile` | 프로필 JSON을 읽습니다. |
| 프로필 분석자 | `analyze_profile_strengths` | 현재 강점을 정리합니다. |
| 부족 역량 분석자 | `analyze_gaps` | 필요 역량과 현재 근거를 비교합니다. |
| 추천 활동 작성자 | `recommend_activities` | 부족 역량별 활동을 제안합니다. |
| 로드맵 작성자 | `make_roadmap` | 4주 실행 계획을 작성합니다. |
| 검토자 | `write_review_report` | 결과와 한계를 점검합니다. |

## 사용한 코딩에이전트

- Codex: 기획 정리, 코드 수정, 문서 작성, 실행 확인

## 사용한 API 또는 외부 도구

- Groq API: 사용하지 않음
- 외부 도구/API: 사용하지 않음
- fallback 동작: 외부 API를 사용하지 않으므로 별도 fallback 없음

## 아직 부족한 점

- GitHub 저장소 URL을 제출 전에 입력해야 합니다.
- 목표 진로별 필요 역량 목록이 제한적입니다.
- 키워드 기반 분석이라 입력 표현이 바뀌면 판단이 부정확할 수 있습니다.
- 실제 채용공고나 학교 프로그램 데이터와 자동 연동하지 않습니다.

## TODO 상태 점검

| 항목 | 상태 |
|---|---|
| `python career_agent.py` 실행 | 완료 |
| `output.md` 생성 | 완료 |
| `output_user_guide.md` 생성 | 완료 |
| `review_report.md` 생성 | 완료 |
| README 작성 | 완료 |
| 도구 사용 기록 작성 | 완료 |
| 발표자료 초안 작성 | 완료 |
| GitHub 저장소 URL 입력 | 미완료 |

## 발표 때 보여줄 순서

1. `sample_profile.json`
2. `python career_agent.py` 실행
3. `output.md`
4. `output_user_guide.md`
5. `review_report.md`
