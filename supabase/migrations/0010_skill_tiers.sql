begin;
-- Structured adult observations only; no child narratives, names, or answers.
create table public.skill_assessments (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.students(id) on delete cascade,
 skill_id text not null check(skill_id in ('perspective_taking','nonverbal_cues','inference_from_text','nonliteral_language','identify_problem_and_solutions')),
 task text not null check(task in ('recognition','explanation','response')),
 situation text not null check(situation in ('unclear','excluded','disagreement','tone','help')),
 setting text not null check(setting in ('classroom','lunch','home','team activity','group chat','other setting')),
 context text not null check(context in ('familiar','new')),
 result text not null check(result in ('correct','partial','incorrect')),
 help text not null check(help in ('independent','general cue','model')),
 created_at timestamptz not null default now()
);
alter table public.skill_assessments enable row level security;
create policy "Owner manages skill observations" on public.skill_assessments for all
 using(public.is_owner_of(student_id)) with check(public.is_owner_of(student_id));
create policy "Student reads own skill observations" on public.skill_assessments for select using(student_id=auth.uid());
grant select,insert,update,delete on public.skill_assessments to authenticated;
-- Existing student write policies are preserved. Owner can read only the
-- skill-labelled carryover results needed for the shared progress summary.
create policy "Owner reads carryover skill attempts" on public.item_attempts for select
 using(source='carryover' and skill_id is not null and public.is_owner_of(student_id));
create policy "Student reads own transfer observations" on public.carryover_checks for select using(student_id=auth.uid());
create index skill_assessments_student_date on public.skill_assessments(student_id,created_at desc);
commit;
