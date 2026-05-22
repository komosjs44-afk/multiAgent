# Career Agent

## 1. 프로젝트 소개

Career Agent는 공기업 전산직 준비생을 위한 AI Career Gap Analysis Agent이다.

사용자의 전공, 수업 기록, 프로젝트, 자격증, 활동 Evidence를 기반으로 현재 역량을 정리하고, 공기업 전산직 채용공고의 요구역량과 비교해 부족 역량, 준비 우선순위, 추천 학습 방향, 4주 실행 루틴을 제안한다.

## 2. 문제 정의

기존 채용 플랫폼은 채용공고를 보여주는 데 강점이 있지만, 공기업 전산직 준비생이 “내 현재 역량과 실제 공고 요구사항 사이에 어떤 차이가 있는지”를 알기 어렵다.

Career Agent는 단순 공고 추천이 아니라 다음 질문에 답하는 것을 목표로 한다.

- 현재 내가 보유한 전산직 관련 역량은 무엇인가?
- 공기업 전산직 공고에서 요구하는 역량은 무엇인가?
- 내 역량과 공고 요구역량 사이의 Gap은 무엇인가?
- 어떤 자격증, 프로젝트, 학습 루틴을 우선 준비해야 하는가?

## 3. 핵심 기능

- 공기업 전산직 목표 프로필 입력
- Evidence 저장: 프로젝트, 수상, 자격증, 해커톤, 스터디, 인턴십, 활동
- Academic 저장: 과목명, 학점, 성적, 역량 매핑
- 데모 공고 fallback 및 DEMO/LIVE 상태 표시
- 공고 요구역량과 사용자 역량 비교
- 역량 기반 예상 적합도 산정
- 부족 역량 및 우선 보완 역량 도출
- 추천 자격증, 추천 프로젝트, 추천 학습 방향 생성
- 4주 공기업 전산직 준비 루틴 생성
- Markdown Gap Analysis Report 복사
- 로그인 기반 분석 이력 저장 구조

## 4. 시스템 구조

```text
사용자 입력
  -> Profile / Evidence / Academic Record
  -> 공기업 전산직 공고 데이터(DEMO fallback, 향후 잡알리오 LIVE)
  -> Gap Analysis Engine
  -> 부족 역량 / 준비 우선순위 / 학습 루틴 / Markdown Report
```

주요 파일:

- `career_agent.py`: Python 규칙 기반 제출용 원형
- `sample_profile.json`: 공기업 전산직 준비생 샘플 입력
- `sample_notices.txt`: 공기업 전산직 데모 공고 예시
- `career-agent-web/app/page.tsx`: Next.js 메인 웹 UI
- `career-agent-web/lib/careerAgent.ts`: 웹앱 Gap 분석 로직
- `career-agent-web/lib/jobPostings.ts`: 데모 공고 및 향후 API 연결 지점
- `career-agent-web/supabase/career_analysis.sql`: Supabase DB 스키마

## 5. 기술 스택

- Frontend: Next.js, TypeScript, TailwindCSS
- Backend: Next.js API Routes
- Database: Supabase
- AI 확장 방향: OpenAI API
- Deploy 확장 방향: Vercel
- Python MVP: Python 표준 라이브러리 기반 rule-based 분석

## 6. AI 분석 방식

현재 MVP는 rule-based Gap Analysis를 사용한다.

분석 흐름:

1. 사용자 프로필과 Evidence에서 보유 역량 키워드를 추출한다.
2. 공기업 전산직 요구역량 체계와 비교한다.
3. 보유 근거가 있는 역량과 부족 역량을 분리한다.
4. 부족 역량을 기준으로 준비 우선순위와 학습 루틴을 생성한다.
5. 분석 결과를 Markdown 리포트로 정리한다.

## 7. 차별성

기존 서비스:

- 채용공고 제공
- 범용 직무 추천
- 일반 취업 정보 제공

Career Agent:

- 공기업 전산직 특화
- 사용자 Evidence 기반 역량 분석
- 실제 채용공고 요구역량과 현재 역량의 Gap 분석
- 부족 역량 우선순위 제안
- 실천 가능한 학습 루틴과 프로젝트 방향 제안

## 8. MVP 범위

포함:

- 공기업 전산직 Gap 분석
- 데모 공고 fallback
- Profile / Evidence / Academic 저장 구조
- Markdown Report
- Dashboard / Analysis History 구조

보류:

- 범용 진로 추천 TOP3
- 일반 취업 추천
- PDF 자동 파싱
- AI 면접
- 자소서 생성
- Q-Net API
- HRD-Net API
- 과도한 챗봇 UI

## 9. 향후 확장

- 잡알리오 API 기반 공기업 채용공고 연동
- OpenAI API 기반 분석 설명 고도화
- 부족 역량 변화 추적 Dashboard
- 추천 프로젝트 템플릿 제공
- 공기업별 전산직 요구역량 비교
- 개인정보 동의 기반 장기 Career DB 운영

## 10. 출력 형식

생성 결과:

- `output.md`: 핵심 Gap 분석 결과
- `output_user_guide.md`: 우선 보완 역량과 4주 실행 루틴
- `review_report.md`: 구현 수준, 한계, 점검 결과

웹앱 리포트:

- Public Enterprise IT Career Gap Analysis Report
- 역량 기반 예상 적합도
- 매칭 역량
- 부족 역량
- 추천 자격증
- 추천 학습 방향
- 시스템 예상 문제점과 해결책

## 실행 방법

Python 제출용 MVP:

```bash
python career_agent.py
```

Next.js 웹앱:

```bash
cd career-agent-web
npm.cmd run dev -- --hostname 127.0.0.1 --port 3100
```

접속:

```text
http://127.0.0.1:3100
```
