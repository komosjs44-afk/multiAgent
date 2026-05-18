# Evidence-based Career Agent 발표

## 1. 문제

대학생은 수업, 프로젝트, 자격증, 활동을 해도 목표 진로에 필요한 역량 중 무엇이 부족한지 알기 어렵습니다.

## 2. 만든 것

`sample_profile.json`을 읽어서 현재 강점, 부족 역량, 추천 활동, 4주 실행 로드맵을 출력하는 커리어 에이전트를 만들었습니다.

## 3. 멀티에이전트 구조

프로필 분석자 → 부족 역량 분석자 → 추천 활동 작성자 → 로드맵 작성자 → 검토자

| 역할 | 함수 | 설명 |
|---|---|---|
| 프로필 분석자 | `analyze_profile_strengths` | 수업, 성적, 프로젝트, 자격증, 활동에서 강점을 찾습니다. |
| 부족 역량 분석자 | `analyze_gaps` | 목표 진로 필요 역량과 현재 근거를 비교합니다. |
| 추천 활동 작성자 | `recommend_activities` | 부족 역량별 활동을 추천합니다. |
| 로드맵 작성자 | `make_roadmap` | 4주 실행 계획을 만듭니다. |
| 검토자 | `write_review_report` | 결과 파일 생성과 한계를 점검합니다. |

## 4. 구현 수준

기본형입니다. 외부 API 없이 `python career_agent.py`로 실행되는 규칙 기반 함수 에이전트입니다.

## 5. 실행 결과

- `output.md`: 현재 강점과 부족 역량
- `output_user_guide.md`: 추천 활동과 4주 실행 로드맵
- `review_report.md`: 점검 결과와 현재 한계

## 6. 사용한 코딩에이전트와 외부 도구

- Codex: 코드 구현, 문서 정리, 실행 확인에 사용
- 외부 API: 사용하지 않음
- LLM API: 사용하지 않음

## 7. 한계

정교한 자연어 이해는 부족합니다. 입력 형식이나 표현이 크게 바뀌면 키워드 기반 판단이 부정확할 수 있습니다.

## 8. 1분 데모 흐름

1. `sample_profile.json`을 보여줍니다.
2. `python career_agent.py`를 실행합니다.
3. `output.md`를 보여줍니다.
4. `output_user_guide.md`를 보여줍니다.
5. `review_report.md`를 보여줍니다.
