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

-- ── gyms (multi-tenant foundation, 2026-08-10) ──────────────
-- Was completely absent before this — every member/coach implicitly
-- belonged to "the" one gym that existed, and coach-facing RLS policies
-- below just checked is_coach() with no notion of WHICH gym, meaning any
-- second coach added would have seen every gym's members. This table +
-- profiles.gym_id below give every profile a real tenant, and the coach
-- policies are rescoped to same-gym-only accordingly.
create table if not exists gyms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text not null unique,
  created_at  timestamptz default now()
);

alter table gyms enable row level security;

-- Was "any authenticated user can read every gym's row" — tightened
-- 2026-08-10 when billing columns landed below (a member of gym A could
-- otherwise read gym B's invite_code, stripe_customer_id and subscription
-- status). Confirmed via grep that no frontend code actually relied on the
-- broad version: validate-invite.js/invite-code.js/create-gym.js all use
-- SUPABASE_SERVICE_ROLE_KEY, bypassing RLS entirely, so narrowing this
-- broke nothing. is_platform_admin()/my_gym_id() are both defined further
-- down this file (SECURITY DEFINER functions, see profiles section) but
-- referenced here — same forward-reference style already used throughout
-- this file, it's documentation of a live schema, not a run-in-order script.
create policy "Users can view their own gym"
  on gyms for select using (id = public.my_gym_id());

create policy "Platform admins can view all gyms"
  on gyms for select using (public.is_platform_admin());

-- Billing (Stripe subscriptions, per-gym) — 2026-08-10. One subscription
-- per gym: coaches pay, members never see or touch this. subscription_status
-- mirrors Stripe's own subscription.status values ('trialing', 'active',
-- 'past_due', 'canceled', 'unpaid', ...) written by api/stripe-webhook.js,
-- never guessed/derived client-side. trial_ends_at is set once at gym
-- creation (api/create-gym.js) and never touched again.
alter table gyms add column if not exists stripe_customer_id text;
alter table gyms add column if not exists stripe_subscription_id text;
alter table gyms add column if not exists subscription_status text not null default 'trialing';
alter table gyms add column if not exists trial_ends_at timestamptz;
alter table gyms add column if not exists current_period_end timestamptz;

-- Seed the one gym that already existed before this migration — idempotent,
-- only inserts if no gym exists yet at all. Real production data: applied
-- via Supabase MCP on 2026-08-10, this insert already ran once against the
-- live database (id 30cd42d5-ece1-453d-8866-d4e874d8d103).
insert into gyms (name, invite_code)
select 'VOLTA FITNESS', 'ONAIR2026'
where not exists (select 1 from gyms);

-- Backfill: gyms created before billing existed (the one above included)
-- would otherwise read as "trial already expired" the instant the billing
-- gate ships. Starts every pre-existing gym on a fresh 14-day trial from
-- the day this migration ran instead.
update gyms set trial_ends_at = now() + interval '14 days' where trial_ends_at is null;

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
  objectif   text,
  -- Server-only, written by api/cron/inactivity-nudge.js to send one push
  -- per inactivity episode rather than daily spam — nothing in the app
  -- reads or writes this from the client.
  last_inactivity_nudge_at timestamptz,
  -- Same idea, written by api/cron/streak-nudge.js — one streak nudge per
  -- day max, compared by date (not timestamp) against `today` in that job.
  last_streak_nudge_at timestamptz,
  -- Which gym this profile belongs to (see `gyms` above). Never trusted
  -- from the client (trg_prevent_self_privilege_insert below forces it
  -- null on any authenticated insert, and it's not in the UPDATE column
  -- GRANT allowlist either) — set only by api/complete-signup.js
  -- (service_role, re-validates the invite code server-side itself) or
  -- api/create-gym.js for coaches. Backfilled on 2026-08-10 for every
  -- profile that predates this column, to the one gym that existed.
  gym_id     uuid references gyms(id),
  -- Cross-gym platform-superadmin flag (billing/overview, 2026-08-10) —
  -- deliberately NOT the same thing as role='admin' above: that role is
  -- gym-scoped like a coach (is_coach() checks role in ('coach','admin'),
  -- and every same-gym RLS policy applies to it the same way). This is a
  -- second, independent axis for "sees every gym" — never set via any
  -- self-service flow, SQL-editor only, for Arnaud's own account.
  is_platform_admin boolean not null default false,
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
-- to protect (see the GRANT/trigger below). Rescoped 2026-08-10 to only
-- the coach's own gym (my_gym_id() below) — was unconditional, meaning
-- any second coach on the platform would have seen every gym's members.
create policy "Coaches can view same-gym profiles"
  on profiles for select using (is_coach() and gym_id = public.my_gym_id());

