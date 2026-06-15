# Career Agent

공공기관 전산직을 준비하는 사용자를 위한 커리어 Gap Analysis 웹 서비스입니다.

사용자가 입력한 프로필, 학업 기록, 프로젝트, 자격증, 활동 이력을 기반으로 현재 역량을 정리하고, 공공기관 전산직 채용 공고 또는 내부 직무기술서의 요구 역량과 비교하여 부족한 역량, 우선 보완 항목, 추천 학습 방향, 추천 프로젝트, 예상 적합도를 제공합니다.

## 1. 프로젝트 개요

Career Agent는 단순 채용 공고 조회 서비스가 아니라, 사용자의 준비 상태와 목표 직무 사이의 차이를 분석하는 것을 목표로 합니다.

주요 목표는 다음과 같습니다.

- 사용자의 전공, 학년, GPA, 목표 기업, 목표 직무를 저장한다.
- 프로젝트, 수상, 자격증, 스터디, 인턴십 등 Evidence를 관리한다.
- 학업 기록과 과목별 역량 매핑을 저장한다.
- 공공기관 전산직 기준 역량과 사용자 Evidence를 비교한다.
- 분석 결과를 점수, 강점, 부족 역량, 다음 행동, 로드맵 형태로 제공한다.
- 분석 이력을 저장하여 사용자가 준비 과정을 이어서 확인할 수 있게 한다.

## 2. 주요 기능

- 회원가입 및 로그인
- 사용자 프로필 입력 및 수정
- 학업 기록 등록, 수정, 삭제
- 프로젝트, 자격증, 수상, 활동 등 Evidence 등록, 수정, 삭제
- 공공기관 전산직 기준 Career Gap Analysis
- 직무기술서 기반 채용 공고 추천
- 분석 결과 저장 및 최근 분석 이력 조회
- 결과 페이지에서 점수 상세, 강점, 부족 역량, 추천 액션 확인
- 관리자용 직무기술서 목록 관리 및 CSV import
- Supabase 기반 데이터 저장 및 Row Level Security 적용

## 3. 기술 스택

- Frontend: Next.js App Router, React, TypeScript
- Styling: Tailwind CSS
- Backend: Next.js Route Handler
- Database/Auth: Supabase
- Data Model: Profile, Academic Records, Evidence Records, Analysis History, Job Descriptions
- Optional AI Summary: OpenAI API
- External Job Data: ALIO/Open API 연동 구조 및 Demo fallback

## 4. 시스템 구조

```text
사용자 입력
  -> 프로필 / 학업 기록 / Evidence 저장
  -> Supabase 인증 및 사용자별 데이터 조회
  -> 직무기술서 및 채용 공고 데이터 수집
  -> Rule-based Career Gap Analysis
  -> 점수 상세 / 강점 / 부족 역량 / 추천 액션 / 로드맵 생성
  -> 분석 이력 저장
  -> 결과 페이지 및 추천 공고 페이지에서 확인
```

핵심 파일은 다음과 같습니다.

- `career-agent-web/app/page.tsx`: 메인 페이지
- `career-agent-web/app/profile/page.tsx`: 프로필 및 준비 이력 입력 화면
- `career-agent-web/app/result/page.tsx`: 분석 결과 화면
- `career-agent-web/app/jobs/page.tsx`: 추천 공고 화면
- `career-agent-web/app/api/analyze-career/route.ts`: 커리어 분석 API
- `career-agent-web/lib/careerAgent.ts`: Gap Analysis 핵심 로직
- `career-agent-web/lib/jobPostings.ts`: 외부 공고 및 fallback 공고 처리
- `career-agent-web/lib/services/jobRecommendationService.ts`: 추천 공고 서비스
- `career-agent-web/lib/supabase/server.ts`: 서버 측 Supabase 접근
- `career-agent-web/supabase/career_analysis.sql`: Supabase DB 스키마 및 RLS 정책

## 5. 실행 방법

### 5.1 저장소 이동

```bash
cd career-agent-web
```

### 5.2 패키지 설치

```bash
npm install
```

### 5.3 환경변수 설정

`career-agent-web/.env.local` 파일을 생성하고 아래 값을 설정합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

ALIO_OPEN_API_URL=your-alio-or-job-api-url
ALIO_OPEN_API_KEY=your-open-api-key

OPENAI_API_KEY=optional-openai-api-key
OPENAI_MODEL=gpt-4o-mini

SUPABASE_SERVICE_ROLE_KEY=optional-service-role-key
```

주의 사항:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`는 브라우저에서 사용할 수 있는 공개 anon key입니다.
- `SUPABASE_SERVICE_ROLE_KEY`는 절대 클라이언트 코드에 노출하면 안 됩니다.
- 외부 공고 API 키가 없어도 Demo fallback 데이터로 기본 분석 흐름을 확인할 수 있습니다.

### 5.4 Supabase 스키마 적용

Supabase SQL Editor에서 아래 파일의 내용을 실행합니다.

