-- Ashi multi-tenant schema: parents (Supabase Auth users) each own one or
-- more students (also Supabase Auth users, via a synthetic email — see
-- api/create-student.ts). Every student-scoped table is protected by RLS so
-- a parent can only ever touch their own students' rows, and a student can
-- only ever touch their own rows.

create extension if not exists pgcrypto;

-- ── students ─────────────────────────────────────────────────────────────

create table public.students (
  id           uuid primary key references auth.users(id) on delete cascade,
  parent_id    uuid not null references auth.users(id) on delete cascade,
  username     text not null,
  display_name text not null,
  gender       text check (gender in ('girl', 'boy', 'other')),
  created_at   timestamptz not null default now()
);

create unique index students_username_unique on public.students (lower(username));

-- ── Helper: is the calling user the parent of this student? ────────────────
-- (defined after `students` exists, since a SQL-language function's body is
-- validated against the catalog at creation time)

create or replace function public.is_parent_of(student uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.students s
    where s.id = student and s.parent_id = auth.uid()
  );
$$;

alter table public.students enable row level security;

create policy "Parent reads own students" on public.students
  for select using (parent_id = auth.uid());
create policy "Student reads own row" on public.students
  for select using (id = auth.uid());
create policy "Parent updates own students" on public.students
  for update using (parent_id = auth.uid());
-- Inserts happen server-side via the service role in api/create-student.ts,
-- which bypasses RLS, so no insert policy is needed for regular clients.

-- ── ieps (parent-only; never exposed to the student) ────────────────────────

create table public.ieps (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references public.students(id) on delete cascade,
  storage_path     text,               -- null if the parent pasted text instead of uploading a file
  original_filename text,
  extracted_text   text,
  uploaded_at      timestamptz not null default now()
);

alter table public.ieps enable row level security;

create policy "Parent manages own students' IEPs" on public.ieps
  for all using (public.is_parent_of(student_id))
  with check (public.is_parent_of(student_id));

-- ── tailoring_profiles ───────────────────────────────────────────────────

create table public.tailoring_profiles (
  id                 uuid primary key default gen_random_uuid(),
  student_id         uuid not null references public.students(id) on delete cascade,
  iep_id             uuid references public.ieps(id) on delete set null,
  item_type_weights  jsonb not null,
  initial_difficulty jsonb not null,
  goals_summary      text[] not null default '{}',
  parent_explanation text not null default '',
  is_active          boolean not null default true,
  created_at         timestamptz not null default now()
);

alter table public.tailoring_profiles enable row level security;

create policy "Student and parent read tailoring profile" on public.tailoring_profiles
  for select using (student_id = auth.uid() or public.is_parent_of(student_id));
create policy "Parent manages tailoring profile" on public.tailoring_profiles
  for all using (public.is_parent_of(student_id))
  with check (public.is_parent_of(student_id));

-- ── practice_sessions ────────────────────────────────────────────────────

create table public.practice_sessions (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references public.students(id) on delete cascade,
  date                timestamptz not null default now(),
  mode                text not null,
  score               numeric not null,
  max_score           numeric not null,
  item_count          int not null,
  ended_by            text not null,
  level_snapshot      jsonb not null,
  difficulty_snapshot jsonb not null,
  avg_response_ms     numeric
);

alter table public.practice_sessions enable row level security;

create policy "Student and parent read sessions" on public.practice_sessions
  for select using (student_id = auth.uid() or public.is_parent_of(student_id));
create policy "Student records own sessions" on public.practice_sessions
  for insert with check (student_id = auth.uid());

-- ── journal_entries (strictly student-private; parent gets dates only,   ──
-- ── via journal_activity_for_parent() below, never content)             ──

create table public.journal_entries (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  date       timestamptz not null default now(),
  mood       text not null,
  emoji      text,
  content    text not null
);

alter table public.journal_entries enable row level security;

create policy "Student manages own journal" on public.journal_entries
  for all using (student_id = auth.uid())
  with check (student_id = auth.uid());

create or replace function public.journal_activity_for_parent(p_student_id uuid)
returns table(date timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select je.date from public.journal_entries je
  where je.student_id = p_student_id
    and public.is_parent_of(p_student_id);
$$;

grant execute on function public.journal_activity_for_parent(uuid) to authenticated;

-- ── coins_state / level_state / difficulty_state / parent_config ───────────
-- One row per student. Student can read+write their own; parent read-only,
-- except parent_config which is parent-managed (matches the current
-- ParentDashboard settings UI).

create table public.coins_state (
  student_id   uuid primary key references public.students(id) on delete cascade,
  balance      int not null default 0,
  total_earned int not null default 0,
  hint_tokens  int not null default 0
);

create table public.level_state (
  student_id uuid primary key references public.students(id) on delete cascade,
  levels     jsonb not null,
  streaks    jsonb not null
);

create table public.difficulty_state (
  student_id uuid primary key references public.students(id) on delete cascade,
  state      jsonb not null
);

create table public.parent_config (
  student_id     uuid primary key references public.students(id) on delete cascade,
  daily_minimum  int not null default 1,
  interests      text[] not null default '{}',
  kid_gender     text check (kid_gender in ('girl', 'boy', 'other'))
);

alter table public.coins_state enable row level security;
alter table public.level_state enable row level security;
alter table public.difficulty_state enable row level security;
alter table public.parent_config enable row level security;

create policy "Student and parent read coins" on public.coins_state
  for select using (student_id = auth.uid() or public.is_parent_of(student_id));
create policy "Student writes own coins" on public.coins_state
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "Student and parent read levels" on public.level_state
  for select using (student_id = auth.uid() or public.is_parent_of(student_id));
create policy "Student writes own levels" on public.level_state
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "Student and parent read difficulty" on public.difficulty_state
  for select using (student_id = auth.uid() or public.is_parent_of(student_id));
create policy "Student writes own difficulty" on public.difficulty_state
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "Student and parent read config" on public.parent_config
  for select using (student_id = auth.uid() or public.is_parent_of(student_id));
create policy "Parent manages config" on public.parent_config
  for all using (public.is_parent_of(student_id)) with check (public.is_parent_of(student_id));

-- ── custom_rewards ───────────────────────────────────────────────────────

create table public.custom_rewards (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  label      text not null,
  emoji      text not null,
  url        text not null,
  cost       int not null
);

alter table public.custom_rewards enable row level security;

create policy "Student and parent read rewards" on public.custom_rewards
  for select using (student_id = auth.uid() or public.is_parent_of(student_id));
create policy "Parent manages rewards" on public.custom_rewards
  for all using (public.is_parent_of(student_id)) with check (public.is_parent_of(student_id));

-- ── Kid username → login email lookup (server-only, used by api/kid-login.ts) ──

create or replace function public.get_kid_login_email(p_username text)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.email
  from public.students s
  join auth.users u on u.id = s.id
  where lower(s.username) = lower(p_username)
  limit 1;
$$;

revoke all on function public.get_kid_login_email(text) from public, anon, authenticated;
grant execute on function public.get_kid_login_email(text) to service_role;

-- ── Storage: private bucket for IEP files, path-scoped per parent ──────────

insert into storage.buckets (id, name, public)
values ('iep-documents', 'iep-documents', false)
on conflict (id) do nothing;

create policy "Parents manage their own IEP files"
on storage.objects for all
using (bucket_id = 'iep-documents' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'iep-documents' and (storage.foldername(name))[1] = auth.uid()::text);
