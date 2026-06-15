# Career Agent MVP 구현 계획

## 프로젝트 목적

Evidence-based Career Agent는 공기업 전산직을 준비하는 대학생이 자신의 전공, 학년, 보유 기술, 프로젝트, 자격증, 활동 이력을 목표 공고 요구역량과 비교해 현재 강점과 부족 역량을 확인할 수 있게 돕는 Career Agent MVP이다.

MVP의 핵심 가치는 단순 진로 추천이 아니라, 입력된 Evidence와 공고 요구역량을 바탕으로 실행 가능한 보완 루틴과 4주 성장 로드맵을 제공하는 것이다.

## 현재 코드베이스 기준 확인 결과

현재 구현은 `career-agent-web` Next.js 웹앱 기준이다.

확인된 기술 스택:

- Next.js 16.2.6
- React 19.2.4
- Tailwind CSS 4
- Supabase SSR (`@supabase/ssr`)
- Supabase JS (`@supabase/supabase-js`)

현재 존재하는 주요 파일:

- `career-agent-web/app/page.tsx`: 프로필 입력, 분석 실행, 결과 출력, Career DB 패널
- `career-agent-web/app/login/page.tsx`: Supabase 이메일 OTP/매직링크 로그인 화면
- `career-agent-web/app/dashboard/page.tsx`: 저장된 분석 이력 대시보드
- `career-agent-web/app/auth/callback/route.ts`: Supabase 인증 콜백
- `career-agent-web/app/api/analyze-career/route.ts`: 커리어 분석 API
- `career-agent-web/app/api/analysis-history/route.ts`: 분석 이력 저장/조회 API
- `career-agent-web/app/api/career-profile/route.ts`: 프로필 저장 API
- `career-agent-web/app/api/academic-records/route.ts`: 학업 기록 저장/조회 API
- `career-agent-web/app/api/evidence-records/route.ts`: Evidence 저장/조회/삭제 API
- `career-agent-web/app/api/evidence/extract/route.ts`: Evidence 추출 API
- `career-agent-web/app/api/roadmap-chat/route.ts`: 로드맵 상담 API
- `career-agent-web/lib/supabase/client.ts`: 브라우저 Supabase 클라이언트
- `career-agent-web/lib/supabase/server.ts`: 서버 Supabase 클라이언트 및 DB helper
- `career-agent-web/supabase/career_analysis.sql`: Supabase 테이블 및 RLS 정책

## 현재 구현 완료 범위

구현 완료 또는 파일이 이미 존재하는 항목:

- 프로필 입력 UI
- 분석 API Route
- 데모 공고 fallback
- 공고 요구역량 기반 분석
- 역량 기반 예상 적합도 계산
- 추천 자격증 생성
- 보완 루틴 생성
- 4주 성장 로드맵 생성
- 시스템 예상 문제점과 해결책 생성
- Markdown 리포트 복사
- Supabase 이메일 OTP/매직링크 로그인 화면
- Supabase client/server 유틸
- 분석 이력 저장/조회 API
- Career Profile 저장 API
- 학업 기록 저장/조회 API
- Evidence 저장/조회/삭제 API
- 분석 이력 대시보드
- 개인정보 저장 동의 UI

현재 공고 데이터 흐름:

1. `/api/analyze-career`가 사용자 프로필을 받는다.
2. `fetchJobPostings`가 공고 데이터를 조회한다.
3. `ALIO_OPEN_API_URL`, `ALIO_OPEN_API_KEY`가 있으면 외부 API 호출을 시도한다.
4. API 설정이 없거나 실패하면 데모 공고 fallback을 사용한다.
5. `analyzeCareer`가 프로필과 공고 요구역량을 비교한다.
6. 분석 결과를 UI와 Markdown 리포트로 출력한다.
7. 사용자가 로그인했고 개인정보 저장에 동의한 경우 분석 이력을 DB에 저장한다.

## Supabase DB 현재 스키마

`career-agent-web/supabase/career_analysis.sql`에는 다음 테이블과 RLS 정책이 이미 정의되어 있다.

1. `profiles`
- `id`
- `user_id`
- `name`
- `university`
- `major`
- `grade`
- `target_career`
- `created_at`
- `updated_at`

2. `academic_records`
- `id`
- `user_id`
- `course_name`
- `credit`
- `grade`
- `semester`
- `skill_mapping`
- `created_at`

3. `evidence_records`
- `id`
- `user_id`
- `type`
- `title`
- `organization`
- `description`
- `role`
- `result`
- `skills`
- `evidence_text`
- `created_at`
- `updated_at`

4. `career_analysis_history`
- `id`
- `user_id`
- `input_snapshot`
- `result_snapshot`
- `score`
- `created_at`

지원되는 Evidence type:

- `award`
- `project`
- `certificate`
- `hackathon`
- `study`
- `internship`
- `activity`

