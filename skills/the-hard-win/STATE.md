# The Hard Win — STATE

Durable operational facts for this skill. **Not a session log and not the batch
status** — live queue counts / approvals live in `.claude` memory
(`thehardwin-ig-automation.md`). Update this file only when a fact below permanently
changes (a new project ref, a new ID, an oddity resolved, off-day baked in).

## Supabase — The Hard Win's OWN dedicated project
- **Project ref:** `tpirzpvvhhgpnwsrbbnh` — this Supabase project **IS "The Hard Win"**
  (that's its name in Supabase, region us-west-1). It is the **single, dedicated
  backend for everything Hard Win**: the `posts` table (content/control panel), the
  public **`cards`** storage bucket, the IG access token + expiry (via the token-refresh
  automation below), and any future Hard Win automation. Not shared with any other project.
- **URL:** `https://tpirzpvvhhgpnwsrbbnh.supabase.co`
- **MCP connector points at The Hard Win's own project (`tpirzpvvhhgpnwsrbbnh`).**
  Configured in `~/.mcp.json` as server **`supabase`**. CreatorSeal has its **own separate
  connector**, `supabase-creatorseal` → `yujhguzcyftzdmcnnwaz` — the two no longer share one.
  (MCP config loads at Claude Code startup, so a repoint only takes effect after a restart.)
- **Writes from scripts via REST** using `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` in
  `../../supabase.env` (project root). The MCP connector is read-only.

## Instagram / Meta IDs
- **IG_USER_ID:** `17841422822586632`
- **APP_ID:** `1006285125143977`
- **Secrets are NOT stored here.** `APP_SECRET` and `ACCESS_TOKEN` live in
  `../../credentials.env` (project root).
- Publishing + refresh use the **Instagram Login** flow on `graph.instagram.com`
  (token prefix `IGAA`). **Refresh needs ONLY the current token** —
  `GET /refresh_access_token?grant_type=ig_refresh_token&access_token=…` — APP_SECRET is
  NOT used by this flow (it would only matter for the Facebook-Login `fb_exchange_token` flow).
- The ~60-day token is being moved into Supabase and auto-refreshed in the cloud — see
  **Token-refresh automation** below.

## Token-refresh automation (cloud, Hard Win project only)
Goal: the ~60-day IG token lives in Supabase and is auto-refreshed in the cloud, so it
never silently expires and the poster no longer depends on a local `.env` token.
- **Edge Function `refresh-ig-token`** (`supabase/functions/refresh-ig-token/index.ts`):
  reads token from `public.ig_tokens` (id=1) → `GET graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token` (current token only; **no APP_SECRET**) → on success stores new token + `expires_at` and logs `ok`; on failure keeps old token, logs `error` to `ig_token_refresh_log`, optional `ALERT_WEBHOOK_URL` POST, returns 500. Gated by header `x-trigger-secret` == function secret `REFRESH_TRIGGER_SECRET`.
- **Tables** (`supabase/migrations/20260626130000_ig_token_refresh.sql`): `ig_tokens`
  (singleton current token) + `ig_token_refresh_log` (audit/alert). RLS on, no policies, revoked from anon/authenticated → only service_role + cron.
- **Schedule:** pg_cron `ig-token-refresh-monthly`, `0 9 1 * *` (1st of month, ~30-day cadence; 2 tries before the 60-day expiry), calls the function via pg_net with the trigger secret from Vault (`ig_refresh_trigger_secret`).
- **Poster reads token from Supabase:** helper `lib-ig-token.js` (`getAccessToken` reads `ig_tokens`, falls back to `credentials.env` if DB empty/unreachable so posting can't break).
- **DEPLOY STATUS (2026-06-26):** ✅ function deployed to `tpirzpvvhhgpnwsrbbnh` + `REFRESH_TRIGGER_SECRET` set (mirror value saved in `credentials.env`). ⏳ PENDING (needs DB access — Hard-Win MCP `apply_migration` after a Claude Code restart, or the DB password): apply the migration (tables + cron), seed `ig_tokens` with the current token, create the Vault `ig_refresh_trigger_secret`, then wire `post-daily.js` to use `getAccessToken`. ⏳ A real *successful* refresh test needs the token to be ≥24h old (created 2026-06-26) — IG rejects refresh inside 24h.
- **No local refresh job exists** (only manual `node ig.js longlived`); once cloud refresh is live, do NOT run `ig.js longlived` manually — it would race the cloud job and trip IG's 24h-between-refreshes limit.

## Known data oddities (expected — do not "fix")
- **`posts` row #1** is `status=posted` with `subject_name=NULL`. This is the user's
  **intentional n8n smoke-test** in the legacy *quote* format (`quote`/`explanation`
  columns, asset `card-1.png`), published live to @thehardwin on 2026-06-26
  (`ig_post_id 17975542959107679`). **Leave it — it is not a stray post.**
- **Row IDs #2–#7 don't exist** — early test rows that were deleted. The numbering gap
  is normal.
- The figure cards use the `subject_name/hook/body/copy_today/receipt` columns; the
  legacy quote posts use `quote/explanation`. Same table, two shapes.

## Off-day cards are NOT baked into the skill yet
- Seven **pre-rendered** off-day "receipt" PNGs exist in `../../assets/`
  (`hardwin-offday-*.png`) with helper `scripts/offday_load.py` and records
  `records/batch-offday.json`.
- This is a **side path, not yet a first-class post type** in `SKILL.md`
  (no validator rules, not in the documented batch flow).
- The off-day art is **already rendered — never regenerate or restyle it**, and those
  rows must not be approved until their `image_credit` (public-domain image source +
  license line) is filled.