-- Reverse direction: a member needs to discover "the" coach to message
-- them (fetchPrimaryCoach() in src/utils/messages.js) — scoped to
-- coach/admin rows only, so a member still can't read another member's
-- profile through this policy. Also gym-scoped now, same reasoning.
create policy "Members can view own-gym coach profiles"
  on profiles for select
  using (role in ('coach', 'admin') and gym_id = public.my_gym_id());

-- Platform admin (Arnaud only, see is_platform_admin column above) can read
-- every profile across every gym — the one deliberate bypass of the
-- same-gym scoping every other policy on this table enforces, needed for
-- the cross-gym overview screen (PlatformAdmin.jsx).
create policy "Platform admins can view all profiles"
  on profiles for select using (public.is_platform_admin());

-- LA colonne du multi-salles : chaque policy "même salle" filtre dessus, et
-- CoachDashboard/ClientsList listent les membres d'une salle. Était sans
-- index jusqu'à l'audit du 2026-08-10 (suite 91, point 04) — invisible à 4
-- profils, mur à 5 000. Les sous-requêtes exists() des policies partent de
-- user_id (déjà couvert par profiles_user_id_key) ; celui-ci sert le
-- listing par salle.
create index if not exists profiles_gym_id_idx on profiles (gym_id);

create or replace function public.is_coach()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.profiles where user_id = auth.uid() and role in ('coach','admin'));
$$;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default, which
-- every role (including anon) inherits — a REVOKE targeted at just `anon`
-- does NOT override that. Revoke from PUBLIC, then re-grant explicitly to
-- the role that actually needs it (the "Coaches can view same-gym profiles"
-- policy above calls this on the caller's behalf).
revoke execute on function public.is_coach() from public;
grant execute on function public.is_coach() to authenticated;

-- Same pattern as is_coach() above — a caller's own gym_id, resolved via
-- SECURITY DEFINER so it doesn't re-trigger the RLS policy that depends on
-- it (would otherwise recurse — same class of bug already hit once on the
-- coach policy, see the 2026-07-10 entry in JOURNAL.md). Both PUBLIC and
-- the explicit per-role default grant to `anon` need revoking (revoking
-- from PUBLIC alone leaves anon's own explicit grant in place — the same
-- gotcha already documented below for prevent_self_role_escalation()).
create or replace function public.my_gym_id()
returns uuid language sql security definer set search_path = public stable as $$
  select gym_id from public.profiles where user_id = auth.uid();
$$;
revoke execute on function public.my_gym_id() from public;
revoke execute on function public.my_gym_id() from anon;
grant execute on function public.my_gym_id() to authenticated;

-- Same SECURITY DEFINER pattern again, same PUBLIC/anon revoke gotcha —
-- backs both the "Platform admins can view all X" policies (profiles,
-- gyms) and the frontend's PlatformAdmin.jsx route guard.
create or replace function public.is_platform_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((select is_platform_admin from public.profiles where user_id = auth.uid()), false);
$$;
revoke execute on function public.is_platform_admin() from public;
revoke execute on function public.is_platform_admin() from anon;
grant execute on function public.is_platform_admin() to authenticated;

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
grant update (prenom, email, poids, taille, age, objectif) on public.profiles to authenticated;

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

-- Same defect already fixed above on is_coach(): every new Supabase project
-- grants EXECUTE on new functions to PUBLIC *and* explicitly to
-- anon/authenticated/service_role via default privileges, so this trigger
-- function was directly callable via RPC. Not exploitable in practice —
-- Postgres rejects a trigger function called outside trigger context — but
-- fixed for consistency. Both layers need revoking (a `from public` alone
-- leaves the explicit per-role grants in place). No re-grant needed:
-- firing the trigger doesn't require the invoking session to hold EXECUTE
-- on the function itself, only table-level UPDATE (already gated above).
revoke execute on function public.prevent_self_role_escalation() from public;
revoke execute on function public.prevent_self_role_escalation() from anon, authenticated;

-- Found while adding is_platform_admin this session (2026-08-10) — the
-- guard above is UPDATE-only. The very first INSERT into profiles
-- (AuthContext.register()'s own client-side upsert, or literally any raw
-- REST call carrying a real user's own JWT — RLS's "Users can insert own
-- profile" policy only checks auth.uid() = user_id, nothing about which
-- columns are set) was completely unguarded: role and is_platform_admin
-- have no column-level INSERT grant restriction (only UPDATE was ever
-- locked down that way), so a payload with role: 'coach' or
-- is_platform_admin: true would go straight through. No legitimate client
-- flow ever sets either column on insert (role defaults to 'member',
-- is_platform_admin is SQL-editor-only) so forcing both unconditionally
-- breaks nothing real. service_role (create-gym.js's role='coach' path) is
-- unaffected — auth.role() there isn't 'authenticated'.
--
-- gym_id closed the same way as of 2026-08-10 (suite 90) — was left out
-- above on purpose because register()'s client-side upsert still depended
-- on setting it directly from a client-supplied value. That upsert is gone:
-- api/complete-signup.js (service_role) now re-validates the invite code
-- server-side and sets gym_id itself, so a client can never supply a
-- trusted gym_id again, by any path (this trigger for INSERT, the existing
-- column GRANT allowlist above for UPDATE — gym_id was never in that
-- allowlist, only INSERT was ever open).
create or replace function public.prevent_self_privilege_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' then
    new.role := 'member';
    new.is_platform_admin := false;
    new.gym_id := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_self_privilege_insert on public.profiles;
create trigger trg_prevent_self_privilege_insert
  before insert on public.profiles
  for each row execute function public.prevent_self_privilege_insert();
revoke execute on function public.prevent_self_privilege_insert() from public;
revoke execute on function public.prevent_self_privilege_insert() from anon, authenticated;

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
  -- Objectifs course/sommeil, modifiables directement depuis la carte du
  -- Dashboard concernée ("chemin simple" — pas besoin de passer par
  -- Réglages). Numeric plutôt qu'int : le sommeil se règle en heures
  -- fractionnaires (7.5h).
  km_objectif           numeric default 5,
  sommeil_h_objectif    numeric default 8,
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

-- Read-only — coaches never modify a member's own goals, just view them.
-- Rescoped to same-gym 2026-08-10, same reasoning as profiles above.
create policy "Coaches can view same-gym objectifs"
  on objectifs for select using (
    is_coach() and exists (
      select 1 from public.profiles p
      where p.user_id = objectifs.user_id and p.gym_id = public.my_gym_id()
    )
  );

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

-- Read-only — lets CoachDashboard/MemberDetail show a member's real meals
-- instead of the hardcoded mock data they used before. Rescoped to
-- same-gym 2026-08-10.
create policy "Coaches can view same-gym repas"
  on repas for select using (
    is_coach() and exists (
      select 1 from public.profiles p
      where p.user_id = repas.user_id and p.gym_id = public.my_gym_id()
    )
  );

-- Composite plutôt que user_id seul : tout le code lit repas par user_id +
-- plage de dates (AppContext, coachStats, streak). La colonne de la FK
-- reste en tête, donc l'exigence de la FK est satisfaite par le même index.
create index if not exists repas_user_date_idx on repas (user_id, date);

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

-- Read-only — same reasoning as repas above. Rescoped to same-gym 2026-08-10.
create policy "Coaches can view same-gym seances"
  on seances for select using (
    is_coach() and exists (
      select 1 from public.profiles p
      where p.user_id = seances.user_id and p.gym_id = public.my_gym_id()
    )
  );

-- Même raisonnement que repas_user_date_idx ci-dessus.
create index if not exists seances_user_date_idx on seances (user_id, date);

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

-- Read-only — same reasoning as repas above. Rescoped to same-gym 2026-08-10.
create policy "Coaches can view same-gym activite_jour"
  on activite_jour for select using (
    is_coach() and exists (
      select 1 from public.profiles p
      where p.user_id = activite_jour.user_id and p.gym_id = public.my_gym_id()
    )
  );

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

-- ── messages ──────────────────────────────────────────────
-- Persisted member↔coach chat. Each row is one message, ordered by
-- created_at; a "conversation" is just every row shared between two
-- specific participants (no separate conversations table needed for a
-- single coach per gym).
create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  content     text not null check (char_length(trim(content)) > 0),
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);

alter table messages enable row level security;

-- Either participant can read the thread.
create policy "Participants can view their messages"
  on messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Insert only as yourself, and only into a real member↔coach pair — blocks
-- a member from messaging another member, or spoofing sender_id, without
-- needing a separate relationships/conversations table. Rescoped to
-- same-gym 2026-08-10 — was is_coach() OR "receiver is any coach/admin
-- system-wide", meaning a coach at gym B could message gym A's members
-- and vice versa.
create policy "Users can message a valid same-gym member/coach counterpart"
  on messages for insert
  with check (
    auth.uid() = sender_id
    and (
      (is_coach() and exists (
        select 1 from public.profiles p
        where p.user_id = receiver_id and p.gym_id = public.my_gym_id()
      ))
      or exists (
        select 1 from public.profiles p
        where p.user_id = receiver_id and p.role in ('coach', 'admin')
          and p.gym_id = public.my_gym_id()
      )
    )
  );

-- Same pattern as profiles.role: a per-row USING/WITH CHECK can't restrict
-- which columns change, so lock the UPDATE grant down to read_at only —
-- the receiver can mark a message read, nothing else about it is editable
-- (no message-editing feature, by design).
revoke update on public.messages from authenticated, anon;
grant update (read_at) on public.messages to authenticated;

create policy "Receiver can mark a message read"
  on messages for update
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);

