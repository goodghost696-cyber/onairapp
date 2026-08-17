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

-- Quota mensuel d'appels IA de la salle. NULL = illimité. Défaut 2000 —
-- audit 2026-08-10 point 03 : il n'existait AUCUN plafond de coût, alors
-- que l'abonnement est un montant fixe par salle (revenu plat, coût
-- variable). À recalibrer sur le coût réellement constaté, que la table
-- ai_usage plus bas enregistre en tokens.
alter table gyms add column if not exists ai_quota_calls int default 2000;

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
  -- Server-only, written by api/cron/nudges.js (job=inactivity) to send one
  -- push per inactivity episode rather than daily spam — nothing in the
  -- app reads or writes this from the client.
  last_inactivity_nudge_at timestamptz,
  -- Same idea, written by api/cron/nudges.js (job=streak) — one streak
  -- nudge per day max, compared by date (not timestamp) against `today` in
  -- that job.
  last_streak_nudge_at timestamptz,
  -- Veille produit 2026-08-11, proposition n°2 : le statut ON TRACK/AT
  -- RISK/INACTIVE (computeStatus() côté client, dupliqué côté serveur dans
  -- api/cron/nudges.js pour la même raison d'import Vite que les 2
  -- colonnes ci-dessus) calculé au dernier passage du job `at-risk`. Sert
  -- uniquement à détecter la BASCULE vers AT RISK (et non le fait d'y
  -- rester) pour notifier le coach une fois par épisode, pas tous les
  -- jours. Réécrit à chaque passage du job, que la notification parte ou
  -- non — nothing in the app reads or writes this from the client.
  last_status_snapshot text,
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
-- `user_id`/`created_at`/`gym_id`/`is_platform_admin`.
--
-- 2026-08-15: this hole was reopened once — an avatar_url UPDATE 403'd
-- (the new column wasn't in the allowlist), and the "fix" was a table-wide
-- `grant update ... to authenticated` (the exact reflex this comment warns
-- about). role stayed safe via the trigger below, but gym_id and
-- is_platform_admin, allowlist-only at the time, briefly became
-- self-editable by any member (confirmed by a real exploit test). Reclosed
-- by migration reclose_profiles_update_grant_hole: allowlist restored (with
-- avatar_url added), and the trigger extended to gym_id/is_platform_admin.
--
-- 2026-08-17 : coach_data_consent / coach_data_consent_at rejoignent
-- l'allowlist (migration coach_data_consent_optin). Le membre doit pouvoir
-- poser ET retirer lui-meme son consentement au partage avec son coach —
-- c'est tout l'interet du dispositif. Ajoutes a l'allowlist, jamais par un
-- grant table-wide, pour la raison exacte decrite ci-dessus.
revoke update on public.profiles from authenticated, anon;
grant update (prenom, email, poids, taille, age, objectif, avatar_url,
              coach_data_consent, coach_data_consent_at) on public.profiles to authenticated;

-- Defense in depth on top of the GRANT restriction above: block any change
-- to a privilege column coming through PostgREST as `authenticated`, so a
-- future broad "grant all on all tables" (a common Supabase troubleshooting
-- reflex) can't silently reopen this. role: allowed only if the caller is
-- already coach/admin. gym_id / is_platform_admin: never, for authenticated
-- (all legit changes are service_role — create-gym.js, invite.js, manual
-- admin promotion — which bypass this since auth.role() <> 'authenticated';
-- mirrors prevent_self_privilege_insert on the INSERT path). Does not apply
-- to service_role/postgres.
create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' then
    if new.role is distinct from old.role then
      if not exists (
        select 1 from public.profiles
        where user_id = auth.uid() and role in ('coach', 'admin')
      ) then
        raise exception 'Not authorized to change role';
      end if;
    end if;
    if new.gym_id is distinct from old.gym_id then
      raise exception 'Not authorized to change gym_id';
    end if;
    if new.is_platform_admin is distinct from old.is_platform_admin then
      raise exception 'Not authorized to change is_platform_admin';
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

-- Veille produit 2026-08-11, proposition n°1 : le coach peut fixer
-- l'objectif d'un membre depuis sa fiche — inverse délibérément le "jamais"
-- du commentaire au-dessus de la policy SELECT (qui datait d'avant cette
-- décision produit). WITH CHECK sur les deux : sans lui, un coach pourrait
-- upsert/déplacer une ligne vers un user_id hors de sa salle (même classe
-- de bug déjà documentée pour "Users can update own objectifs" plus haut).
-- Testé pour de vrai (transaction annulée, coach@onairapp.com usurpé) :
-- upsert sur un membre de sa salle passe, upsert sur un membre fictif
-- rattaché à une autre salle échoue avec l'erreur RLS attendue (42501).
create policy "Coaches can set same-gym objectifs"
  on objectifs for insert with check (
    is_coach() and exists (
      select 1 from public.profiles p
      where p.user_id = objectifs.user_id and p.gym_id = public.my_gym_id()
    )
  );

create policy "Coaches can update same-gym objectifs"
  on objectifs for update
  using (
    is_coach() and exists (
      select 1 from public.profiles p
      where p.user_id = objectifs.user_id and p.gym_id = public.my_gym_id()
    )
  )
  with check (
    is_coach() and exists (
      select 1 from public.profiles p
      where p.user_id = objectifs.user_id and p.gym_id = public.my_gym_id()
    )
  );

-- ── habitudes ─────────────────────────────────────────────
-- Veille produit 2026-08-11, proposition n°3 : le coach assigne une
-- habitude/un défi à un membre (pattern Trainerize — habitudes assignées
-- avec streaks, associé à une meilleure rétention dans la veille). Le
-- coach crée/archive, le membre coche au quotidien (habitude_logs
-- ci-dessous) — séparation inverse de objectifs (point 1) : là le coach
-- écrit dans les données du membre, ici c'est le membre qui écrit son
-- propre suivi sur une ressource que le coach a créée.
create table if not exists habitudes (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  coach_id               uuid not null references auth.users(id) on delete cascade,
  titre                  text not null,
  frequence_par_semaine  int not null default 7,
  active                 boolean not null default true,
  created_at             timestamptz not null default now()
);

alter table habitudes enable row level security;

create policy "Members can view own habitudes"
  on habitudes for select using (auth.uid() = user_id);

-- Same-gym join, same shape as objectifs (point 1, suite 97).
create policy "Coaches can view same-gym habitudes"
  on habitudes for select using (
    is_coach() and exists (
      select 1 from public.profiles p
      where p.user_id = habitudes.user_id and p.gym_id = public.my_gym_id()
    )
  );

-- WITH CHECK on both INSERT and UPDATE — without it a coach could
-- assign/move a row onto a user_id outside their own gym, same class of
-- bug documented repeatedly in this file (profiles.role, objectifs).
create policy "Coaches can assign same-gym habitudes"
  on habitudes for insert with check (
    is_coach() and coach_id = auth.uid() and exists (
      select 1 from public.profiles p
      where p.user_id = habitudes.user_id and p.gym_id = public.my_gym_id()
    )
  );

create policy "Coaches can update same-gym habitudes"
  on habitudes for update
  using (
    is_coach() and exists (
      select 1 from public.profiles p
      where p.user_id = habitudes.user_id and p.gym_id = public.my_gym_id()
    )
  )
  with check (
    is_coach() and exists (
      select 1 from public.profiles p
      where p.user_id = habitudes.user_id and p.gym_id = public.my_gym_id()
    )
  );

create index if not exists habitudes_user_idx on habitudes (user_id);
create index if not exists habitudes_coach_idx on habitudes (coach_id);

-- ── habitude_logs ─────────────────────────────────────────
-- Un pointage = un jour coché "fait" pour une habitude. Le membre est seul
-- à écrire ici (coche/décoche lui-même), le coach lit seulement (suivi de
-- progression depuis la fiche membre).
create table if not exists habitude_logs (
  id           uuid primary key default gen_random_uuid(),
  habitude_id  uuid not null references habitudes(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  date         date not null default current_date,
  created_at   timestamptz not null default now(),
  unique(habitude_id, date)
);

alter table habitude_logs enable row level security;

create policy "Members can view own habitude logs"
  on habitude_logs for select using (auth.uid() = user_id);

-- WITH CHECK vérifie aussi que l'habitude référencée appartient bien à
-- l'appelant — sans ce second exists(), user_id = auth.uid() seul
-- empêcherait de cocher une habitude AU NOM de quelqu'un d'autre, mais pas
-- de cocher SA PROPRE complétion sur l'habitude_id de quelqu'un d'autre
-- (bruit/usurpation de progression sur une ressource qui n'est pas la
-- sienne).
create policy "Members can insert own habitude logs"
  on habitude_logs for insert with check (
    auth.uid() = user_id and exists (
      select 1 from public.habitudes h where h.id = habitude_logs.habitude_id and h.user_id = auth.uid()
    )
  );
create policy "Members can delete own habitude logs"
  on habitude_logs for delete using (auth.uid() = user_id);

create policy "Coaches can view same-gym habitude logs"
  on habitude_logs for select using (
    is_coach() and exists (
      select 1 from public.profiles p
      where p.user_id = habitude_logs.user_id and p.gym_id = public.my_gym_id()
    )
  );

create index if not exists habitude_logs_habitude_idx on habitude_logs (habitude_id);
create index if not exists habitude_logs_user_idx on habitude_logs (user_id);

-- Testé pour de vrai (transaction annulée, 2026-08-11) : coach@onairapp.com
-- assigne à Gisèle (même salle) → OK ; assignation à un profil hors salle →
-- rejetée 42501 ; Gisèle tente de s'auto-assigner une habitude → rejetée
-- (aucune policy INSERT pour les membres) ; Gisèle coche sa propre
-- habitude → OK ; Arnaud tente de cocher l'habitude de Gisèle en son
-- propre nom → rejetée ; le coach voit bien l'habitude + le pointage de
-- Gisèle. 6 cas, 3 positifs 3 négatifs, tout rollback derrière — zéro
-- trace laissée dans la vraie base.

-- ── programmes / programme_assignations ──────────────────────
-- Veille produit 2026-08-11, proposition n°4 : bibliothèque de programmes
-- réutilisables — le coach construit un programme une fois, l'assigne à
-- plusieurs membres au lieu de le refaire à chaque fois. Partagée entre
-- coachs d'une même salle (pas privée à celui qui l'a créée) : une vraie
-- bibliothèque d'équipe, mêmes droits qu'un coach a déjà sur les membres
-- de sa salle, étendus ici aux programmes de sa salle.
create table if not exists programmes (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references auth.users(id) on delete cascade,
  titre       text not null,
  -- Même shape que activeSession.exercises côté membre (AppContext.jsx
  -- addExercisesToSession) et que le JSON généré par "PROGRAMME IA"
  -- (Workout.jsx) : [{name, sets, reps, kg, rest}] — un programme assigné
  -- se branche directement dans le même flux "ajouter à la séance du
  -- jour", sans adaptateur.
  exercices   jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

-- Qui a reçu quel programme. Pas de notion de date/récurrence — le membre
-- pioche dans "mes programmes" quand il veut s'entraîner (Workout.jsx),
-- pas une obligation datée comme les habitudes.
create table if not exists programme_assignations (
  id            uuid primary key default gen_random_uuid(),
  programme_id  uuid not null references programmes(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  coach_id      uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique(programme_id, user_id)
);

alter table programmes enable row level security;
alter table programme_assignations enable row level security;

create policy "Coaches can view same-gym programmes"
  on programmes for select using (
    is_coach() and exists (
      select 1 from public.profiles p
      where p.user_id = programmes.coach_id and p.gym_id = public.my_gym_id()
    )
  );

-- Un membre ne voit un programme QUE s'il lui a été assigné — pas un accès
-- général à la bibliothèque de son coach. Passe par une fonction
-- SECURITY DEFINER plutôt qu'un exists() direct sur
-- programme_assignations : cette table a elle-même une policy INSERT qui
-- interroge `programmes` en retour (voir plus bas), et un exists() direct
-- ici créait un cycle que Postgres refuse ("infinite recursion detected in
-- policy", 42P17) même si le résultat serait fini en pratique. La fonction
-- court-circuite RLS pour cette seule vérification ponctuelle (même
-- pattern que is_coach()/my_gym_id() plus haut dans ce fichier), cassant
-- le cycle sans rien affaiblir : elle ne fait qu'un exists() borné à
-- auth.uid().
create or replace function public.member_has_programme(p_programme_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from programme_assignations pa
    where pa.programme_id = p_programme_id and pa.user_id = auth.uid()
  );
$$;

revoke execute on function public.member_has_programme(uuid) from public;
revoke execute on function public.member_has_programme(uuid) from anon;
grant execute on function public.member_has_programme(uuid) to authenticated;

create policy "Members can view assigned programmes"
  on programmes for select using (public.member_has_programme(programmes.id));

create policy "Coaches can create programmes"
  on programmes for insert with check (is_coach() and coach_id = auth.uid());

-- Bibliothèque d'équipe : n'importe quel coach de la même salle peut
-- modifier/supprimer un programme, pas seulement celui qui l'a créé (même
-- logique que la visibilité SELECT ci-dessus).
create policy "Coaches can update same-gym programmes"
  on programmes for update
  using (is_coach() and exists (select 1 from public.profiles p where p.user_id = programmes.coach_id and p.gym_id = public.my_gym_id()))
  with check (is_coach() and exists (select 1 from public.profiles p where p.user_id = programmes.coach_id and p.gym_id = public.my_gym_id()));

create policy "Coaches can delete same-gym programmes"
  on programmes for delete using (is_coach() and exists (select 1 from public.profiles p where p.user_id = programmes.coach_id and p.gym_id = public.my_gym_id()));

create index if not exists programmes_coach_idx on programmes (coach_id);

create policy "Members can view own programme assignations"
  on programme_assignations for select using (auth.uid() = user_id);

create policy "Coaches can view same-gym programme assignations"
  on programme_assignations for select using (
    is_coach() and exists (
      select 1 from public.profiles p
      where p.user_id = programme_assignations.user_id and p.gym_id = public.my_gym_id()
    )
  );

-- WITH CHECK vérifie DEUX appartenances, pas une seule : que le membre
-- visé est bien dans la salle du coach (même contrôle que partout
-- ailleurs), ET que le programme lui-même appartient à un coach de cette
-- même salle — sans ce second exists(), un coach aurait pu
-- deviner/référencer l'id d'un programme d'une AUTRE salle et l'assigner à
-- l'un de ses propres membres, fuite de contenu inter-salle même si
-- mineure (juste le texte d'un programme, pas une donnée personnelle).
create policy "Coaches can assign same-gym programmes"
  on programme_assignations for insert with check (
    is_coach()
    and coach_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.user_id = programme_assignations.user_id and p.gym_id = public.my_gym_id()
    )
    and exists (
      select 1 from public.programmes pr
      join public.profiles pc on pc.user_id = pr.coach_id
      where pr.id = programme_assignations.programme_id and pc.gym_id = public.my_gym_id()
    )
  );

create policy "Coaches can unassign same-gym programmes"
  on programme_assignations for delete using (
    is_coach() and exists (
      select 1 from public.profiles p
      where p.user_id = programme_assignations.user_id and p.gym_id = public.my_gym_id()
    )
  );

create index if not exists programme_assignations_programme_idx on programme_assignations (programme_id);
create index if not exists programme_assignations_user_idx on programme_assignations (user_id);

-- Testé pour de vrai (transaction annulée, 2026-08-11) : coach@onairapp.com
-- crée un programme → OK ; l'assigne à Gisèle (même salle) → OK ;
-- l'assigne à un profil hors salle → rejetée 42501 ; Gisèle voit bien le
-- programme qui lui a été assigné (contenu exact) ; Arnaud, qui n'a rien
-- reçu, ne voit RIEN dans programmes (0 ligne). 5 cas, tout rollback
-- derrière — zéro trace laissée dans la vraie base.

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

-- ── ai_usage ──────────────────────────────────────────────
-- Consommation IA agrégée par salle et par mois. Une ligne par (salle,
-- mois) plutôt qu'un journal par appel : c'est tout ce dont le quota a
-- besoin, et ça ne grossit pas. Le quota se compte en APPELS (explicable à
-- un coach), les tokens sont là pour calibrer le quota sur le coût réel.
create table if not exists ai_usage (
  gym_id        uuid not null references gyms(id) on delete cascade,
  period        date not null,
  calls         int    not null default 0,
  input_tokens  bigint not null default 0,
  output_tokens bigint not null default 0,
  updated_at    timestamptz default now(),
  primary key (gym_id, period)
);

-- Sert la somme globale (plafond plateforme) dans consume_ai_quota().
create index if not exists ai_usage_period_idx on ai_usage (period);

alter table ai_usage enable row level security;

-- Lecture seule côté client. Toute écriture passe par les deux fonctions
-- SECURITY DEFINER ci-dessous, jamais directement.
create policy "Coaches can view own gym ai usage"
  on ai_usage for select using (is_coach() and gym_id = public.my_gym_id());
create policy "Platform admins can view all ai usage"
  on ai_usage for select using (public.is_platform_admin());

-- Vérifie ET consomme en une opération atomique (verrou de ligne) : deux
-- appels simultanés ne peuvent pas passer tous les deux au-dessus du quota.
-- p_global_cap = filet plateforme, fourni par l'API depuis la variable
-- d'env AI_GLOBAL_MONTHLY_CALL_CAP.
create or replace function public.consume_ai_quota(p_global_cap int default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gym    uuid;
  v_quota  int;
  v_period date := date_trunc('month', now())::date;
  v_calls  int;
  v_global bigint;
begin
  select gym_id into v_gym from public.profiles where user_id = auth.uid();

  -- Profil sans salle : cas résiduel (auto-réparation de resolveRole), on
  -- laisse passer — le limiteur de rafale s'applique toujours. Rien à
  -- imputer à une salle, donc rien n'est compté.
  if v_gym is null then
    return jsonb_build_object('allowed', true, 'reason', 'no_gym');
  end if;

  select ai_quota_calls into v_quota from public.gyms where id = v_gym;

  insert into public.ai_usage (gym_id, period) values (v_gym, v_period)
  on conflict (gym_id, period) do nothing;

  select calls into v_calls from public.ai_usage
   where gym_id = v_gym and period = v_period for update;

  if v_quota is not null and v_calls >= v_quota then
    return jsonb_build_object('allowed', false, 'reason', 'gym_quota',
                              'used', v_calls, 'quota', v_quota);
  end if;

  if p_global_cap is not null then
    select coalesce(sum(calls), 0) into v_global from public.ai_usage where period = v_period;
    if v_global >= p_global_cap then
      return jsonb_build_object('allowed', false, 'reason', 'global_cap');
    end if;
  end if;

  update public.ai_usage set calls = calls + 1, updated_at = now()
   where gym_id = v_gym and period = v_period;

  return jsonb_build_object('allowed', true, 'used', v_calls + 1, 'quota', v_quota);
end;
$$;

-- Séparée de la consommation du quota : celui-ci doit bloquer AVANT
-- l'appel, alors que le coût réel n'est connu qu'APRÈS la réponse
-- d'Anthropic.
create or replace function public.record_ai_tokens(p_input bigint, p_output bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gym    uuid;
  v_period date := date_trunc('month', now())::date;
begin
  select gym_id into v_gym from public.profiles where user_id = auth.uid();
  if v_gym is null then return; end if;

  update public.ai_usage
     set input_tokens  = input_tokens  + greatest(coalesce(p_input, 0), 0),
         output_tokens = output_tokens + greatest(coalesce(p_output, 0), 0),
         updated_at    = now()
   where gym_id = v_gym and period = v_period;
end;
$$;

-- Même précaution que is_coach()/my_gym_id()/is_platform_admin() : révoquer
-- PUBLIC seul laisse en place le grant explicite à anon (piège déjà rencontré
-- deux fois sur ce projet).
revoke execute on function public.consume_ai_quota(int) from public;
revoke execute on function public.consume_ai_quota(int) from anon;
grant  execute on function public.consume_ai_quota(int) to authenticated;

revoke execute on function public.record_ai_tokens(bigint, bigint) from public;
revoke execute on function public.record_ai_tokens(bigint, bigint) from anon;
grant  execute on function public.record_ai_tokens(bigint, bigint) to authenticated;

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

-- ══════════════════════════════════════════════════════════════════════
-- Consentement au partage de donnees coach<->membre (2026-08-17)
-- Migration : coach_data_consent_optin
--
-- Point juridique ouvert depuis le 2026-08-16 (JOURNAL.md) : le membre
-- n'etait informe nulle part que son coach accede a ses donnees. Ce n'est
-- pas le RGPD "general" (base legale de la collecte) mais le partage vers
-- un TIERS HUMAIN identifie, qui demande un consentement explicite.
--
-- Place en fin de fichier a dessein : ces lter policy portent sur des
-- tables definies plus haut, ils doivent donc s'executer apres elles.
--
-- Choix de conception :
--   - Colonnes sur profiles plutot qu'une table dediee : la relation
--     coach<->membre n'est pas materialisee en base (pas de table de
--     jointure), elle se deduit de profiles.gym_id + un coach par salle.
--     Une table dediee n'aurait rien apporte de plus qu'une jointure.
--   - Defaut false, JAMAIS pose automatiquement, y compris pour les
--     comptes deja rattaches a un coach au moment de la migration.
--   - Le gate est en RLS et non dans l'UI : retirer le consentement doit
--     reellement couper l'acces, pas seulement masquer un affichage.
-- ══════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists coach_data_consent boolean not null default false,
  add column if not exists coach_data_consent_at timestamptz;

create or replace function public.member_shares_with_coach(member_user_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select coalesce(
    (select coach_data_consent from public.profiles where user_id = member_user_id),
    false
  );
$$;
revoke all on function public.member_shares_with_coach(uuid) from public;
grant execute on function public.member_shares_with_coach(uuid) to authenticated;

-- Les 6 policies par lesquelles un coach atteint les donnees listees dans
-- la politique de confidentialite : profil (poids/taille/objectif),
-- nutrition, activite/sommeil, seances, objectifs (lecture ET ecriture).
alter policy "Coaches can view same-gym profiles" on public.profiles
  using (is_coach() and gym_id = public.my_gym_id()
         and public.member_shares_with_coach(user_id));

alter policy "Coaches can view same-gym repas" on public.repas
  using (is_coach() and exists (
           select 1 from public.profiles p
           where p.user_id = repas.user_id and p.gym_id = public.my_gym_id())
         and public.member_shares_with_coach(repas.user_id));

alter policy "Coaches can view same-gym activite_jour" on public.activite_jour
  using (is_coach() and exists (
           select 1 from public.profiles p
           where p.user_id = activite_jour.user_id and p.gym_id = public.my_gym_id())
         and public.member_shares_with_coach(activite_jour.user_id));

alter policy "Coaches can view same-gym seances" on public.seances
  using (is_coach() and exists (
           select 1 from public.profiles p
           where p.user_id = seances.user_id and p.gym_id = public.my_gym_id())
         and public.member_shares_with_coach(seances.user_id));

alter policy "Coaches can view same-gym objectifs" on public.objectifs
  using (is_coach() and exists (
           select 1 from public.profiles p
           where p.user_id = objectifs.user_id and p.gym_id = public.my_gym_id())
         and public.member_shares_with_coach(objectifs.user_id));

alter policy "Coaches can update same-gym objectifs" on public.objectifs
  using (is_coach() and exists (
           select 1 from public.profiles p
           where p.user_id = objectifs.user_id and p.gym_id = public.my_gym_id())
         and public.member_shares_with_coach(objectifs.user_id));

-- NON gatees, volontairement, et a confirmer cote produit :
-- habitudes / habitude_logs / programmes / programme_assignations (contenu
-- assigne PAR le coach, absent de la liste de la politique de
-- confidentialite) et push_subscriptions (notification, pas donnee de
-- sante). Voir JOURNAL.md 2026-08-17.
-- ── 2026-08-17 (suite) : habitude_logs gate + vue d'identite ──────────
-- Migration : consent_habitude_logs_and_identity_view
--
-- 1) Les validations d'habitudes sont une donnee de SUIVI du membre, au
-- meme titre que ses repas ou ses seances -> elles rejoignent le perimetre
-- du consentement. habitudes (l'intitule assigne PAR le coach) reste
-- hors perimetre, pour qu'il puisse continuer a gerer ses assignations.
alter policy "Coaches can view same-gym habitude logs" on public.habitude_logs
  using (is_coach() and exists (
           select 1 from public.profiles p
           where p.user_id = habitude_logs.user_id and p.gym_id = public.my_gym_id())
         and public.member_shares_with_coach(habitude_logs.user_id));

-- 2) Identite minimale, HORS perimetre du consentement.
-- Postgres n'a pas de RLS au niveau colonne : poids/taille/objectif vivent
-- sur la meme ligne profiles que le prenom. Gater la ligne entiere
-- coupait bien l'acces aux donnees sensibles mais faisait disparaitre le
-- membre de toutes les listes du coach (clients, tableau de bord,
-- messagerie). Cette vue repond uniquement a "qui fait partie de ma
-- salle".
--
-- SECURITY DEFINER a dessein (en invoker, la RLS de profiles
-- reappliquerait le gate et la vue ne servirait a rien).
-- ATTENTION : c'est le motif exact de la faille leaderboard_weekly de la
-- Phase 1 (vue definer SANS filtre de salle). Les deux garde-fous du corps
-- ci-dessous ne sont pas negociables :
--   is_coach()            -> seuls les coachs voient quelque chose
--   gym_id = my_gym_id()  -> et uniquement leur propre salle
create or replace view public.coach_member_identity
with (security_invoker = false) as
  select p.id, p.user_id, p.prenom, p.gym_id,
         p.created_at as rattache_le,
         p.coach_data_consent, p.coach_data_consent_at
  from public.profiles p
  where p.role = 'member'
    and p.gym_id = public.my_gym_id()
    and public.is_coach();

revoke all on public.coach_member_identity from public, anon;
grant select on public.coach_member_identity to authenticated;
-- ── 2026-08-17 (suite 2) : is_same_gym_member, effet de bord du gate ──
-- Migration : same_gym_member_helper_unblocks_coach_actions
--
-- Decouvert PAR LE TEST : depuis que la policy SELECT de profiles est
-- gatee par le consentement, toutes les policies coach qui verifiaient
-- l'appartenance a la salle via
--   exists (select 1 from profiles p where p.user_id = X and p.gym_id = my_gym_id())
-- echouaient pour un membre non consentant — ce sous-select subit lui aussi
-- la RLS de profiles. Mesure : le coach ne pouvait plus assigner une
-- habitude (42501), ni un programme (42501), ni ENVOYER UN MESSAGE. Aucune
-- de ces actions ne releve du partage de donnees de suivi.
create or replace function public.is_same_gym_member(member_user_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = member_user_id
      and p.gym_id is not null
      and p.gym_id = public.my_gym_id()
  );
$$;
revoke all on function public.is_same_gym_member(uuid) from public;
grant execute on function public.is_same_gym_member(uuid) to authenticated;

-- Actions coach sans rapport avec les donnees de suivi -> debloquees :
--   habitudes (assign/select/update), programme_assignations
--   (assign/select/unassign), push_subscriptions (select/delete),
--   messages (branche coach -> membre).
-- Donnees de suivi -> meme helper pour la salle, le CONSENTEMENT reste le
-- seul et unique gate :
--   repas, activite_jour, seances, objectifs (select + update),
--   habitude_logs.
-- Chaque policy dit desormais explicitement "meme salle ET consentement",
-- au lieu de dependre du fait que le sous-select echouait deja de lui-meme.
-- Voir la migration pour le texte exact des 15 alter policy.