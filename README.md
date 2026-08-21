# QuestBank — The Missing ₹4.8 Crore (MVP)

Gamified, story-driven investigation. You are a bank data analyst. The fraud dashboard says suspicious activity fell; volumes did not. You work the case in stages and unlock simulated rewards.

This slice is **playable through Stage 1 and Stage 2**. Stages 3–5 are sketched on the dashboard but not built yet.

## 1. What the MVP does

- Simulated ₹200 entry (no real payments).
- Dashboard with stage locks, progress bar, and reward ledger.
- Stage 1: inspect `customers`, `transactions`, `fraud_alerts` and answer 3 questions sequentially.
- Stage 2: write SQL against an isolated challenge dataset. Scoring compares **query results**, not the SQL string.
- Rewards: Stage 1 +₹25, Stage 2 +₹35 (₹60 / ₹150). Cap is ₹150.
- Analytics events stored in `localStorage` for the simulated user.
- Lab page (`/dev`) to reset progress and inspect submissions.

## 2. Tech stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- Monaco Editor for SQL
- `sql.js` (SQLite WASM) as an isolated, read-only challenge engine
- `@supabase/supabase-js` client stub (Auth not required for the simulated user)

PostgreSQL-style `SELECT` / `WITH` is accepted. `ILIKE` is rewritten to `LIKE`. Dangerous statements are blocked.

## 3. Project structure

```
/app          routes, layout, API
/components   shell, dashboard, investigation, challenges
/lib          progress, SQL engine, evaluation, dataset generator
/data         module copy (stages, story, challenges)
/types        shared types
/supabase     product schema SQL (users, modules, stages, …)
```

## 4. Supabase setup

Not required to play locally. Persistence is `localStorage` for user `sim-analyst-001`.

When you add a project:

1. Create a Supabase project.
2. Run `supabase/schema.sql`.
3. Set env vars below.
4. Swap `lib/progress.ts` storage helpers to the client in `lib/supabase.ts`.

Challenge rows must **not** live in the production schema. The investigation dataset is generated in-process and loaded into `sql.js`.

## 5. Environment variables

See `.env.example`.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Leave blank for the simulated-user MVP.

## 6. Database setup

Product tables (future persistence): `supabase/schema.sql`.

Challenge tables (isolated engine):

- `customers` (~500)
- `transactions` (~5,000)
- `fraud_alerts` (~500–700 depending on seed)

## 7. Seed data

Deterministic generator: `lib/challenge-data.ts` (seed `1262026`).

Planted story (developer-only): see `DEV_NOTES.md`. Do not show that file to playtesters.

## 8. How SQL evaluation works

1. User SQL hits `POST /api/sql` (run) or `POST /api/evaluate/sql` (score).
2. Safety layer allows only a single `SELECT` / `WITH`. Blocks `INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE/CREATE` and multiple statements.
3. Query runs in `sql.js` against the challenge snapshot (row cap 500).
4. Stage 2 scoring extracts `txn_id` and compares to the hidden set of settled transactions that match published fraud rules but have no `fraud_alerts` row. Hidden July CRYPTO ids must appear. Recall and precision both need to be ≥ 95%.

## 9. How rewards work

On module start: `paid_amount = 200`, `reward_unlocked = 0`, `max = 150`.

| Stage | Unlock |
| --- | --- |
| 1 | +₹25 |
| 2 | +₹35 |
| 3 | +₹30 (not playable yet) |
| 4 | +₹30 |
| 5 | +₹30 |

Never exceeds ₹150. Reward history is stored separately from stage completion flags.

## 10. How to run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Open the case file** → simulate ₹200 → Stage 1 → Stage 2.

Reset: [http://localhost:3000/dev](http://localhost:3000/dev)

## 11. How to deploy

Deploy as a **Node** Next.js app (Vercel, etc.). This slice uses API routes and WASM SQL — it is not a static GitHub Pages export.

Set the optional Supabase env vars only if you wire persistence.

## Playtester path

1. Open the site.
2. Start *The Missing ₹4.8 Crore* (₹200 simulated).
3. Use the warehouse snapshot; answer the three Stage 1 questions one at a time.
4. Unlock ₹25, then write SQL to recover missing alerts.
5. Unlock ₹60 / ₹150.
6. Reset in Lab and replay.
