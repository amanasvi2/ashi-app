-- Reshapes student_profiles for the free-text intake flow. Profile
-- creation is now decoupled from creating the kid's login: a profile is
-- owned directly by the parent (parent_id) and only gets a student_id once
-- a login is created and linked later. Confirmed empty (checked via the
-- service_role read before writing this), so this is a clean drop/recreate
-- rather than a data migration.

drop table if exists public.student_profiles;

create table public.student_profiles (
  id                  uuid primary key default gen_random_uuid(),
  parent_id           uuid not null references auth.users(id) on delete cascade,
  student_id          uuid references public.students(id) on delete set null,
  display_name        text not null,
  grade               int not null,
  reading_level       numeric not null,
  strengths           text[] not null default '{}',
  focus               text[] not null default '{}',
  supports            text[] not null default '{}',
  session_length_min  int not null default 20,
  interests           text[] not null default '{}',
  is_active           boolean not null default true,
  created_at          timestamptz not null default now()
);

alter table public.student_profiles enable row level security;

-- Ownership is direct (parent_id), not resolved through the students table
-- like the old is_parent_of() pattern — a profile can exist before any
-- login does, so there's nothing to resolve "through" yet.
create policy "Parent manages own profiles" on public.student_profiles
  for all using (parent_id = auth.uid())
  with check (parent_id = auth.uid());

create policy "Student reads own linked profile" on public.student_profiles
  for select using (student_id = auth.uid());
