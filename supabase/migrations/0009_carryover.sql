begin;
create table public.carryover_moments (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id) on delete cascade,
 situation text not null check(situation in ('unclear','excluded','disagreement','tone','help')),
 setting text not null check(setting in ('classroom','lunch','home','team activity','group chat','other setting')),
 role text not null check(role in ('friend','sibling','teacher','classmate','adult','another person')),
 response text not null check(response in ('asked for help','asked what it meant','stayed quiet','disagreed','left the situation','tried another response')),
 skill_id text not null check(skill_id in ('perspective_taking','nonverbal_cues','inference_from_text','nonliteral_language','identify_problem_and_solutions')),
 created_at timestamptz not null default now(), unique(id,student_id)
);
create table public.carryover_items (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id) on delete cascade,
 moment_id uuid not null,
 skill_id text not null, support_level integer not null check(support_level between 0 and 3),
 difficulty integer not null check(difficulty between 1 and 3), item jsonb not null,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 reviewed_at timestamptz, reviewer_id uuid references auth.users(id), created_at timestamptz not null default now(),
 foreign key(moment_id,student_id) references public.carryover_moments(id,student_id) on delete cascade
);
create table public.carryover_checks (
 student_id uuid not null references public.students(id) on delete cascade, skill_id text not null, week date not null,
 opportunity text not null check(opportunity in ('yes','no','unsure')),
 rating text check(rating in ('worse','same','better')), help text check(help in ('independent','general cue','model')),
 check ((opportunity='yes' and rating is not null and help is not null) or (opportunity<>'yes' and rating is null and help is null)),
 primary key(student_id,skill_id,week)
);
create table public.carryover_lab_events (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id) on delete cascade,
 activity text not null check(activity in ('unfamiliar','repair','interpretations','tone')), scene integer not null check(scene>=0),
 result text not null check(result in ('correct','incorrect')), help boolean not null,
 created_at timestamptz not null default now()
);
create table public.carryover_missions (
 student_id uuid primary key references public.students(id) on delete cascade,
 mission text not null check(mission in ('Join an activity','Ask what someone means','Ask for more time','Set a boundary'))
);
create table public.carryover_snapshots (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id) on delete cascade,
 item_type text not null check(item_type in ('social','nonverbal','inference')), mastered boolean not null,
 support_level integer not null check(support_level between 0 and 3), difficulty integer not null check(difficulty between 1 and 3),
 created_at timestamptz not null default now()
);
alter table public.item_attempts add column source text not null default 'generated' check(source in ('generated','carryover')),
 add column carryover_item_id uuid references public.carryover_items(id) on delete set null,
 add column skill_id text;

alter table public.carryover_moments enable row level security;
alter table public.carryover_items enable row level security;
alter table public.carryover_checks enable row level security;
alter table public.carryover_lab_events enable row level security;
alter table public.carryover_missions enable row level security;
alter table public.carryover_snapshots enable row level security;
create policy "Owner manages moments" on public.carryover_moments for all using(public.is_owner_of(student_id)) with check(public.is_owner_of(student_id));
create policy "Owner manages reviewed items" on public.carryover_items for all using(public.is_owner_of(student_id)) with check(public.is_owner_of(student_id));
create policy "Student reads approved items" on public.carryover_items for select using(student_id=auth.uid() and status='approved');
create policy "Owner manages observations" on public.carryover_checks for all using(public.is_owner_of(student_id)) with check(public.is_owner_of(student_id));
create policy "Child records lab events" on public.carryover_lab_events for insert with check(student_id=auth.uid());
create policy "Child or owner reads lab events" on public.carryover_lab_events for select using(student_id=auth.uid() or public.is_owner_of(student_id));
create policy "Child manages mission" on public.carryover_missions for all using(student_id=auth.uid()) with check(student_id=auth.uid());
create policy "Owner reads mission" on public.carryover_missions for select using(public.is_owner_of(student_id));
create policy "Child records snapshots" on public.carryover_snapshots for insert with check(student_id=auth.uid());
create policy "Child or owner reads snapshots" on public.carryover_snapshots for select using(student_id=auth.uid() or public.is_owner_of(student_id));
grant select,insert,update,delete on public.carryover_moments,public.carryover_items,public.carryover_checks,public.carryover_lab_events,public.carryover_missions,public.carryover_snapshots to authenticated;
create index carryover_items_student_status on public.carryover_items(student_id,status);
create index carryover_events_student_date on public.carryover_lab_events(student_id,created_at desc);
commit;
