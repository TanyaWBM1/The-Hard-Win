-- The Hard Win — IG token storage + monthly auto-refresh.
-- Apply to the Hard Win project (tpirzpvvhhgpnwsrbbnh) ONLY — never CreatorSeal.
-- Refresh uses grant_type=ig_refresh_token (current token only; NO APP_SECRET).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Singleton row: the current long-lived IG token + its expiry + last-attempt status.
create table if not exists public.ig_tokens (
  id                int primary key default 1 check (id = 1),
  access_token      text not null,
  expires_at        timestamptz,
  last_refreshed_at timestamptz,
  last_attempt_at   timestamptz,
  last_status       text,            -- 'ok' | 'error'
  last_error        text,
  updated_at        timestamptz not null default now()
);

-- Append-only log of every refresh attempt (this is the "never fail silently" record).
create table if not exists public.ig_token_refresh_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  status     text not null,          -- 'ok' | 'error'
  message    text,
  expires_in int
);

-- Lock down: RLS on + no policies + revoke = denied to anon/authenticated via PostgREST.
-- Only service_role (the Edge Function) and postgres/cron can read/write.
alter table public.ig_tokens            enable row level security;
alter table public.ig_token_refresh_log enable row level security;
revoke all on public.ig_tokens            from anon, authenticated;
revoke all on public.ig_token_refresh_log from anon, authenticated;

create or replace function public.touch_ig_tokens() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_touch_ig_tokens on public.ig_tokens;
create trigger trg_touch_ig_tokens before update on public.ig_tokens
  for each row execute function public.touch_ig_tokens();

-- Monthly refresh: 09:00 UTC on the 1st (~30-day cadence => 2 chances before the 60-day
-- expiry). pg_cron calls the Edge Function via pg_net, sending the shared trigger secret
-- (stored in Vault as 'ig_refresh_trigger_secret'; the function checks REFRESH_TRIGGER_SECRET).
select cron.schedule(
  'ig-token-refresh-monthly',
  '0 9 1 * *',
  $cron$
  select net.http_post(
    url     := 'https://tpirzpvvhhgpnwsrbbnh.functions.supabase.co/refresh-ig-token',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-trigger-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'ig_refresh_trigger_secret')
               ),
    body    := '{}'::jsonb
  );
  $cron$
);

-- DEPLOY-TIME, run separately (NOT committed, keeps the token out of the repo):
--   1) seed the current token:
--      insert into public.ig_tokens (id, access_token, expires_at)
--      values (1, '<CURRENT_IG_TOKEN>', now() + interval '60 days')
--      on conflict (id) do update set access_token = excluded.access_token, expires_at = excluded.expires_at;
--   2) create the shared trigger secret in Vault (same value set as the function's REFRESH_TRIGGER_SECRET):
--      select vault.create_secret('<RANDOM_SECRET>', 'ig_refresh_trigger_secret', 'cron -> refresh-ig-token auth');