create index if not exists messages_thread_idx
  on messages (least(sender_id, receiver_id), greatest(sender_id, receiver_id), created_at);
create index if not exists messages_unread_idx
  on messages (receiver_id) where read_at is null;
-- messages_thread_idx est sur least/greatest des deux participants : il ne
-- couvre pas sender_id seul, dont la FK a besoin (audit 2026-08-10).
create index if not exists messages_sender_idx on messages (sender_id);

-- Realtime: let clients subscribe to new rows in their conversation.
alter publication supabase_realtime add table messages;

-- ── coach_notes ───────────────────────────────────────────
-- Private notes a coach keeps on a member (injury, particular goal,
-- etc.) — one evolving note per coach↔member pair, not a dated feed.
create table if not exists coach_notes (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references auth.users(id) on delete cascade,
  member_id  uuid not null references auth.users(id) on delete cascade,
  content    text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(coach_id, member_id)
);

alter table coach_notes enable row level security;

-- Strictly private to the authoring coach — not even another coach can
-- read it, and a member never can (no policy grants them access, RLS
-- default-denies).
create policy "Coach can view own notes"
  on coach_notes for select using (auth.uid() = coach_id);
create policy "Coach can insert own notes"
  on coach_notes for insert with check (auth.uid() = coach_id and is_coach());
