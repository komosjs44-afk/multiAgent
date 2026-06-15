# Career Agent Web

공공기관 전산직 준비생을 위한 Career Gap Analysis 웹앱입니다.

사용자의 프로필, 학업 기록, 프로젝트, 자격증, 활동 Evidence를 저장하고, 공공기관 전산직 요구 역량과 비교하여 점수, 강점, 부족 역량, 추천 액션, 추천 공고를 제공합니다.

## 주요 기능

- Supabase 기반 회원가입 및 로그인
- 프로필, 학업 기록, Evidence 관리
- Rule-based 커리어 Gap Analysis
- 분석 결과 및 최근 분석 이력 저장
- 직무기술서 기반 추천 공고 제공
- 관리자용 직무기술서 관리 및 CSV import

## 기술 스택

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase Auth / Database

## 실행 방법

```bash
npm install
npm run dev -- --hostname 127.0.0.1 --port 3100
```

접속 주소:

```text
http://127.0.0.1:3100
```

## 환경변수

`.env.local` 파일에 아래 값을 설정합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

ALIO_OPEN_API_URL=your-alio-or-job-api-url
ALIO_OPEN_API_KEY=your-open-api-key

OPENAI_API_KEY=optional-openai-api-key
OPENAI_MODEL=gpt-4o-mini

SUPABASE_SERVICE_ROLE_KEY=optional-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY`는 서버에서만 사용해야 하며, 클라이언트에 노출하면 안 됩니다.

## Supabase 설정

Supabase SQL Editor에서 아래 파일을 실행합니다.

```text
supabase/career_analysis.sql
```

주요 테이블:

- `profiles`
- `academic_records`
- `evidence_records`
- `career_analysis_history`
- `job_descriptions`
- `companies`
- `recruitment_stats`

## 시연 흐름

1. 회원가입 또는 로그인
2. `/profile`에서 프로필과 Evidence 입력
3. 분석 실행
4. `/result`에서 분석 결과 확인
5. `/jobs`에서 추천 공고 확인
6. `/dashboard`에서 최근 분석 흐름 확인

## MVP 한계

- 분석은 현재 규칙 기반 로직입니다.
- 추천 점수는 실제 합격 확률이 아니라 역량 매칭 기반 준비도입니다.
- 외부 공고 API가 실패하면 Demo fallback 데이터를 사용합니다.
- 테스트 코드와 분석 문구 정제는 추가 보완이 필요합니다.
