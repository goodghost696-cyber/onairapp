-- ============================================================
-- ON AIR — Supabase schema
-- Run this in the Supabase SQL editor
-- ============================================================

-- Enable UUID extension (already active on Supabase)
-- create extension if not exists "uuid-ossp";

-- ── profiles ──────────────────────────────────────────────
create table if not exists profiles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  prenom     text,
  email      text,
  poids      numeric,
  taille     numeric,
  age        int,
  created_at timestamptz default now(),
  unique(user_id)
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = user_id);
create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = user_id);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = user_id);

-- ── objectifs ─────────────────────────────────────────────
create table if not exists objectifs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  calories_jour int default 2400,
  proteines     int default 180,
  glucides      int default 240,
  lipides       int default 80,
  eau_ml        int default 2500,
  pas_jour      int default 10000,
  updated_at    timestamptz default now(),
  unique(user_id)
);

alter table objectifs enable row level security;

create policy "Users can view own objectifs"
  on objectifs for select using (auth.uid() = user_id);
create policy "Users can insert own objectifs"
  on objectifs for insert with check (auth.uid() = user_id);
create policy "Users can update own objectifs"
  on objectifs for update using (auth.uid() = user_id);

-- ── repas ─────────────────────────────────────────────────
create table if not exists repas (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date default current_date,
  nom        text not null,
  calories   int default 0,
  proteines  numeric default 0,
  glucides   numeric default 0,
  lipides    numeric default 0,
  portion    text default '100g',
  created_at timestamptz default now()
);

alter table repas enable row level security;

create policy "Users can view own repas"
  on repas for select using (auth.uid() = user_id);
create policy "Users can insert own repas"
  on repas for insert with check (auth.uid() = user_id);
create policy "Users can delete own repas"
  on repas for delete using (auth.uid() = user_id);

-- Added 2026-07-13: nutriscore + meal type (petit-déj/déjeuner/dîner/collation),
-- both already produced by the app (Nutrition.jsx, Scan.jsx) but not yet persisted.
alter table repas add column if not exists nutriscore text;
alter table repas add column if not exists type text;

-- ── seances ───────────────────────────────────────────────
create table if not exists seances (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date default current_date,
  nom        text default 'SÉANCE',
  duree_min  int default 0,
  exercices  jsonb default '[]',
  created_at timestamptz default now()
);

alter table seances enable row level security;

create policy "Users can view own seances"
  on seances for select using (auth.uid() = user_id);
create policy "Users can insert own seances"
  on seances for insert with check (auth.uid() = user_id);
create policy "Users can delete own seances"
  on seances for delete using (auth.uid() = user_id);

-- ── activite_jour ─────────────────────────────────────────
create table if not exists activite_jour (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date default current_date,
  pas         int default 0,
  eau_ml      int default 0,
  sommeil_h   numeric default 0,
  km_courus   numeric default 0,
  updated_at  timestamptz default now(),
  unique(user_id, date)
);

alter table activite_jour enable row level security;

create policy "Users can view own activite"
  on activite_jour for select using (auth.uid() = user_id);
create policy "Users can insert own activite"
  on activite_jour for insert with check (auth.uid() = user_id);
create policy "Users can update own activite"
  on activite_jour for update using (auth.uid() = user_id);
