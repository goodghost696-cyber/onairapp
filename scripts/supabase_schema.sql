-- ============================================================
-- ON AIR — Supabase schema
--
-- Regenerated 2026-07-17 directly from the live production database
-- (project wdwdigqxqctkverkbxyb) via introspection — the previous copy of
-- this file had drifted from prod (missing profiles.role, is_coach(),
-- the nutriscore/type_repas/type columns on repas, and every RLS/grant
-- fix applied by hand through the SQL editor across several sessions).
--
-- IMPORTANT: if you apply a fix directly against prod (SQL editor,
-- Supabase MCP, etc.), also update this file in the same change. This
-- file is documentation of intent, not a script that's safe to blindly
-- re-run against an existing database (uses `create table if not
-- exists`, but policies/functions/triggers use `create or replace` /
-- `drop ... if exists` where relevant so re-running is idempotent).
-- ============================================================

-- ── profiles ──────────────────────────────────────────────
create table if not exists profiles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  prenom     text,
  email      text,
  poids      numeric,
  taille     numeric,
  age        int,
  role       text not null default 'member',
  created_at timestamptz default now(),
  unique(user_id)
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = user_id);
create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = user_id);
-- No WITH CHECK here on purpose: role changes are blocked by the column
-- GRANT restriction below + the trg_prevent_self_role_escalation trigger,
-- not by this policy (a per-row policy can't restrict individual columns).
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = user_id);

-- Coaches/admins can read every member's profile — gated by is_coach(),
-- which is itself gated on the same `role` column this whole setup exists
-- to protect (see the GRANT/trigger below).
create policy "Coaches can view all profiles"
  on profiles for select using (is_coach());

create or replace function public.is_coach()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.profiles where user_id = auth.uid() and role in ('coach','admin'));
$$;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default, which
-- every role (including anon) inherits — a REVOKE targeted at just `anon`
-- does NOT override that. Revoke from PUBLIC, then re-grant explicitly to
-- the role that actually needs it (the "Coaches can view all profiles"
-- policy above calls this on the caller's behalf).
revoke execute on function public.is_coach() from public;
grant execute on function public.is_coach() to authenticated;

-- CRITICAL — the actual fix for self-promotion to coach/admin:
-- A column-level `revoke update (role) ...` does NOT override a broader
-- table-wide UPDATE grant that already covers that column (Postgres grants
-- are additive per grantee; the most permissive one wins). Supabase grants
-- table-wide INSERT/SELECT/UPDATE/DELETE to `authenticated`/`anon` on every
-- new table by default, which is why an earlier fix here silently never
-- held. The durable fix is to REVOKE the table-wide UPDATE grant entirely
-- and re-GRANT an explicit column allowlist that excludes `role`/`id`/
-- `user_id`/`created_at`.
revoke update on public.profiles from authenticated, anon;
grant update (prenom, email, poids, taille, age) on public.profiles to authenticated;

-- Defense in depth on top of the GRANT restriction above: block any role
-- change coming through PostgREST as `authenticated` unless the caller is
-- already coach/admin, so a future broad "grant all on all tables"
-- (a common Supabase troubleshooting reflex) can't silently reopen this.
-- Does not apply to service_role/postgres (manual promotion via SQL editor
-- remains possible).
create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.role() = 'authenticated' then
    if not exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role in ('coach', 'admin')
    ) then
      raise exception 'Not authorized to change role';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_self_role_escalation on public.profiles;
create trigger trg_prevent_self_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_self_role_escalation();

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
-- WITH CHECK required: without it, a member could rewrite this row's
-- user_id to masquerade as another member (same class of bug as
-- profiles.role — USING alone only restricts which row can be targeted,
-- not what it becomes).
create policy "Users can update own objectifs"
  on objectifs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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
  created_at timestamptz default now(),
  nutriscore text,
  type_repas text,
  type       text
);

alter table repas enable row level security;

-- No UPDATE policy on purpose: meals are edited by delete+re-insert
-- client-side (see addMeal()/deleteMeal() in AppContext.jsx) rather than
-- an in-place update, so RLS blocks UPDATE entirely by default (no
-- permissive policy = deny), regardless of the underlying table-wide GRANT.
create policy "Users can view own repas"
  on repas for select using (auth.uid() = user_id);
create policy "Users can insert own repas"
  on repas for insert with check (auth.uid() = user_id);
create policy "Users can delete own repas"
  on repas for delete using (auth.uid() = user_id);

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

-- Same as repas: no UPDATE policy, insert-only from the client.
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
-- WITH CHECK required — same reasoning as objectifs above.
create policy "Users can update own activite"
  on activite_jour for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── api_rate_limit ────────────────────────────────────────
-- Backs per-user sliding-window rate limiting for the api/* serverless
-- endpoints (claude, exercises, food-search) — see api/_lib/rateLimit.js.
-- Each authenticated request logs one row; endpoints count rows in a
-- window before deciding whether to proceed, then prune old rows.
create table if not exists api_rate_limit (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint   text not null,
  created_at timestamptz not null default now()
);

alter table api_rate_limit enable row level security;

create policy "Users can insert own rate limit rows"
  on api_rate_limit for insert with check (auth.uid() = user_id);
create policy "Users can view own rate limit rows"
  on api_rate_limit for select using (auth.uid() = user_id);
create policy "Users can delete own rate limit rows"
  on api_rate_limit for delete using (auth.uid() = user_id);

create index if not exists api_rate_limit_user_endpoint_idx
  on api_rate_limit (user_id, endpoint, created_at);
