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
  target_career text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

alter table public.profiles enable row level security;
alter table public.academic_records enable row level security;
alter table public.evidence_records enable row level security;
alter table public.career_analysis_history enable row level security;

drop policy if exists "users can read own profile" on public.profiles;
drop policy if exists "users can upsert own profile" on public.profiles;
drop policy if exists "users can update own profile" on public.profiles;
drop policy if exists "users can read own academic records" on public.academic_records;
drop policy if exists "users can insert own academic records" on public.academic_records;
drop policy if exists "users can read own evidence" on public.evidence_records;
drop policy if exists "users can insert own evidence" on public.evidence_records;
drop policy if exists "users can delete own evidence" on public.evidence_records;
drop policy if exists "users can read own analysis history" on public.career_analysis_history;
drop policy if exists "users can insert own analysis history" on public.career_analysis_history;

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
