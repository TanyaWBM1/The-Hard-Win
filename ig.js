// The Hard Win — Instagram API helper
// Reads credentials.env and provides small commands to set up & post.
// Usage:
//   node ig.js whoami        -> verify token, show account id/username
//   node ig.js longlived     -> exchange for a ~60-day token, save it back
//   node ig.js test          -> publish a test card (uses TEST_IMAGE_URL + TEST_CAPTION)

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

const cmd = process.argv[2];
const env = loadEnv();
const fn = { whoami, longlived, test }[cmd];
if (!fn) {
  console.log("Commands: whoami | longlived | test");
  process.exit(1);
}
fn(env).catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
