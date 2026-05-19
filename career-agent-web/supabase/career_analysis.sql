-- Career Agent Supabase schema
-- Table: career_analysis
-- Purpose: save one input profile and one rule-based analysis result per row.

create extension if not exists "pgcrypto";

create table if not exists public.career_analysis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  input_profile jsonb not null,
  analysis_result jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists career_analysis_user_id_idx
  on public.career_analysis (user_id);

create index if not exists career_analysis_created_at_idx
  on public.career_analysis (created_at desc);

-- Enable RLS before production use.
alter table public.career_analysis enable row level security;

-- Development policy proposal.
-- This is permissive and should only be used while developing without auth.
-- Uncomment only for local/prototype testing.
--
-- create policy "dev allow anonymous insert"
--   on public.career_analysis
--   for insert
--   to anon
--   with check (true);
--
-- create policy "dev allow anonymous read"
--   on public.career_analysis
--   for select
--   to anon
--   using (true);

-- Production policy proposal after Supabase Auth is added.
-- Store auth.uid() in user_id and allow users to access only their own rows.
--
-- create policy "users can insert own analysis"
--   on public.career_analysis
--   for insert
--   to authenticated
--   with check (auth.uid() = user_id);
--
-- create policy "users can read own analysis"
--   on public.career_analysis
--   for select
--   to authenticated
--   using (auth.uid() = user_id);
