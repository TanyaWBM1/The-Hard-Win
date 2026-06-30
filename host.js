// The Hard Win — upload cards to Supabase Storage and print public URLs
// Usage: node host.js
const fs = require("fs");
const path = require("path");

function loadEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(path.join(__dirname, file), "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnv("supabase.env");
const BASE = env.SUPABASE_URL.replace(/\/$/, "");
const KEY = env.SUPABASE_SERVICE_KEY;
const BUCKET = "cards";
const headers = { Authorization: `Bearer ${KEY}`, apikey: KEY };

async function ensureBucket() {
  const r = await fetch(`${BASE}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
  const j = await r.json().catch(() => ({}));
  if (r.ok) console.log(`Bucket "${BUCKET}" created (public).`);
  else if (JSON.stringify(j).includes("already exists")) console.log(`Bucket "${BUCKET}" already exists.`);
  else throw new Error("bucket: " + JSON.stringify(j));
}

async function upload(file) {
  const buf = fs.readFileSync(path.join(__dirname, "output", file));
  const r = await fetch(`${BASE}/storage/v1/object/${BUCKET}/${file}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "image/png", "x-upsert": "true" },
    body: buf,
  });
  if (!r.ok) throw new Error(`upload ${file}: ` + (await r.text()));
  return `${BASE}/storage/v1/object/public/${BUCKET}/${file}`;
}

async function run() {
  await ensureBucket();
  const files = fs.readdirSync(path.join(__dirname, "output")).filter((f) => f.endsWith(".png"));
  const urls = [];
  for (const f of files) {
    const url = await upload(f);
    urls.push(url);
    console.log("Uploaded:", url);
  }
  fs.writeFileSync(path.join(__dirname, "card-urls.txt"), urls.join("\n") + "\n");
  console.log(`\nDone. ${urls.length} cards hosted. Links saved to card-urls.txt`);
}

run().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