```text
career-agent-web/supabase/career_analysis.sql
```

생성되는 주요 테이블:

- `profiles`
- `academic_records`
- `evidence_records`
- `career_analysis_history`
- `job_descriptions`
- `companies`
- `recruitment_stats`

### 5.5 개발 서버 실행

```bash
npm run dev -- --hostname 127.0.0.1 --port 3100
```

브라우저에서 접속합니다.

```text
http://127.0.0.1:3100
```

## 6. 시연 흐름

과제 평가 또는 데모 시에는 아래 순서로 확인하면 됩니다.

1. 메인 페이지 접속
2. 회원가입 또는 로그인
3. `/profile`에서 기본 프로필 입력
4. 학업 기록, 프로젝트, 자격증, 활동 Evidence 등록
5. 분석 실행
6. `/result`에서 점수, 강점, 부족 역량, 추천 액션 확인
7. `/jobs`에서 추천 공고 및 직무 적합도 확인
8. 필요 시 `/dashboard`에서 최근 분석 흐름 확인

## 7. 핵심 분석 로직

현재 분석 엔진은 rule-based 방식으로 구현되어 있습니다.

분석 과정은 다음과 같습니다.

1. 사용자 프로필, 학업 기록, Evidence를 하나의 UserProfile 형태로 구성한다.
2. 목표 기업과 목표 직무를 기준으로 필요한 역량 목록을 정한다.
3. 사용자의 프로젝트, 자격증, 과목, 기술 키워드에서 보유 역량을 추출한다.
4. 요구 역량과 보유 역량을 비교하여 부족 역량을 계산한다.
5. 전공 적합도, 기술 스택, 프로젝트 경험, 활동 경험, 자격증, 진로 명확성, 실행 가능성 점수를 산정한다.
6. 부족 역량에 맞는 추천 자격증, 추천 프로젝트, 학습 방향, 4주 로드맵을 생성한다.
7. 공고 데이터와 비교하여 추천 공고별 적합도와 보완 항목을 제공한다.

분석 결과는 실제 합격 가능성을 보장하는 값이 아니라, 입력 데이터와 공고 요구 역량을 비교한 준비도 지표입니다.

## 8. 차별점

일반 채용 공고 서비스와 달리 Career Agent는 다음에 초점을 둡니다.

- 공공기관 전산직이라는 명확한 목표 직무에 특화
- 사용자 Evidence 기반 역량 분석
- 공고 요구 역량과 사용자 준비 상태의 Gap 계산
- 점수뿐 아니라 보완해야 할 역량과 다음 행동 제안
- 분석 이력 저장을 통한 준비 과정 추적
- 직무기술서 import를 통한 추천 기준 확장 가능

## 9. 현재 구현 범위

구현 완료 또는 MVP 수준으로 구현된 항목:

- Next.js 기반 웹 화면
- Supabase 로그인 연동
- 프로필 저장
- 학업 기록 저장
- Evidence 저장
- 커리어 분석 API
- 분석 결과 페이지
- 추천 공고 페이지
- 분석 이력 저장
- 관리자 직무기술서 관리 화면
- Supabase DB 스키마 및 RLS 정책

보완이 필요한 항목:

- 분석 문구 및 한글 데이터 정제
- 실제 공고 API 응답 형식 변화에 대한 예외 처리 강화
- 추천 점수 산정 기준 고도화
- 테스트 코드 추가
- 관리자 권한 UX 개선
- PDF 자동 파싱 정확도 개선

## 10. 한계점 및 향후 개선 방향

현재 버전은 과제 제출용 MVP이며, 다음 한계가 있습니다.

- 분석 로직은 LLM 기반 추론이 아니라 규칙 기반 점수 계산입니다.
- 사용자가 입력한 Evidence의 품질에 따라 결과 정확도가 크게 달라집니다.
- 외부 채용 공고 API가 실패할 경우 Demo fallback 데이터를 사용합니다.
- 추천 점수는 합격 확률이 아니라 준비도와 역량 매칭 정도를 나타냅니다.

향후 개선 방향:

- OpenAI API 기반 분석 설명 고도화
- Q-Net, HRD-Net 등 자격증/교육 API 연동
- 공고별 요구 역량 자동 추출 정확도 개선
- 사용자별 부족 역량 변화 추적 Dashboard
- 포트폴리오 산출물 추천 템플릿 제공
- 테스트 코드와 배포 환경 정리

## 11. 제출용 요약

Career Agent는 공공기관 전산직 준비생이 자신의 현재 역량과 채용 공고 요구 역량 사이의 차이를 확인하고, 어떤 역량을 우선적으로 보완해야 하는지 안내받을 수 있는 웹 기반 커리어 분석 서비스입니다.

본 프로젝트는 단순 CRUD를 넘어서 인증, 데이터 저장, 분석 엔진, 추천 로직, 관리자 데이터 관리까지 하나의 흐름으로 구현한 것을 목표로 합니다.
