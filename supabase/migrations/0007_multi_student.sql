-- Multi-student support: generalizes "parent owns one student" into "an
-- owner (parent or clinician) owns up to N students." See
-- api/profile/save.ts for the per-owner-type cap, enforced server-side.
--
-- The core ownership RLS check (is_parent_of/is_owner_of, evaluated per
-- row) already worked correctly for any number of students per owner —
-- parent_id/owner_id was always a plain foreign key, never unique. The
-- only real schema changes here are: a new `owners` table to record
-- owner_type, and a rename (parent_id -> owner_id, is_parent_of ->
-- is_owner_of) so the naming isn't permanently wrong for clinicians.
--
-- Function bodies are re-parsed from raw text on every call (unlike view/
-- policy definitions, which are stored by column/object id and update
-- automatically on rename) — so is_parent_of's and
-- journal_activity_for_parent's bodies are explicitly fixed *before*
-- either function is renamed, in the order below, so nothing is ever left
-- pointing at a name that no longer exists.

begin;

-- ── owners: one row per parent or clinician account ─────────────────────

create table public.owners (
  id         uuid primary key references auth.users(id) on delete cascade,
  owner_type text not null default 'parent' check (owner_type in ('parent', 'clinician')),
  created_at timestamptz not null default now()
);

alter table public.owners enable row level security;

create policy "Owner reads own row" on public.owners
  for select using (id = auth.uid());
-- Self-declared at signup (src/auth.ts calls this insert directly with the
-- client's own token right after auth.signUp() succeeds) — owner_type
-- isn't a trust boundary in this pass, so no server-side verification.
-- No update/delete policy: once set at signup, it can't be changed by the
-- client at all (not even by the owner), so a parent can't just edit their
-- own row to raise their cap.
create policy "Owner creates own row" on public.owners
  for insert with check (id = auth.uid());

-- ── Rename parent_id -> owner_id ─────────────────────────────────────────
-- Column renames propagate automatically into existing policy/view
-- definitions (stored by column id, not re-parsed text), so none of the
-- policies on `students` or `student_profiles` need to be touched.

alter table public.students rename column parent_id to owner_id;
alter table public.student_profiles rename column parent_id to owner_id;

-- ── Fix is_parent_of's body (still named is_parent_of for now), *then* ──
-- ── rename it — every policy that calls it by OID keeps working through ──
-- ── both steps without modification. ─────────────────────────────────────

create or replace function public.is_parent_of(student uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.students s
    where s.id = student and s.owner_id = auth.uid()
  );
$$;

alter function public.is_parent_of(uuid) rename to is_owner_of;

-- ── Same treatment for journal_activity_for_parent: fix its body to call ─
-- ── the now-renamed is_owner_of (while it's still named _for_parent, so ──
-- ── the call above already resolves), then rename it too. Its actual ────
-- ── privacy behavior (dates only, never mood/content) is unchanged. ──────

create or replace function public.journal_activity_for_parent(p_student_id uuid)
returns table(date timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select je.date from public.journal_entries je
  where je.student_id = p_student_id
    and public.is_owner_of(p_student_id);
$$;

alter function public.journal_activity_for_parent(uuid) rename to journal_activity_for_owner;

-- Redundant with the original grant carrying over across the rename (it's
-- the same function object), but explicit rather than assumed.
grant execute on function public.journal_activity_for_owner(uuid) to authenticated;

-- NOTE: src/storage.ts's parentJournalActivity() calls this RPC by string
-- name ('journal_activity_for_parent') — that client-side call must be
-- updated to 'journal_activity_for_owner' in the same deploy as this
-- migration, or the parent/clinician dashboard's journal-activity strip
-- will break the moment this migration is applied.

-- ── Backfill: every existing owner_id becomes an owner_type='parent' row ─
-- ── — covers the current family plus any profile that has no linked ─────
-- ── login yet (student_id is null but owner_id is still set). ───────────

insert into public.owners (id, owner_type)
select distinct x.owner_id, 'parent'
from (
  select owner_id from public.students
  union
  select owner_id from public.student_profiles
) x
on conflict (id) do nothing;

commit;
