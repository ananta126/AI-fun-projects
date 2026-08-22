# QuestBank — The Missing ₹4.8 Crore (MVP)

Story-driven banking investigation. You are a data analyst. A fraud dashboard says things are getting better. The data says otherwise.

This is not a course. There are no lessons or quizzes — only a case, evidence, and an executive review.

## What the MVP does

- Simulated ₹200 entry (no real payments or withdrawals).
- Investigation feed that unlocks with story state.
- Four investigations plus a final review.
- Rewards: ₹25 → ₹60 → ₹90 → ₹120 → ₹150, always visible as UNLOCKED ₹x / ₹150.
- SQL scored on result sets, not query text.
- Lab (`/dev`): reset, jump, inspect story state, submissions, and reward history.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- Monaco Editor for SQL
- `sql.js` (SQLite WASM) isolated read-only challenge engine

PostgreSQL-style `SELECT` / `WITH` is accepted. Writes and DDL are blocked.

## Run locally

```bash
git clone https://github.com/ananta126/AI-fun-projects.git
cd AI-fun-projects
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Verify planted data:

```bash
npm run verify
```

Developer-only planted answers: `DEV_NOTES.md`. Do not share that file with playtesters.

## Live site

**https://ananta126.github.io/AI-fun-projects/**
