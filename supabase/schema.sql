-- QuestBank product schema (Supabase / PostgreSQL)
-- Challenge investigation data lives in an isolated engine, not these tables.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  display_name text,
  created_at timestamptz default now()
);

create table if not exists modules (
  id text primary key,
  title text not null,
  subtitle text,
  price_inr integer not null,
  max_reward_inr integer not null
);

create table if not exists stages (
  id text primary key,
  module_id text references modules(id),
  stage_order integer not null,
  title text not null,
  reward_inr integer not null
);

create table if not exists challenges (
  id text primary key,
  stage_id text references stages(id),
  title text not null,
  description text,
  type text not null,
  dataset_ref text,
  evaluation text
);

create table if not exists stage_progress (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  module_id text not null,
  stage_id text not null,
  status text not null default 'available',
  started_at timestamptz,
  completed_at timestamptz,
  unique (user_id, stage_id)
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  challenge_id text not null,
  stage_id text not null,
  payload jsonb,
  passed boolean not null,
  feedback text,
  submitted_at timestamptz default now()
);

create table if not exists rewards (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  module_id text not null,
  paid_amount integer not null default 0,
  reward_unlocked integer not null default 0,
  max_reward integer not null,
  updated_at timestamptz default now()
);

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  name text not null,
  properties jsonb,
  created_at timestamptz default now()
);
