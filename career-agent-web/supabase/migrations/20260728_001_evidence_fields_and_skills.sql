-- Evidence 필드 확장 + evidence_skills 테이블
-- 기존 supabase/career_analysis.sql은 수정하지 않고, 이 파일만 추가 적용하면 됩니다.
-- 기존 evidence_records 데이터/컬럼은 그대로 유지되며, 신규 컬럼은 전부 nullable입니다.

alter table public.evidence_records
  add column if not exists implemented_features text null,
  add column if not exists problem_solved text null,
  add column if not exists evidence_url text null,
  add column if not exists started_at date null,
  add column if not exists ended_at date null;

create table if not exists public.evidence_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  evidence_id uuid not null references public.evidence_records(id) on delete cascade,
  skill_code text not null check (
    skill_code in (
      'programming',
      'web_development',
      'api_design',
      'database',
      'operating_system',
      'network',
      'security',
      'data_analysis',
      'ai_ml',
      'cloud',
      'system_operation',
      'problem_solving',
      'collaboration',
      'documentation',
      'communication'
    )
  ),
  source text not null check (source in ('rule', 'ai', 'user')),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  contribution_level text not null check (contribution_level in ('strong', 'medium', 'weak')),
  matched_keywords text[] not null default '{}',
  reason text null,
  is_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (evidence_id, skill_code)
);

create index if not exists evidence_skills_user_id_idx
  on public.evidence_skills (user_id);

create index if not exists evidence_skills_evidence_id_idx
  on public.evidence_skills (evidence_id);

alter table public.evidence_skills enable row level security;

drop policy if exists "users can read own evidence skills" on public.evidence_skills;
drop policy if exists "users can insert own evidence skills" on public.evidence_skills;
drop policy if exists "users can update own evidence skills" on public.evidence_skills;
drop policy if exists "users can delete own evidence skills" on public.evidence_skills;

create policy "users can read own evidence skills"
  on public.evidence_skills
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can insert own evidence skills"
  on public.evidence_skills
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update own evidence skills"
  on public.evidence_skills
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete own evidence skills"
  on public.evidence_skills
  for delete
  to authenticated
  using (auth.uid() = user_id);
