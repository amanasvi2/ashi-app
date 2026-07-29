-- Adaptive engine rework: 4 support levels, chance-corrected rolling
-- difficulty, session-boundary level changes, mastery decay, 14-day gap
-- re-entry, and a floor alarm. See src/adaptiveEngine.ts for the math.

-- ── Per-item history — the piece every rolling-window rule needs; ─────────
-- ── nothing like this existed before (only per-session aggregates did). ───

create table public.item_attempts (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references public.students(id) on delete cascade,
  item_type      text not null,
  support_level  int not null,
  difficulty     int not null,
  option_count   int,             -- k: 3 at support level 3, word-bank length at 2, null at 1/0
  result         text not null,   -- 'correct' | 'partial' | 'incorrect'
  created_at     timestamptz not null default now()
);

alter table public.item_attempts enable row level security;

create policy "Student manages own attempts" on public.item_attempts
  for all using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- Index for the "last N attempts of this type" query every rule relies on.
create index item_attempts_student_type_created_idx
  on public.item_attempts (student_id, item_type, created_at desc);

-- ── level_state: queued change + last-session timestamp for gap detection ──

alter table public.level_state
  add column pending jsonb not null default '{"social":null,"nonverbal":null,"inference":null}',
  add column last_session_at timestamptz;

-- ── difficulty_state: mastery-decay and floor-alarm flags per type ─────────

alter table public.difficulty_state
  add column mastery jsonb not null default '{"social":false,"nonverbal":false,"inference":false}',
  add column floor_alarm jsonb not null default '{"social":false,"nonverbal":false,"inference":false}';

-- ── Remap existing data: old level 2 ("most support") becomes new level 3; ─
-- ── 1 and 0 keep both their value and meaning unchanged. ───────────────────

update public.level_state set levels = jsonb_build_object(
  'social',    case when (levels->>'social')::int    = 2 then 3 else (levels->>'social')::int    end,
  'nonverbal', case when (levels->>'nonverbal')::int = 2 then 3 else (levels->>'nonverbal')::int end,
  'inference', case when (levels->>'inference')::int = 2 then 3 else (levels->>'inference')::int end
);
