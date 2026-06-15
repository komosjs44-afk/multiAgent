-- Career Agent Supabase schema
-- Purpose: login-based Career DB, Evidence storage, academic records, and analysis history.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null default '',
  university text not null default '',
  major text not null default '',
  grade text not null default '',
  gpa numeric null,
  target_company_type text not null default '',
  target_company text not null default '',
  target_job text not null default '',
  target_career text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists gpa numeric null,
  add column if not exists target_company_type text not null default '',
  add column if not exists target_company text not null default '',
  add column if not exists target_job text not null default '';

create table if not exists public.academic_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_name text not null,
  credit numeric null,
  grade text not null default '',
  semester text not null default '',
  skill_mapping text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.evidence_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (
    type in ('award', 'project', 'certificate', 'hackathon', 'study', 'internship', 'activity')
  ),
  title text not null,
  organization text null,
  description text null,
  role text null,
  result text null,
  skills text[] not null default '{}',
  evidence_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.career_analysis_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input_snapshot jsonb not null,
  result_snapshot jsonb not null,
  score integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.job_descriptions (
  id uuid primary key default gen_random_uuid(),
  company_name text not null default '',
  title text not null default '',
  recruit_title text null,
  target_job text null,
  description text not null default '',
  required_knowledge text[] not null default '{}',
  required_skills text[] not null default '{}',
  required_attitude text[] not null default '{}',
  qualifications text[] not null default '{}',
  preferred_certificates text[] not null default '{}',
  source_url text null,
  created_at timestamptz not null default now()
);

alter table public.job_descriptions
  add column if not exists recruit_title text null,
  add column if not exists required_knowledge text[] not null default '{}',
  add column if not exists required_attitude text[] not null default '{}',
  add column if not exists qualifications text[] not null default '{}';

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  aliases text[] not null default '{}',
  company_type text not null default '',
  region text null,
  homepage_url text null,
  created_at timestamptz not null default now()
);

create table if not exists public.recruitment_stats (
  id uuid primary key default gen_random_uuid(),
  company_name text not null default '',
  target_job text not null default '',
  year integer null,
  recruit_count integer null,
  competition_rate numeric null,
  note text null,
  created_at timestamptz not null default now()
);

create index if not exists profiles_user_id_idx
  on public.profiles (user_id);

create index if not exists academic_records_user_id_idx
  on public.academic_records (user_id);

create index if not exists evidence_records_user_id_idx
  on public.evidence_records (user_id);

create index if not exists evidence_records_created_at_idx
  on public.evidence_records (created_at desc);

create index if not exists career_analysis_history_user_id_idx
  on public.career_analysis_history (user_id);

create index if not exists career_analysis_history_created_at_idx
  on public.career_analysis_history (created_at desc);

create index if not exists job_descriptions_company_name_idx
  on public.job_descriptions (company_name);

create index if not exists job_descriptions_created_at_idx
  on public.job_descriptions (created_at desc);

alter table public.profiles enable row level security;
alter table public.academic_records enable row level security;
alter table public.evidence_records enable row level security;
alter table public.career_analysis_history enable row level security;
alter table public.job_descriptions enable row level security;
alter table public.companies enable row level security;
alter table public.recruitment_stats enable row level security;

drop policy if exists "users can read own profile" on public.profiles;
drop policy if exists "users can upsert own profile" on public.profiles;
drop policy if exists "users can update own profile" on public.profiles;
drop policy if exists "users can read own academic records" on public.academic_records;
drop policy if exists "users can insert own academic records" on public.academic_records;
drop policy if exists "users can update own academic records" on public.academic_records;
drop policy if exists "users can delete own academic records" on public.academic_records;
drop policy if exists "users can read own evidence" on public.evidence_records;
drop policy if exists "users can insert own evidence" on public.evidence_records;
drop policy if exists "users can update own evidence" on public.evidence_records;
drop policy if exists "users can delete own evidence" on public.evidence_records;
drop policy if exists "users can read own analysis history" on public.career_analysis_history;
drop policy if exists "users can insert own analysis history" on public.career_analysis_history;
drop policy if exists "authenticated users can read job descriptions" on public.job_descriptions;
drop policy if exists "public users can read job descriptions" on public.job_descriptions;
drop policy if exists "public users can read companies" on public.companies;
drop policy if exists "authenticated users can read companies" on public.companies;
drop policy if exists "public users can read recruitment stats" on public.recruitment_stats;
drop policy if exists "authenticated users can read recruitment stats" on public.recruitment_stats;

