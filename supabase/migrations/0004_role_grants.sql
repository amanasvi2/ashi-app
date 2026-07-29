-- Migration 0002 only fixed table/sequence grants for service_role — the
-- same gap exists for `authenticated` and `anon`, which is what any
-- RLS-scoped client (supabase-js using a user's own JWT, or the anon key)
-- runs as. RLS policies are the real access-control boundary; a role also
-- needs the baseline table-level GRANT before Postgres even evaluates RLS.
-- Surfaced now because api/profile/save.ts is the first endpoint to write
-- through an RLS-scoped client instead of the service-role admin client.

grant usage on schema public to authenticated, anon;
grant all on all tables in schema public to authenticated, anon;
grant all on all sequences in schema public to authenticated, anon;
alter default privileges in schema public grant all on tables to authenticated, anon;
alter default privileges in schema public grant all on sequences to authenticated, anon;
