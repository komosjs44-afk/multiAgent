-- 성적표 버전 관리 도입.
-- 성적표 PDF 업로드 1회 = academic_transcript_versions 1행("버전"). 사용자가 review 상태로
-- 검토한 뒤 명시적으로 "적용"해야 active가 되고, 이전 active는 archived로 바뀝니다.
-- academic_records는 어느 버전 소속인지(transcript_version_id)를 갖게 되며, 분석/GPA/학업·성적
-- 탭은 항상 active 버전 소속 행 + 수동 입력 행(transcript_version_id is null)만 사용합니다.
--
-- 이 파일은 자동 실행되지 않습니다. Supabase SQL 편집기에서 직접 실행해주세요.

create table if not exists public.academic_transcript_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null default '',
  uploaded_at timestamptz not null default now(),
  academic_term text not null default '',
  total_credits numeric null,
  cumulative_gpa numeric null,
  gpa_scale numeric not null default 4.5,
  percentile numeric null,
  total_course_count integer not null default 0,
  status text not null default 'review' check (
    status in ('parsing', 'review', 'active', 'archived', 'failed')
  ),
  is_active boolean not null default false,
  parser_version text null,
  source_type text not null default 'pdf' check (source_type in ('pdf', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 사용자당 active 버전은 하나만 존재할 수 있습니다(부분 유니크 인덱스로 DB 레벨에서 강제).
create unique index if not exists academic_transcript_versions_one_active_idx
  on public.academic_transcript_versions (user_id)
  where is_active;

create index if not exists academic_transcript_versions_user_id_idx
  on public.academic_transcript_versions (user_id);

create index if not exists academic_transcript_versions_uploaded_at_idx
  on public.academic_transcript_versions (user_id, uploaded_at desc);

alter table public.academic_records
  add column if not exists transcript_version_id uuid null references public.academic_transcript_versions(id) on delete set null,
  add column if not exists course_code text null,
  add column if not exists category text null,
  add column if not exists grade_point numeric null,
  add column if not exists is_pass_fail boolean not null default false,
  add column if not exists extraction_confidence numeric null,
  add column if not exists requires_review boolean not null default false,
  add column if not exists source text not null default 'manual' check (source in ('pdf', 'manual'));

create index if not exists academic_records_transcript_version_idx
  on public.academic_records (transcript_version_id);

-- 정리(cleanup) 삭제 시 원본을 남겨두는 백업 로그. 무조건 삭제하지 않고 근거를 남깁니다.
-- (아래 중복 제거 단계에서도 이 표를 사용하므로 여기서 먼저 만듭니다.)
create table if not exists public.academic_records_cleanup_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deleted_at timestamptz not null default now(),
  rule text not null default '',
  original_row jsonb not null
);

create index if not exists academic_records_cleanup_log_user_id_idx
  on public.academic_records_cleanup_log (user_id);

-- 기존 (user_id, semester, course_name) 유니크 인덱스는 버전 개념과 충돌합니다(동일 과목이
-- 여러 버전에 반복 등장할 수 있음). 버전 내부 중복 방지 + 수동 입력행(버전 없음) 중복 방지로
-- 분리합니다. 단, 아직 버전이 없는(transcript_version_id is null) 기존 행 중 이미 중복이
-- 남아있으면 새 부분 유니크 인덱스 생성 자체가 실패하므로, 인덱스를 만들기 전에 먼저
-- (원본을 cleanup_log에 백업한 뒤) 오래된 중복 행만 정리합니다 — migration 002와 동일한 원칙.
insert into public.academic_records_cleanup_log (user_id, rule, original_row)
select a.user_id, 'pre-index dedupe: (user_id, semester, course_name) 중복 중 오래된 행', to_jsonb(a)
from public.academic_records a
join public.academic_records b
  on a.user_id = b.user_id
  and a.semester = b.semester
  and a.course_name = b.course_name
  and a.id <> b.id
where a.transcript_version_id is null
  and b.transcript_version_id is null
  and (a.created_at < b.created_at or (a.created_at = b.created_at and a.id < b.id));

delete from public.academic_records a
using public.academic_records b
where a.user_id = b.user_id
  and a.semester = b.semester
  and a.course_name = b.course_name
  and a.transcript_version_id is null
  and b.transcript_version_id is null
  and (
    a.created_at < b.created_at
    or (a.created_at = b.created_at and a.id < b.id)
  );

drop index if exists public.academic_records_user_semester_course_idx;

create unique index if not exists academic_records_version_semester_course_idx
  on public.academic_records (user_id, transcript_version_id, semester, course_name)
  where transcript_version_id is not null;

create unique index if not exists academic_records_manual_semester_course_idx
  on public.academic_records (user_id, semester, course_name)
  where transcript_version_id is null;

create table if not exists public.academic_semester_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transcript_version_id uuid not null references public.academic_transcript_versions(id) on delete cascade,
  semester text not null,
  earned_credits numeric null,
  gpa_credits numeric null,
  semester_gpa numeric null,
  percentile numeric null,
  course_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (transcript_version_id, semester)
);

create index if not exists academic_semester_summaries_user_id_idx
  on public.academic_semester_summaries (user_id);

create index if not exists academic_semester_summaries_version_idx
  on public.academic_semester_summaries (transcript_version_id);

alter table public.career_analysis_history
  add column if not exists transcript_version_id uuid null references public.academic_transcript_versions(id) on delete set null,
  add column if not exists cumulative_gpa numeric null,
  add column if not exists total_credits numeric null,
  add column if not exists target_organizations text[] null;

alter table public.academic_transcript_versions enable row level security;
alter table public.academic_semester_summaries enable row level security;
alter table public.academic_records_cleanup_log enable row level security;

drop policy if exists "users can read own transcript versions" on public.academic_transcript_versions;
drop policy if exists "users can insert own transcript versions" on public.academic_transcript_versions;
drop policy if exists "users can update own transcript versions" on public.academic_transcript_versions;
drop policy if exists "users can delete own transcript versions" on public.academic_transcript_versions;

create policy "users can read own transcript versions"
  on public.academic_transcript_versions
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can insert own transcript versions"
  on public.academic_transcript_versions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update own transcript versions"
  on public.academic_transcript_versions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete own transcript versions"
  on public.academic_transcript_versions
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users can read own semester summaries" on public.academic_semester_summaries;
drop policy if exists "users can insert own semester summaries" on public.academic_semester_summaries;
drop policy if exists "users can update own semester summaries" on public.academic_semester_summaries;
drop policy if exists "users can delete own semester summaries" on public.academic_semester_summaries;

create policy "users can read own semester summaries"
  on public.academic_semester_summaries
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can insert own semester summaries"
  on public.academic_semester_summaries
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update own semester summaries"
  on public.academic_semester_summaries
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete own semester summaries"
  on public.academic_semester_summaries
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users can read own cleanup log" on public.academic_records_cleanup_log;
drop policy if exists "users can insert own cleanup log" on public.academic_records_cleanup_log;

create policy "users can read own cleanup log"
  on public.academic_records_cleanup_log
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can insert own cleanup log"
  on public.academic_records_cleanup_log
  for insert
  to authenticated
  with check (auth.uid() = user_id);
