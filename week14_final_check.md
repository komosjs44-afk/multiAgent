# 14주차 최종 점검

## GitHub 저장소

- URL: 제출 전 입력 필요

## 내 에이전트

- 이름: Career Agent
- 서비스 방향: 공기업 전산직 준비생을 위한 AI Career Gap Analysis Agent
- 해결하려는 문제: 공기업 전산직 준비생이 자신의 현재 역량과 실제 채용공고 요구역량 사이의 Gap을 파악하기 어렵다는 문제
- 구현 수준: 기본형 + 웹 MVP 확장 구조

## 실행 명령

Python MVP:

```bash
python career_agent.py
```

Next.js 웹앱:

```bash
cd career-agent-web
npm.cmd run dev -- --hostname 127.0.0.1 --port 3100
```

## 생성된 출력 파일

- `output.md`: 공기업 전산직 Gap 분석 결과
- `output_user_guide.md`: 우선 보완 역량과 4주 준비 루틴
- `review_report.md`: 구현 수준, 한계, 점검 결과

## 에이전트 역할

| 역할 | 함수/모듈 | 설명 |
|---|---|---|
| 입력 읽기 | `load_profile` | 공기업 전산직 준비생 프로필 JSON을 읽습니다. |
| 프로필 분석자 | `analyze_profile_strengths` | 현재 강점과 보유 근거를 정리합니다. |
| Gap 분석자 | `analyze_gaps` | 공기업 전산직 요구역량과 현재 Evidence를 비교합니다. |
| 학습 방향 작성자 | `recommend_activities` | 부족 역량별 추천 학습 방향을 제안합니다. |
| 로드맵 작성자 | `make_roadmap` | 4주 공기업 전산직 준비 루틴을 작성합니다. |
| 검토자 | `write_review_report` | 결과와 한계를 점검합니다. |

## 사용한 코딩에이전트

- Codex: 기획 정리, 코드 수정, 문서 작성, 실행 확인, MVP 방향 재정의

## 사용한 API 또는 외부 도구

- Groq API: 사용하지 않음
- 잡알리오 API: 현재 미연결, 데모 공고 fallback 사용
- OpenAI API: 향후 확장 대상
- fallback 동작: 외부 API 미연결 시 데모 공고로 Gap 분석 가능

## 아직 부족한 점

- GitHub 저장소 URL을 제출 전에 입력해야 합니다.
- 실제 잡알리오 API endpoint 확정이 필요합니다.
- Supabase 키 연결 후 실제 저장/조회 검증이 필요합니다.
- PDF 자동 파싱은 Version 2로 보류했습니다.

## TODO 상태 점검

| 항목 | 상태 |
|---|---|
| `python career_agent.py` 실행 | 완료 |
| `output.md` 생성 | 완료 |
| `output_user_guide.md` 생성 | 완료 |
| `review_report.md` 생성 | 완료 |
| README 재정리 | 완료 |
| 발표자료 초안 작성 | 완료 |
| 공기업 전산직 Gap 분석 방향 반영 | 완료 |
| GitHub 저장소 URL 입력 | 미완료 |

## 발표 때 보여줄 순서

1. `sample_profile.json`
2. `sample_notices.txt`
3. `python career_agent.py` 실행
4. `output.md`
5. `output_user_guide.md`
6. `review_report.md`
7. 웹앱 `http://127.0.0.1:3100`
