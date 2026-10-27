# ASHI

Adaptive social-language and inference practice built with React, TypeScript,
Tailwind, Vite, Supabase, and server-side Groq APIs.

## Local development

Use Node.js 22.12+ (verified with Node 22.23.1).

```sh
npm ci
cp .env.example .env.local
# Fill in .env.local with your project values.
npm run dev
```

Open the Vite URL (normally http://127.0.0.1:5173).
`npm run dev` serves both the React UI and the existing `/api` handlers.
No Vercel CLI login is needed locally. API handlers retain their normal
Supabase authentication and row-level security.

The Supabase project must have the SQL migrations in `supabase/migrations`
applied in order. Use a development project for test accounts: pointing
ASHI at production uses production data. No offline auth/database emulator
is included.

Only the Supabase URL and anon key use the `VITE_` prefix. The service-role
and Groq keys stay server-side. Never commit `.env.local` or prefix secrets
with `VITE_`. Restart the dev server after changing environment values.

`npm run build` builds the frontend; Vercel runs `api/*.ts` separately,
with the same four environment variables configured there.
`npm run preview` previews static assets only, without API handlers.

## Checks

```sh
npm test
npm run build
npm run lint
```

Unit tests use mocks and need no live credentials. These commands DO
contact live services and may spend API credits or mutate data:

- `npm run test:rls`: creates and cleans up temporary Supabase accounts.
- `npm run items:generate`: generates batches using the production prompt.
- `npm run items:golden-test`: runs model scoring against the golden set.

## Carryover and practice lab

Apply `supabase/migrations/0009_carryover.sql`, then
`supabase/migrations/0010_skill_tiers.sql`, to a development Supabase
project first. The parent/clinician dashboard opens capture, review, weekly
observations, and a printable evidence brief. The student home opens missions
and bounded practice exercises. Each child retains the existing single-owner
access model. The new queue complements the developer item-review harness;
it does not expose that unauthenticated tool to end users.

For a fake-only, development-only preview, open
http://127.0.0.1:5173/?demo=carryover. The demo has three invented moments,
separate fake children, and in-memory review/check-in state. It never calls
an API or writes a database; refresh resets it. Production builds have no
demo entry point. Demo role switches do not change real authentication.

Moment capture saves only allowlisted role/setting/situation/response fields.
Optional free-text notes never leave the form. Reviewed edits have local
name replacement and an owner confirmation; this is not a general-purpose
automatic PII detector. Tone exercises compare contextual meaning, not
validated acoustic prosody. Practice-lab events and adult observations stay
separate from adaptive mastery; they do not establish clinical effectiveness.

```sh
npm run test:carryover-db
node --env-file=.env.local --import tsx scripts/carryover-live-check.ts
```

The database check runs isolated PostgreSQL/WASM with a minimal auth fixture,
without credentials or a live project. The live model check uses invented
moments, spends Groq credits, and writes its results under `../outputs`.
Groq's retired Llama 3.3 model was replaced with `openai/gpt-oss-120b`.
`GROQ_CHAT_MODEL` is an optional server-side override. Changing the model
requires rerunning the scoring golden set and reviewing disagreement cases.

## Developer item review

```sh
npm run items:review
```

Open http://localhost:4747. This is a local developer quality-review tool,
not a parent/clinician approval workflow. Generate batches first, then use
keyboard controls to review them. `npm run items:report` summarizes
verdicts; `npm run items:export-fewshot` exports prompt-tuning examples.

## Code map

- `src/adaptiveEngine.ts`: pure support/difficulty/mastery rules.
- `src/pages/Practice.tsx`: practice UI and session orchestration.
- `src/storage.ts`: Supabase persistence, scoped by student.
- `api/items/generate.ts`: generation prompt and output validation.
- `api/record-attempt.ts`, `api/recompute-difficulty.ts`: rolling attempt history.
- `server/conversationSafety.ts`: conversation limits and moderation decisions.
- `src/students.ts`, `src/profiles.ts`, migration `0007_multi_student.sql`:
  parent/clinician ownership and student model.
- `review/`, `scripts/items-*.ts`: item review and model-quality tooling.
- `server/localApi.ts`: development-only adapter; never a production backend.


## Skill tiers (pilot-v1)

Open **Carryover → Skill tiers** as an owner or student. Tiers are per skill:
Recognize → Explain → Respond → Generalize → Carry over. They are separate
from school grade, reading level, adaptive support, and difficulty; this change
does not implement grade-specific content generation or change engine thresholds.

The last 90 days of evidence are used. For each task, the latest result for each
distinct example is retained, then the latest 10 examples are assessed. Recognize,
Explain, and Respond require at least 3 distinct examples, 80% successful results,
and success across 2 days. Explain and Respond additionally require independence.
App/lab choices support recognition only, even if an app answer was open-ended.
Adult skill checks record the quality of explanations and created responses using
structured fields and no narratives. The server assigns child identity and time.

Generalize also requires independent responses in 2 unfamiliar settings and an
unfamiliar response at least 7 days after the first successful independent response.
Carry over also requires the latest 2 actual observed opportunity weeks to be
independent and rated same/better. No opportunity and unsure are excluded. Every
preceding tier must be supported. These rules are transparent pilot indicators,
not validated assessments; evidence expiry can lower a current tier.

Migration 0010 adds owner-recorded skill observations, read access for that child,
and scoped owner reading of skill-labelled carryover attempts. Students cannot
write adult checks or transfer ratings. Live loading requires both migrations.
There is a 500-row cap per evidence stream, so heavy use may need per-skill paging.
The dev-only fake demo seeds different tiers for the first child and no skill
checks for the second child. Nothing is written to Supabase in demo mode.

Tier tests: `src/tiers/model.test.ts`, `src/tiers/Panel.test.tsx`, and API checks in
`server/carryover.test.ts`. `npm run test:carryover-db` applies actual migrations
0009 and 0010 in isolated PostgreSQL/WASM and tests access and constraints. It
uses minimal existing-table fixtures, not a live Supabase project.

## User-flow regression checks

The `*.user.test.ts(x)` suites exercise the real React screens with simulated
accounts, storage, and AI service responses. They cover sign-in/up, onboarding,
student navigation, all practice support formats, a completed scored session,
conversation topics/ending/races, journal saves, rewards, profile controls,
parent settings/rewards/privacy, and clinician roster selection. They do not
create Supabase accounts, send live model requests, or validate deployment.

Run `npm test -- --maxWorkers=2`. HTTP integration cases need loopback networking.
A browser walkthrough of `?demo=carryover` uses temporary fake data that resets
when the demo is reloaded; this is intentional and not live persistence.

Coin/hint updates are still read-modify-write operations. The hint purchase now
persists its deduction and hint increment in one update, but cross-device
concurrency requires a database transaction/RPC before relying on it at scale.

## Deployment health and production schema

The current production domain is `https://ashiapp.vercel.app`. The older
`ashi-app-psi.vercel.app` alias no longer points at a deployment.

`GET /api/health` checks Supabase auth, a zero-row core-table read, and the
skill-tier table. It returns 200 when these probes pass and a Groq key is
configured, otherwise 503. It does not return records, keys, or raw upstream
errors. `modelVerification: configuration_only` explicitly means that model
availability and completion quality are not established by this route.

Migrations 0009 and 0010 were applied to the production Supabase project through
its SQL editor on October 26, 2026 after owner approval. Both completed
successfully; zero-row REST probes confirmed the new tables. Do not blindly
rerun those non-idempotent SQL files. Existing schema was set up manually and
is not represented as a full Supabase CLI migration history.

A green Vercel build or a working home page does not prove database health.
Before release, check `/api/health` and the published model configuration. The
retired `llama-3.3-70b-versatile` identifier is replaced with Groq-hosted
`openai/gpt-oss-120b` in this source; environment overrides are server-only.