주의: 현재 스키마의 목표 직무 컬럼명은 `target_job`이 아니라 `target_career`이다.

## 남은 MVP 개발 작업

### 0. MVP 페이지 수 기준

MVP 웹페이지는 사용자 페이지 8개를 기준으로 한다. 처음부터 페이지를 과도하게 늘리면 개발 범위가 커지므로, 발표용/실사용 MVP에서는 아래 8개 화면을 우선 범위로 고정한다.

| 번호 | 페이지 | 경로 | 핵심 역할 | 현재 상태 |
| --- | --- | --- | --- | --- |
| 1 | 랜딩 페이지 | `/` | 서비스 소개, 시작 버튼 | 현재는 분석 입력 화면 역할까지 포함 |
| 2 | 로그인 페이지 | `/login` | 로그인 | 구현됨. 현재는 이메일 OTP/매직링크 방식 |
| 3 | 회원가입 페이지 | `/signup` | 회원가입 | 구현됨 |
| 4 | 온보딩/프로필 입력 | `/onboarding` | 학년, 학과, 목표 직무/기업 입력 | 구현됨 |
| 5 | 커리어 정보 입력 | `/profile/edit` | 학점, 과목, 자격증, 프로젝트, 활동 입력 | 구현됨 |
| 6 | 대시보드 | `/dashboard` | 현재 준비도 요약, 최근 이력 | 구현됨. 현재는 분석 이력 중심 |
| 7 | 분석 결과 페이지 | `/analysis` | 부족 역량, 준비도 점수, 액션 플랜 | 구현됨 |
| 8 | 공고 추천 페이지 | `/jobs` | 적합 공기업 공고 추천 | 구현됨 |

선택 사항:

- 관리자 페이지 `/admin`
- 역할: 수집된 공고 확인, AI가 추출한 요구역량 검수, 후기 데이터 검수
- 발표용 MVP에서는 생략 가능

최종 페이지 수 기준:

| 구분 | 페이지 수 |
| --- | --- |
| 사용자 페이지 | 8개 |
| 관리자 페이지 | 1개 선택 |
| 총합 | 8개 또는 9개 |

### 1. Supabase 프로젝트 연결 확인

필요 작업:

- Supabase 프로젝트 생성 여부 확인
- `NEXT_PUBLIC_SUPABASE_URL` 설정
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정
- `career-agent-web/supabase/career_analysis.sql`을 Supabase SQL Editor에 적용
- 이메일 OTP 로그인 Redirect URL 설정 확인

현재 로그인 방식은 이메일/비밀번호가 아니라 이메일 OTP/매직링크이다. MVP에서는 기존 구현을 살려 이메일 OTP 방식을 우선 사용한다.

### 2. 회원가입 페이지 정리

구현 대상:

- `career-agent-web/app/signup/page.tsx`

역할:

- 이메일
- 비밀번호
- 이름/닉네임
- 회원가입 버튼
- 로그인 페이지 이동 버튼

주의:

- 현재 로그인은 이메일 OTP/매직링크 방식이다.
- `/signup`을 별도 페이지로 만들려면 이메일/비밀번호 Auth로 전환할지, 아니면 OTP 기반 가입 안내 페이지로 둘지 결정해야 한다.

### 3. 커리어 정보 입력 페이지 정리

구현 대상:

- `career-agent-web/app/profile/edit/page.tsx`

역할:

- 학점
- 수강 과목
- 자격증
- 프로젝트
- 공모전
- 인턴 경험
- 토익/어학 점수

현재 일부 기능은 `/`의 Career DB 패널에도 남아 있으므로, 이후 중복 UI를 정리한다.

### 4. 분석 결과 페이지 정리

구현 대상:

- `career-agent-web/app/analysis/page.tsx`

역할:

| 영역 | 내용 |
| --- | --- |
| 전공 준비도 | 수강 과목 기반 |
| 자격증 준비도 | 정보처리기사, SQLD 등 |
| 프로젝트 적합도 | 경험 기반 |
| NCS 준비도 | 입력 기반 |
| 기업 적합도 | 목표 기업 기준 |

현재 분석 결과는 `app/page.tsx` 안에서도 바로 출력되고, 최신 분석은 `/analysis`에서 별도로 확인할 수 있다. 이후에는 결과 표시 책임을 `/analysis` 중심으로 정리한다.

### 5. 공고 추천 페이지 정리

구현 대상:

- `career-agent-web/app/jobs/page.tsx`

역할:

- 전산직 관련 공고 리스트
- 기업명
- 접수기간
- 요구 자격
- 내 적합도
- 부족한 점
- 상세보기 버튼

현재 공고 추천은 `/`의 분석 결과 안에도 포함되어 있고, 최신 분석 기준 추천 공고는 `/jobs`에서 별도로 확인할 수 있다.

