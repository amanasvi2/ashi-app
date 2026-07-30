-- Conversation Practice hardening: persists transcripts (previously fully
-- ephemeral) so they're durably owner-visible, and so turn/time caps and
-- escalation flags survive a page reload. See server/conversationSafety.ts
-- for the decision logic that writes to this table.
--
-- Deliberately the OPPOSITE privacy shape of journal_entries: transcripts
-- ARE owner-visible (same policy shape as practice_sessions), because the
-- student is told plainly that their grown-up can read these chats. This
-- does not change journal_entries' own privacy at all.

create table public.conversation_sessions (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references public.students(id) on delete cascade,
  topic          text not null,
  started_at     timestamptz not null default now(),
  ended_at       timestamptz,
  turn_count     int not null default 0,
  transcript     jsonb not null default '[]',  -- [{role, content, at}]
  ended_reason   text,   -- 'turn_cap' | 'time_cap' | 'student_exit' | 'escalation'
  escalation     boolean not null default false,
  escalation_at  timestamptz
);

alter table public.conversation_sessions enable row level security;

create policy "Student and owner read conversation sessions" on public.conversation_sessions
  for select using (student_id = auth.uid() or public.is_owner_of(student_id));
create policy "Student manages own conversation sessions" on public.conversation_sessions
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

create index conversation_sessions_student_started_idx
  on public.conversation_sessions (student_id, started_at desc);