create policy "Coach can update own notes"
  on coach_notes for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

create index if not exists coach_notes_lookup_idx on coach_notes (coach_id, member_id);
-- member_id n'est pas colonne de tête de l'index ci-dessus, sa FK n'était
-- donc pas couverte (audit 2026-08-10).
create index if not exists coach_notes_member_idx on coach_notes (member_id);

-- ── push_subscriptions ────────────────────────────────────
-- Web Push subscriptions — one row per browser/device a user has enabled
-- notifications on (a user can have several: phone + desktop).
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "Users can view own push subscriptions"
  on push_subscriptions for select using (auth.uid() = user_id);
create policy "Users can insert own push subscriptions"
  on push_subscriptions for insert with check (auth.uid() = user_id);
-- Upsert on conflict(endpoint) needs update permission too, for the case
-- where a browser re-subscribes with a new p256dh/auth on the same
-- endpoint (key rotation) — still scoped to the owning user.
create policy "Users can update own push subscriptions"
  on push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Users can delete own push subscriptions"
  on push_subscriptions for delete using (auth.uid() = user_id);

-- Lets api/send-push.js read a member's subscriptions using the SENDING
-- coach's own bearer token (RLS-scoped, no service_role key needed) — same
-- "coach reads member data" pattern as objectifs/repas/seances/etc.
-- Scope intentionally one-directional (coach → member push only) per this
-- iteration's scope; a member reading a coach's subscriptions isn't needed
-- since coach-side push isn't built yet. Rescoped to same-gym 2026-08-10.
create policy "Coaches can view same-gym member push subscriptions"
  on push_subscriptions for select using (
    is_coach() and exists (
      select 1 from public.profiles p
      where p.user_id = push_subscriptions.user_id and p.gym_id = public.my_gym_id()
    )
  );

