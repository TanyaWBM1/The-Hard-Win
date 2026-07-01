// The Hard Win — Instagram API helper
// Reads credentials.env and provides small commands to set up & post.
// Usage:
//   node ig.js whoami           -> verify token, show account id/username
//   node ig.js longlived        -> exchange for a ~60-day token, save it back
//   node ig.js test             -> publish a test card (uses TEST_IMAGE_URL + TEST_CAPTION)
//   node ig.js exchange <code>  -> turn an OAuth ?code=... into a saved long-lived token
//                                  (default redirect https://localhost/ ; override as 2nd arg)

const fs = require("fs");
const path = require("path");

const ENV_PATH = path.join(__dirname, "credentials.env");

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

function saveEnvValue(key, value) {
  let txt = fs.readFileSync(ENV_PATH, "utf8");
  if (new RegExp(`^${key}=.*$`, "m").test(txt)) {
    txt = txt.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${value}`);
  } else {
    txt += `\n${key}=${value}\n`;
  }
  fs.writeFileSync(ENV_PATH, txt);
}

const GRAPH = "https://graph.instagram.com";

async function whoami(env) {
  const url = `${GRAPH}/me?fields=user_id,username,account_type&access_token=${env.ACCESS_TOKEN}`;
  const r = await fetch(url);
  const j = await r.json();
  if (j.error) throw new Error(JSON.stringify(j.error));
  console.log("Connected to Instagram:");
  console.log("  username    :", j.username);
  console.log("  account type:", j.account_type);
  console.log("  user_id     :", j.user_id);
  if (j.user_id) saveEnvValue("IG_USER_ID", j.user_id);
  return j;
}

async function longlived(env) {
  // Instagram Login tokens are already long-lived; this REFRESHES (re-extends to ~60 days).
  const url = `${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${env.ACCESS_TOKEN}`;
  const r = await fetch(url);
  const j = await r.json();
  if (j.error) {
    console.log("Could not refresh yet (this is normal for a brand-new token).");
    console.log("Detail:", j.error.error_user_msg || j.error.message);
    console.log("Your token is already long-lived; we'll refresh it later.");
    return j;
  }
  const days = Math.round((j.expires_in || 0) / 86400);
  console.log(`Token refreshed, valid ~${days} days.`);
  if (j.access_token) saveEnvValue("ACCESS_TOKEN", j.access_token);
  console.log("Saved to credentials.env.");
  return j;
}

async function test(env) {
  if (!env.TEST_IMAGE_URL) throw new Error("Set TEST_IMAGE_URL in credentials.env first.");
  const create = await fetch(`${GRAPH}/${env.IG_USER_ID}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: env.TEST_IMAGE_URL,
      caption: env.TEST_CAPTION || "",
      access_token: env.ACCESS_TOKEN,
    }),
  }).then((r) => r.json());
  if (create.error) throw new Error("create: " + JSON.stringify(create.error));
  console.log("Media container created:", create.id);

  const publish = await fetch(`${GRAPH}/${env.IG_USER_ID}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: create.id, access_token: env.ACCESS_TOKEN }),
  }).then((r) => r.json());
  if (publish.error) throw new Error("publish: " + JSON.stringify(publish.error));
  console.log("PUBLISHED! Post id:", publish.id);
  return publish;
}

// Turn an OAuth authorization ?code=... into a saved long-lived token.
// Adds the comment scope to the account if you authorized with it in the URL.
const REDIRECT_URI_DEFAULT = "https://localhost/";
async function exchange(env) {
  let code = process.argv[3];
  const redirect = process.argv[4] || REDIRECT_URI_DEFAULT;
  if (!code) throw new Error("Usage: node ig.js exchange <code> [redirect_uri]");
  // Codes copied from the address bar are often URL-encoded and end with '#_'.
  code = decodeURIComponent(code.trim()).replace(/#_?$/, "");
  if (!env.APP_ID || !env.APP_SECRET) throw new Error("credentials.env needs APP_ID and APP_SECRET.");

  // 1) authorization code -> short-lived token
  const form = new URLSearchParams({
    client_id: env.APP_ID,
    client_secret: env.APP_SECRET,
    grant_type: "authorization_code",
    redirect_uri: redirect,
    code,
  });
  const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  }).then((r) => r.json());
  if (shortRes.error_type || shortRes.error || !shortRes.access_token) {
    throw new Error("code exchange failed: " + JSON.stringify(shortRes));
  }
  console.log("Short-lived token obtained.");
  console.log("  permissions:", JSON.stringify(shortRes.permissions || "(none reported)"));
  if (shortRes.user_id) saveEnvValue("IG_USER_ID", String(shortRes.user_id));

  // 2) short-lived -> long-lived (~60 days)
  const longUrl = `${GRAPH}/access_token?grant_type=ig_exchange_token&client_secret=${env.APP_SECRET}&access_token=${shortRes.access_token}`;
  const longRes = await fetch(longUrl).then((r) => r.json());
  if (longRes.error || !longRes.access_token) throw new Error("long-lived exchange failed: " + JSON.stringify(longRes));
  const days = Math.round((longRes.expires_in || 0) / 86400);
  saveEnvValue("ACCESS_TOKEN", longRes.access_token);
  console.log(`Long-lived token saved to credentials.env (valid ~${days} days).`);
  console.log("Next: node ig.js whoami");
  return longRes;
}

const cmd = process.argv[2];
const env = loadEnv();
const fn = { whoami, longlived, test, exchange }[cmd];
if (!fn) {
  console.log("Commands: whoami | longlived | test | exchange <code> [redirect_uri]");
  process.exit(1);
}
fn(env).catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
