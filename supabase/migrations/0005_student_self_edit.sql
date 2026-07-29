-- Students currently have SELECT-only policies on student_profiles and
-- parent_config (from migrations 0003/0001). The kid-facing profile panel
-- lets them self-edit their own interests and AI-conversation-partner
-- gender (matches original app behavior, predating any parent onboarding),
-- which needs an UPDATE policy on their own row for both tables.
--
-- This is row-level, not column-level — a kid could technically also touch
-- grade/focus/daily_minimum via direct API calls the UI never exposes.
-- Acceptable simplification for this app's threat model (same reasoning
-- already applied elsewhere on student_profiles).

create policy "Student updates own profile" on public.student_profiles
  for update using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "Student updates own config" on public.parent_config
  for update using (student_id = auth.uid()) with check (student_id = auth.uid());
