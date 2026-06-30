// The Hard Win — IG token auto-refresh Edge Function.
// Deployed to the Hard Win Supabase project (tpirzpvvhhgpnwsrbbnh) ONLY.
//
// The Instagram-Login long-lived token is refreshed with grant_type=ig_refresh_token,
// which needs ONLY the current valid token — NO APP_SECRET. (APP_SECRET would only be
// used by the Facebook-Login fb_exchange_token flow, which this account does not use.)
//
// Flow: read current token from public.ig_tokens (id=1) -> call IG refresh ->
//   success: store new token + expiry, log 'ok'
//   failure: keep old token, log 'error', fire optional alert, return 500 (never silent).
//
// Auth: verify_jwt = false; protected by a shared header secret REFRESH_TRIGGER_SECRET
// that pg_cron sends. Refusing without it stops anyone who guesses the URL.

import { createClient } from "jsr:@supabase/supabase-js@2";

const GRAPH = "https://graph.instagram.com";

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}

async function logAttempt(sb: any, status: string, message: string, expiresIn: number | null) {
  await sb.from("ig_token_refresh_log").insert({ status, message, expires_in: expiresIn });
}

async function alert(message: string) {
  const hook = Deno.env.get("ALERT_WEBHOOK_URL");
  if (!hook) return; // no webhook configured -> the error log row IS the alert of record
  try {
    await fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: message }) });
  } catch (_) { /* alerting must never throw */ }
}

Deno.serve(async (req) => {
  // shared-secret gate
  const required = Deno.env.get("REFRESH_TRIGGER_SECRET");
  if (required && req.headers.get("x-trigger-secret") !== required) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // injected automatically into Edge Functions
  );

  // 1) current token
  const { data: row, error: readErr } = await sb.from("ig_tokens").select("*").eq("id", 1).single();
  if (readErr || !row) {
    const msg = `no token row in ig_tokens: ${readErr?.message ?? "missing"}`;
    await logAttempt(sb, "error", msg, null);
    await alert(`IG token refresh FAILED — ${msg}`);
    return json({ ok: false, error: msg }, 500);
  }

  // 2) refresh against Instagram
  let body: any;
  try {
    const r = await fetch(`${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${row.access_token}`);
    body = await r.json();
    if (body.error) throw new Error(body.error.error_user_msg || body.error.message || JSON.stringify(body.error));
    if (!body.access_token) throw new Error("IG response missing access_token");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await sb.from("ig_tokens").update({ last_status: "error", last_error: msg, last_attempt_at: new Date().toISOString() }).eq("id", 1);
    await logAttempt(sb, "error", msg, null);
    await alert(`IG token refresh FAILED — ${msg}`);
    return json({ ok: false, error: msg }, 500);
  }

  // 3) persist the fresh token
  const expiresAt = new Date(Date.now() + (body.expires_in ?? 0) * 1000).toISOString();
  const { error: upErr } = await sb.from("ig_tokens").update({
    access_token: body.access_token,
    expires_at: expiresAt,
    last_refreshed_at: new Date().toISOString(),
    last_attempt_at: new Date().toISOString(),
    last_status: "ok",
    last_error: null,
  }).eq("id", 1);
  if (upErr) {
    await logAttempt(sb, "error", `refreshed but DB write failed: ${upErr.message}`, body.expires_in ?? null);
    await alert(`IG token refreshed but DB write FAILED — ${upErr.message}`);
    return json({ ok: false, error: upErr.message }, 500);
  }

  await logAttempt(sb, "ok", `refreshed; expires_in=${body.expires_in}s`, body.expires_in ?? null);
  return json({ ok: true, expires_at: expiresAt, days: Math.round((body.expires_in ?? 0) / 86400) }, 200);
});