-- api/send-push.js prunes a subscription when the push service reports it
-- gone (404/410) — using the sending coach's own token, same as the read.
-- Without this, that cleanup silently no-ops under RLS (0 rows affected,
-- no error), leaving dead endpoints that get retried forever. Rescoped to
-- same-gym 2026-08-10.
create policy "Coaches can delete stale same-gym member push subscriptions"
  on push_subscriptions for delete using (
    is_coach() and exists (
      select 1 from public.profiles p
      where p.user_id = push_subscriptions.user_id and p.gym_id = public.my_gym_id()
    )
  );

-- Mirrors the two policies above, other direction — lets api/send-push.js
-- read/prune a coach's subscriptions using a member's own bearer token, so
-- a member sending a message can notify their coach (coach-side push).
-- Rescoped to same-gym 2026-08-10.
create policy "Members can view own-gym coach push subscriptions"
  on push_subscriptions for select
  using (
    exists (
      select 1 from profiles p
      where p.user_id = push_subscriptions.user_id
        and p.role in ('coach', 'admin')
        and p.gym_id = public.my_gym_id()
    )
  );
create policy "Members can delete stale own-gym coach push subscriptions"
  on push_subscriptions for delete
  using (
    exists (
      select 1 from profiles p
      where p.user_id = push_subscriptions.user_id
        and p.role in ('coach', 'admin')
        and p.gym_id = public.my_gym_id()
    )
  );

-- ── leaderboard_weekly ────────────────────────────────────
-- Audit du marché 2026-08-06 : les concurrents directs (Sportigo, apps de
-- salle en marque blanche françaises) ont tous un volet gamification/
-- classement, et c'est le levier de rétention le plus cité dans la
-- littérature (5x rétention avec fonctionnalités sociales actives, 75%+
-- dans les salles à forte dimension communautaire — source dans
-- JOURNAL.md suite 47). Zéro tracker grand public (MyFitnessPal, Yazio)
-- ne peut proposer ça de façon crédible puisqu'ils n'ont pas de vraie
-- salle derrière — c'est le seul terrain où Volta n'a aucun concurrent
-- direct.
--
-- `seances` a RLS strict (auth.uid() = user_id) — un membre ne peut lire
-- QUE ses propres séances, ce qui est correct pour le tracking perso mais
-- rend un classement impossible en interrogeant la table directement.
-- Cette vue expose volontairement une tranche étroite et non sensible
-- (prénom + nombre de séances cette semaine, rien de nutritionnel/santé)
-- à tous les membres authentifiés — c'est un choix produit délibéré (un
-- classement de salle affiché au mur n'est pas différent), pas un
-- élargissement accidentel des policies RLS existantes.
--
-- security_invoker = false (explicite, pas le défaut implicite) : la vue
-- doit volontairement CONTOURNER le RLS de `seances`/`profiles` pour
-- pouvoir agréger les séances de tout le monde — avec security_invoker=true
-- elle n'aurait jamais renvoyé que la ligne de l'utilisateur courant,
-- vidant le classement de tout son sens.
--
-- Filtre gym_id ajouté le 2026-08-10 (fondations multi-salles) : c'était
-- littéralement TOUS les membres de l'app, sans distinction — un vrai
-- classement inter-salles par accident dès qu'une 2e salle existerait,
-- contrairement à l'intention ("un classement de salle affiché au mur").
create or replace view public.leaderboard_weekly
  with (security_invoker = false)
  as
  select
    p.user_id,
    p.prenom,
    count(s.id) as seances_semaine
  from profiles p
  left join seances s
    on s.user_id = p.user_id
    and s.date >= (current_date - interval '6 days')
  where p.role = 'member'
    and p.gym_id = public.my_gym_id()
  group by p.user_id, p.prenom;

grant select on public.leaderboard_weekly to authenticated;

create index if not exists push_subscriptions_user_idx on push_subscriptions (user_id);
