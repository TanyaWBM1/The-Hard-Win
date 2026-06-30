// The Hard Win — single source for the IG access token.
// Reads the live token from Supabase (public.ig_tokens, kept fresh by the cloud
// refresh Edge Function). Falls back to credentials.env if the DB is unreachable or
// not yet seeded, so the poster can NEVER be left without a token.
//
// Usage in post-daily.js:
//   const { getAccessToken } = require("./lib-ig-token");
//   const ACCESS_TOKEN = await getAccessToken(sb.SUPABASE_URL, sb.SUPABASE_SERVICE_KEY, ig.ACCESS_TOKEN);

async function getAccessToken(supabaseUrl, serviceKey, envFallbackToken) {
  try {
    const base = supabaseUrl.replace(/\/$/, "");
    const r = await fetch(`${base}/rest/v1/ig_tokens?id=eq.1&select=access_token,expires_at`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (r.ok) {
      const rows = await r.json();
      const tok = Array.isArray(rows) && rows[0] && rows[0].access_token;
      if (tok) {
        const exp = rows[0].expires_at ? new Date(rows[0].expires_at) : null;
        if (exp && exp.getTime() - Date.now() < 3 * 86400 * 1000) {
          console.warn(`[token] WARNING: Supabase token expires ${rows[0].expires_at} (<3 days) — check the refresh job.`);
        }
        return tok; // live token from Supabase
      }
    }
    console.warn("[token] Supabase ig_tokens empty/unreadable — falling back to credentials.env");
  } catch (e) {
    console.warn("[token] Supabase read failed (" + e.message + ") — falling back to credentials.env");
  }
  if (!envFallbackToken) throw new Error("No IG token in Supabase OR credentials.env");
  return envFallbackToken;
}

module.exports = { getAccessToken };
