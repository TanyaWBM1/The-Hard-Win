// The Hard Win — comment reply review (READ-ONLY).
// Lists AI-drafted comment replies that need a human look: statuses needs_review,
// needs_research, and failed. It reads from Supabase and prints them — nothing more.
//
// It NEVER updates the database, NEVER posts to Instagram, and NEVER needs Instagram
// credentials or permissions. See COMMENT_REPLY_WORKFLOW.md.
//
// Usage:
//   node replies-review.js        (or: npm run replies:review)

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

const sb = loadEnv("supabase.env");
const SB = sb.SUPABASE_URL.replace(/\/$/, "");
const SB_KEY = sb.SUPABASE_SERVICE_KEY;
// Read-only Supabase headers: this script only ever issues GET requests.
const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };

const STATUSES = ["needs_review", "needs_research", "failed"];

function fmt(v) {
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

(async () => {
  const url =
    `${SB}/rest/v1/ig_comment_replies` +
    `?status=in.(${STATUSES.join(",")})` +
    `&order=status.asc,created_at.asc`;
  const rows = await fetch(url, { headers: sbHeaders }).then((r) => r.json());
  if (!Array.isArray(rows)) throw new Error("supabase read: " + JSON.stringify(rows));

  console.log("");
  console.log("The Hard Win — comment replies to review (READ-ONLY, nothing is posted)");
  console.log("Statuses shown: " + STATUSES.join(", "));
  console.log("=".repeat(72));

  if (rows.length === 0) {
    console.log("\nNothing waiting. No rows in needs_review / needs_research / failed.\n");
    return;
  }

  for (const r of rows) {
    console.log("");
    console.log(`#${r.id}  [${fmt(r.status)}]  risk: ${fmt(r.risk_level)}  type: ${fmt(r.comment_type)}`);
    console.log(`  created_at : ${fmt(r.created_at)}`);
    console.log(`  from       : @${fmt(r.commenter_username)}`);
    console.log(`  comment    : ${fmt(r.comment_text)}`);
    console.log(`  AI draft   : ${fmt(r.ai_reply_draft)}`);
    if (r.approved_reply) console.log(`  approved   : ${fmt(r.approved_reply)}`);
    if (r.error_note) console.log(`  error_note : ${fmt(r.error_note)}`);
    console.log("-".repeat(72));
  }

  // Small summary so you can see the shape of the queue at a glance.
  const byStatus = {};
  for (const r of rows) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  console.log("");
  console.log(`${rows.length} row(s) to review — ` +
    STATUSES.map((s) => `${s}: ${byStatus[s] || 0}`).join("  ·  "));
  console.log("Read-only. To approve a reply, edit the row in Supabase (set approved_reply + status=approved).");
  console.log("");
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