### 6. 대시보드 역할 정리

현재 `/dashboard`는 분석 이력 대시보드에 가깝다. MVP 기준에서는 사용자가 가장 자주 보는 요약 화면으로 역할을 정리한다.

구성:

- 전체 준비도 점수
- 가장 부족한 영역
- 이번 달 추천 행동
- 최근 추천 공고
- 분석 다시하기 버튼

### 7. Career DB와 분석 입력 연결 강화

현재 Career DB 저장 API와 UI는 존재하지만, 저장된 Evidence와 학업 기록이 분석 입력에 완전히 자동 반영되는지는 추가 점검이 필요하다.

필요 작업:

- 저장된 `profiles`를 분석 폼 초기값으로 불러오기
- 저장된 `academic_records`를 역량 분석 입력에 반영
- 저장된 `evidence_records`를 기술/프로젝트/자격증 입력에 반영
- Evidence 기반 skill mapping 결과를 `analyzeCareer` 입력에 통합

### 8. UI 문구와 상태 정리

필요 작업:

- 데모 공고는 실제 공고처럼 보이지 않도록 `DEMO` 상태를 명확히 표시
- 점수 표현은 “합격률”이 아니라 “역량 기반 예상 적합도”로 통일
- Supabase 미설정 상태에서는 “체험 모드”로 명확히 안내
- 저장 동의가 없을 경우 DB 저장이 비활성화됨을 명확히 표시

### 9. 린트 경고 정리

현재 `npm run lint` 결과:

- 에러 없음
- `career-agent-web/app/api/analyze-career/route.ts`에서 `postings` 미사용 변수 경고 1개

필요 작업:

- 미사용 변수 제거 또는 실제 사용 흐름으로 정리

## User Review Required

개발 진행 전 확인이 필요한 항목:

1. Supabase 프로젝트가 준비되어 있는가?
   - 준비되어 있다면 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 `.env.local` 또는 배포 환경변수에 설정해야 한다.

2. `career_analysis.sql`을 Supabase SQL Editor에서 실행할 수 있는가?
   - 테이블, 인덱스, RLS 정책이 함께 생성된다.

3. 로그인 방식은 현재 구현된 이메일 OTP/매직링크를 MVP 기본값으로 유지해도 되는가?
   - 이메일/비밀번호 또는 카카오/구글 소셜 로그인은 후속 확장으로 둔다.

4. MVP 페이지 수를 사용자 페이지 8개로 고정할 것인가?
   - 기준 페이지는 `/`, `/login`, `/signup`, `/onboarding`, `/profile/edit`, `/dashboard`, `/analysis`, `/jobs`이다.
   - `/admin`은 발표용 MVP에서는 생략 가능하다.

## Verification Plan

자동 검증:

- `npm run lint`
- 필요 시 `npm run build`

수동 검증:

1. Supabase 환경변수가 없을 때 `/login`에서 체험 모드가 표시되는지 확인한다.
2. Supabase 환경변수가 있을 때 이메일 OTP 링크 전송이 가능한지 확인한다.
3. 로그인 후 Career Profile 저장이 `profiles`에 반영되는지 확인한다.
4. Evidence 저장이 `evidence_records`에 반영되는지 확인한다.
5. 학업 기록 저장이 `academic_records`에 반영되는지 확인한다.
6. 분석 실행 후 동의 상태에서 `career_analysis_history`에 이력이 저장되는지 확인한다.
7. `/dashboard`에서 저장된 분석 이력이 최신순으로 표시되는지 확인한다.
8. 데모 공고 사용 시 UI에 `DEMO` 상태가 명확히 표시되는지 확인한다.

## 구현 우선순위

1. Supabase 환경변수 및 SQL 적용 확인
2. `/` 랜딩 역할 정리
3. `/login` 로그인 흐름 정리
4. `/onboarding` 프로필 입력 흐름 정리
5. `/profile/edit` 커리어 정보 입력 페이지 추가
6. `/dashboard` 준비도 요약 화면 정리
7. `/analysis` 분석 결과 페이지 추가
8. `/jobs` 공고 추천 페이지 추가
9. `/signup` 회원가입 페이지 추가 여부 결정
10. 저장된 Career DB 데이터를 분석 입력에 자동 반영
11. 린트 및 빌드 검증

## 향후 v2 방향

- 실제 잡알리오/공공데이터 API 연동
- API 실패 시 demo fallback 유지
- LLM 설명문 생성과 rule-based fallback 병행
- 성적표 PDF 텍스트 추출 및 과목/성적 파싱
- PDF 원본은 기본 저장하지 않고 사용자가 확인한 추출 결과만 저장
- Evidence 기반 역량 매핑 고도화
- 이전 분석과 현재 분석 비교
- 소셜 로그인 추가
