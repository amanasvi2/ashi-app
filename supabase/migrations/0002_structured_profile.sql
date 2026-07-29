-- Replaces the IEP-upload pipeline (tailoring_profiles + ieps + the
-- iep-documents storage bucket) with a single structured-intake table,
-- student_profiles. Also fixes a real bug found while debugging tonight:
-- service_role was missing plain table grants, so it got "permission
-- denied" even though it should bypass RLS entirely.

-- ── Fix: service_role needs table/sequence grants, not just RLS bypass ────

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;

-- ── Drop the IEP-upload pipeline ─────────────────────────────────────────
-- (tables were effectively empty — every onboarding attempt failed at the
-- analysis step before this refactor, so there's nothing to migrate)

drop table if exists public.tailoring_profiles;
drop table if exists public.ieps;

drop policy if exists "Parents manage their own IEP files" on storage.objects;
delete from storage.objects where bucket_id = 'iep-documents';
delete from storage.buckets where id = 'iep-documents';

-- ── student_profiles: the new structured-intake schema ──────────────────

create table public.student_profiles (
  id                           uuid primary key default gen_random_uuid(),
  student_id                   uuid not null references public.students(id) on delete cascade,
  grade                        int not null,
  instructional_reading_level  numeric,
  english_learner              boolean not null default false,
  strengths                    text[] not null default '{}',
  targets                      jsonb not null default '[]',   -- [{skill, current, goal, level}]
  format_constraints           jsonb not null default '{"one_step_at_a_time":false,"short_directions":false,"read_aloud":false,"extended_response_time":false,"immediate_feedback":true,"graphic_organizers_for_writing":false}',
  session_length_target_min    int not null default 12,
  motivation                   text,
  interests                    text[] not null default '{}',
  is_active                    boolean not null default true,
  created_at                   timestamptz not null default now()
);

alter table public.student_profiles enable row level security;

create policy "Student and parent read profile" on public.student_profiles
  for select using (student_id = auth.uid() or public.is_parent_of(student_id));
create policy "Parent manages profile" on public.student_profiles
  for all using (public.is_parent_of(student_id))
  with check (public.is_parent_of(student_id));
