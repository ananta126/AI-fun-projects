-- QuestBank product schema (Supabase / PostgreSQL)
-- Challenge investigation data lives in an isolated engine, not these tables.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  display_name text,
  created_at timestamptz default now()
);

create table if not exists cases (
  id text primary key,
  title text not null,
  subtitle text,
  price_inr integer not null,
  max_reward_inr integer not null
);

create table if not exists investigations (
  id text primary key,
  case_id text references cases(id),
  investigation_order integer not null,
  title text not null,
  reward_inr integer not null,
  kind text not null default 'investigation'
);

create table if not exists evidence (
  id text primary key,
  case_id text references cases(id),
  table_name text not null,
  unlock_state text not null
);

create table if not exists challenges (
  id text primary key,
  investigation_id text references investigations(id),
  title text not null,
  description text,
  type text not null,
  dataset_ref text,
  evaluation text
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  challenge_id text not null,
  investigation_id text not null,
  payload jsonb,
  passed boolean not null,
  feedback text,
  submitted_at timestamptz default now()
);

create table if not exists case_progress (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  case_id text not null,
  story_state text not null default 'NOT_STARTED',
  paid_amount integer not null default 0,
  reward_unlocked integer not null default 0,
  max_reward integer not null,
  current_investigation_order integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  unique (user_id, case_id)
);

create table if not exists reward_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  case_id text not null,
  investigation_id text not null,
  event_type text not null,
  amount_inr integer not null,
  created_at timestamptz default now()
);

create table if not exists story_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  case_id text not null,
  story_state text not null,
  created_at timestamptz default now()
);

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  name text not null,
  properties jsonb,
  created_at timestamptz default now()
);
