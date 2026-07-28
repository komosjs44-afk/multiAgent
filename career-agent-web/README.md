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

`.env.local` 파일에 아래 값을 설정합니다. 전체 목록과 설명은 `.env.local.example`을 참고하세요.

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# 서버 전용, 선택
SUPABASE_SERVICE_ROLE_KEY=optional-service-role-key

# 공고 수집 API, 모두 선택 (없으면 기본 ALIO JSON/HTML 소스로 동작)
ALIO_JSON_LIST_URL=optional-override
ALIO_OPEN_API_URL=optional-configured-api-url
ALIO_OPEN_API_KEY=optional-configured-api-key
JOB_ALIO_RECRUIT_URL=optional-override

# AI 요약/로드맵 채팅, 선택
OPENAI_API_KEY=optional-openai-api-key
OPENAI_MODEL=gpt-4o-mini

# Supabase 없이 데모 데이터로 시연하려면 true
NEXT_PUBLIC_DEMO_MODE=false
```

`SUPABASE_SERVICE_ROLE_KEY`는 서버에서만 사용해야 하며, 클라이언트에 노출하면 안 됩니다.

## 데모 모드

Supabase 프로젝트가 일시중지·삭제되었거나 외부 공고 API가 응답하지 않을 때도 핵심 화면을 시연할 수 있도록,
`NEXT_PUBLIC_DEMO_MODE=true`로 설정하면 고정된 데모 사용자·프로필·학업기록·Evidence·직무기술서·공고·분석 이력을
`lib/demo/`에서 읽어 화면에 표시합니다. 실제 로그인·저장 흐름을 건드리지 않으며, `false`(기본값)일 때는
기존 Supabase 흐름이 그대로 동작합니다. 데모 모드는 조회 화면(프로필 확인, 대시보드, 추천 공고) 기준으로 동작하며,
분석 재실행이나 Evidence 추가 같은 저장 동작은 이번 단계에서는 데모 모드 대상이 아닙니다.

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