create policy "users can read own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can upsert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can read own academic records"
  on public.academic_records
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can insert own academic records"
  on public.academic_records
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update own academic records"
  on public.academic_records
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete own academic records"
  on public.academic_records
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "users can read own evidence"
  on public.evidence_records
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can insert own evidence"
  on public.evidence_records
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update own evidence"
  on public.evidence_records
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete own evidence"
  on public.evidence_records
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "users can read own analysis history"
  on public.career_analysis_history
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can insert own analysis history"
  on public.career_analysis_history
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- MVP hardening: admin roles, public job reference data, and reproducible analysis history.
alter table public.profiles
  add column if not exists role text not null default 'user',
  add column if not exists is_admin boolean not null default false;

alter table public.career_analysis_history
  add column if not exists profile_snapshot jsonb null,
  add column if not exists academic_snapshot jsonb null,
  add column if not exists evidence_snapshot jsonb null,
  add column if not exists job_source_snapshot jsonb null,
  add column if not exists recommendation_version text not null default 'career-analysis-v1',
  add column if not exists score_breakdown jsonb null;

create table if not exists public.job_descriptions (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  recruit_title text not null default '',
  title text null,
  job_field text not null default '',
  target_job text null,
  description text null,
  required_knowledge text[] not null default '{}',
  required_skills text[] not null default '{}',
  required_attitude text[] not null default '{}',
  qualifications text[] not null default '{}',
  preferred_certificates text[] not null default '{}',
  source text not null default 'manual',
  source_url text null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.job_descriptions
  add column if not exists company_name text not null default '',
  add column if not exists recruit_title text not null default '',
  add column if not exists title text null,
  add column if not exists job_field text not null default '',
  add column if not exists target_job text null,
  add column if not exists description text null,
  add column if not exists required_knowledge text[] not null default '{}',
  add column if not exists required_skills text[] not null default '{}',
  add column if not exists required_attitude text[] not null default '{}',
  add column if not exists qualifications text[] not null default '{}',
  add column if not exists preferred_certificates text[] not null default '{}',
  add column if not exists source text not null default 'manual',
  add column if not exists source_url text null,
  add column if not exists active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists job_descriptions_company_name_idx
  on public.job_descriptions (company_name);

create index if not exists job_descriptions_active_idx
  on public.job_descriptions (active);

alter table public.job_descriptions enable row level security;

drop policy if exists "Anyone can read job descriptions" on public.job_descriptions;
drop policy if exists "Authenticated users can read job descriptions" on public.job_descriptions;
drop policy if exists "Admins can insert job descriptions" on public.job_descriptions;
drop policy if exists "Admins can update job descriptions" on public.job_descriptions;
drop policy if exists "Admins can delete job descriptions" on public.job_descriptions;

create policy "Anyone can read job descriptions"
  on public.job_descriptions
  for select
  using (true);

create policy "Admins can insert job descriptions"
  on public.job_descriptions
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.user_id = auth.uid()
        and (profiles.is_admin = true or profiles.role = 'admin')
    )
  );

create policy "Admins can update job descriptions"
  on public.job_descriptions
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.user_id = auth.uid()
        and (profiles.is_admin = true or profiles.role = 'admin')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.user_id = auth.uid()
        and (profiles.is_admin = true or profiles.role = 'admin')
    )
  );

create policy "Admins can delete job descriptions"
  on public.job_descriptions
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.user_id = auth.uid()
        and (profiles.is_admin = true or profiles.role = 'admin')
    )
  );

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  aliases text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.recruitment_stats (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  job_field text not null default '',
  stat_year integer null,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.companies enable row level security;
alter table public.recruitment_stats enable row level security;

drop policy if exists "Anyone can read companies" on public.companies;
drop policy if exists "Anyone can read recruitment stats" on public.recruitment_stats;

create policy "Anyone can read companies"
  on public.companies
  for select
  using (true);

create policy "Anyone can read recruitment stats"
  on public.recruitment_stats
  for select
  using (true);

create policy "authenticated users can read job descriptions"
  on public.job_descriptions
  for select
  to authenticated
  using (true);

create policy "public users can read job descriptions"
  on public.job_descriptions
  for select
  to anon
  using (true);

grant select on public.job_descriptions to anon, authenticated;

create policy "public users can read companies"
  on public.companies
  for select
  to anon
  using (true);

create policy "authenticated users can read companies"
  on public.companies
  for select
  to authenticated
  using (true);

create policy "public users can read recruitment stats"
  on public.recruitment_stats
  for select
  to anon
  using (true);

create policy "authenticated users can read recruitment stats"
  on public.recruitment_stats
  for select
  to authenticated
  using (true);

grant select on public.companies to anon, authenticated;
grant select on public.recruitment_stats to anon, authenticated;
