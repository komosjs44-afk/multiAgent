# Career Agent Web

Next.js 기반 공기업 전산직 AI Career Gap Analysis 웹앱이다.

## 서비스 방향

공기업 전산직 준비생의 현재 역량을 데모 공고 또는 향후 잡알리오 LIVE 공고와 비교해 부족 역량, 준비 우선순위, 추천 학습 방향, 4주 루틴을 제공한다.

## 주요 기능

- 프로필 입력
- Evidence 저장: 프로젝트, 수상, 자격증, 활동
- Academic 저장: 과목명, 학점, 성적, 역량 매핑
- 데모 공고 fallback
- DEMO/LIVE 배지
- 역량 기반 예상 적합도
- 우선 보완 역량
- Markdown Gap Analysis Report 복사
- Supabase 기반 Profile/Evidence/Academic/Analysis History 구조

## 실행 방법

```bash
npm.cmd run dev -- --hostname 127.0.0.1 --port 3100
```

접속:

```text
http://127.0.0.1:3100
```

## 환경변수

`.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ALIO_OPEN_API_URL=your-jobalio-or-public-api-endpoint
ALIO_OPEN_API_KEY=your-open-api-key
```

주의:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`는 클라이언트에서 사용 가능하다.
- `SUPABASE_SERVICE_ROLE_KEY`는 클라이언트에 노출하면 안 된다.
- 현재 MVP는 service role 없이 로그인 세션 기반 RLS 흐름을 우선한다.

## Supabase

SQL 파일:

```text
supabase/career_analysis.sql
```

포함 테이블:

- `profiles`
- `academic_records`
- `evidence_records`
- `career_analysis_history`

## MVP 제외 범위

- 범용 진로 추천 TOP3
- 일반 취업 추천
- PDF 자동 파싱
- 자소서 생성
- AI 면접
- Q-Net API
- HRD-Net API
