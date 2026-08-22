# QuestBank — The Missing ₹4.8 Crore (MVP)

Gamified, story-driven investigation. You are a bank data analyst. The fraud dashboard says suspicious activity fell; volumes did not. You work the case in five stages and unlock simulated rewards.

## 1. What the MVP does

- Simulated ₹200 entry (no real payments or withdrawals).
- Dashboard: module title, stage list, progress bar, reward ledger, current mission.
- Stage 1: inspect warehouse tables and answer three sequential questions.
- Stage 2: SQL console. Result-set scoring for missing fraud alerts.
- Stage 3: messy `*_raw` landing tables — duplicates, null/invalid customers, cloned alerts.
- Stage 4: evidence pack (five figures) plus a short written cause.
- Stage 5: executive memo and a three-question mini viva. Final skill score /100.
- Rewards: ₹25 → ₹60 → ₹90 → ₹120 → ₹150.
- Analytics events in `localStorage` for the simulated user.
- Lab (`/dev`): reset, complete/uncomplete stages, inspect submissions, reseed challenge DB.

## 2. Tech stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- Monaco Editor for SQL
- `sql.js` (SQLite WASM) isolated read-only challenge engine
- `@supabase/supabase-js` client stub (Auth not required)

PostgreSQL-style `SELECT` / `WITH` is accepted. `ILIKE` is rewritten to `LIKE`. Writes and DDL are blocked.

## 3. Project structure

```
/app          routes, layout, API
/components   shell, dashboard, investigation, challenges
/lib          progress, SQL engine, evaluation, datasets
/data         module copy and SQL starters
/types        shared types
/supabase     product schema SQL (future persistence)
/scripts      dataset and SQL verification
```

## 4. Supabase setup

Not required to play. Persistence is `localStorage` for user `sim-analyst-001`.

When you add a project:

1. Create a Supabase project.
2. Run `supabase/schema.sql`.
3. Set env vars below.
4. Swap `lib/progress.ts` storage helpers to the client in `lib/supabase.ts`.

Challenge rows must **not** live in the production schema.

## 5. Environment variables

See `.env.example`.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Leave blank for the simulated-user MVP.

## 6. Database setup

Product tables (future persistence): `supabase/schema.sql` — users, modules, stages, challenges, submissions, stage_progress, rewards, analytics_events.

Challenge tables (isolated `sql.js` engine):

- `customers` / `customers_raw`
- `transactions` / `transactions_raw`
- `fraud_alerts` / `fraud_alerts_raw`

Clean tables are keyed. Raw tables are not — they contain planted defects.

## 7. Seed data

Deterministic generator: `lib/challenge-data.ts` (seed `1262026`) plus `lib/messy-data.ts`.

Planted story (developer-only): `DEV_NOTES.md`. Do not share that file with playtesters.

Verify:

```bash
npx tsx scripts/verify-dataset.ts
npx tsx scripts/verify-sql.ts
npx tsx scripts/verify-rest.ts
```

## 8. How SQL evaluation works

1. `POST /api/sql` runs a query. `POST /api/evaluate/sql` scores it (`challengeId` selects the hidden expected set).
2. Safety: single `SELECT`/`WITH`. No `INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE/CREATE`, no multiple statements.
3. Execution is in `sql.js` (row cap 500).
4. Scoring compares ID sets (recall/precision ≥ 95%) plus a few hidden must-have IDs. The SQL text is never the answer key.

## 9. How rewards work

On module start: `paid_amount = 200`, `reward_unlocked = 0`, `max = 150`.

| Stage | Unlock |
| --- | --- |
| 1 Something Doesn't Add Up | +₹25 |
| 2 Find the Leak | +₹35 |
| 3 The Data Quality Problem | +₹30 |
| 4 Build the Evidence | +₹30 |
| 5 Executive Review | +₹30 |

Never exceeds ₹150. Reward history is stored separately from stage completion. Skill score is computed from passed challenges when the module completes.

## 10. How to run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Open the case file** → simulate ₹200.

Lab: [http://localhost:3000/dev](http://localhost:3000/dev)

## 11. How to deploy

Deploy as a **Node** Next.js app (Vercel or similar). API routes + WASM SQL mean this is not a static GitHub Pages export.

Set Supabase env vars only after you wire persistence.

## Playtester path

1. Open the site and start *The Missing ₹4.8 Crore* (₹200 simulated).
2. Work stages 1–5 in order. Do not skip story beats.
3. Unlock ₹25 → ₹60 → ₹90 → ₹120 → ₹150.
4. Finish the viva and note the skill score.
5. Reset in Lab and replay.
