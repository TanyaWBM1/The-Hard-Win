// The Hard Win — reply worker (DRAFT-ONLY by default).
// Finds approved comment replies in Supabase (ig_comment_replies) and, ONLY when explicitly
// switched live, posts them to Instagram. By default it is a DRY RUN: it shows exactly what
// it would post and changes nothing. See COMMENT_REPLY_WORKFLOW.md §6.
//
// The contract (never broken):
//   - Only ever processes rows where status = 'approved'.
//   - Posts the text in approved_reply — never ai_reply_draft, never anything it composes.
//   - On success: status -> posted, stamp posted_at.
//   - On failure: status -> failed, write error_note (never fail silently).
//
// Usage:
//   node reply-worker.js                    -> DRY RUN. List approved replies, post nothing.
//   node reply-worker.js --id 5             -> DRY RUN for one row.
//   REPLIES_LIVE=1 node reply-worker.js --confirm
//        -> ACTUALLY post approved replies to Instagram. BOTH the env flag AND --confirm are
//           required, and only after Tanya has approved the IG permission scope + this step.

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
const GRAPH = "https://graph.instagram.com";

const args = process.argv.slice(2);
const forceId = args.includes("--id") ? args[args.indexOf("--id") + 1] : null;
const confirmed = args.includes("--confirm");
const LIVE = process.env.REPLIES_LIVE === "1" && confirmed;

const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };
const log = (...a) => console.log(new Date().toISOString(), ...a);

async function getApproved() {
  let url = `${SB}/rest/v1/ig_comment_replies?status=eq.approved&order=approved_at.asc.nullslast,id.asc`;
  if (forceId) url = `${SB}/rest/v1/ig_comment_replies?id=eq.${forceId}&status=eq.approved`;
  const rows = await fetch(url, { headers: sbHeaders }).then((r) => r.json());
  if (!Array.isArray(rows)) throw new Error("supabase read: " + JSON.stringify(rows));
  return rows;
}

async function sbUpdate(id, patch) {
  const r = await fetch(`${SB}/rest/v1/ig_comment_replies?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...sbHeaders, Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error("supabase update: " + (await r.text()));
}

// Instagram Graph API: reply to a comment -> POST /{comment-id}/replies
async function igReply(ig, commentId, message) {
  const r = await fetch(`${GRAPH}/${commentId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, access_token: ig.ACCESS_TOKEN }),
  });
  const j = await r.json();
  if (j.error) throw new Error("ig reply: " + JSON.stringify(j.error));
  return j.id;
}

(async () => {
  const rows = await getApproved();
  log(`Reply worker — ${LIVE ? "LIVE" : "DRY RUN"}. ${rows.length} approved repl(y/ies) in queue.`);
  if (!LIVE) {
    log("(Draft-only. To actually post: set REPLIES_LIVE=1 AND pass --confirm, after Tanya approves the IG scope.)");
  }
  if (rows.length === 0) { log("Nothing approved to post. Done."); return; }

  const ig = LIVE ? loadEnv("credentials.env") : null;
  if (LIVE && (!ig.ACCESS_TOKEN || !ig.IG_USER_ID)) throw new Error("credentials.env missing ACCESS_TOKEN / IG_USER_ID");

  let posted = 0, failed = 0;
  for (const row of rows) {
    const preview = String(row.approved_reply || "").slice(0, 120);
    if (!row.approved_reply || !row.approved_reply.trim()) {
      // The DB constraint should prevent this, but never post an empty reply regardless.
      log(`  ⚠️ #${row.id} approved but empty approved_reply — skipping.`);
      continue;
    }

    if (!LIVE) {
      log(`  [would post] #${row.id} -> comment ${row.ig_comment_id}: "${preview}"`);
      continue;
    }

    try {
      await sbUpdate(row.id, { status: "posting" });
      const replyId = await igReply(ig, row.ig_comment_id, row.approved_reply);
      await sbUpdate(row.id, {
        status: "posted",
        posted_at: new Date().toISOString(),
        notes: (row.notes ? row.notes + " | " : "") + `posted reply id ${replyId}`,
      });
      posted++;
      log(`  ✅ posted #${row.id} (reply ${replyId})`);
    } catch (e) {
      failed++;
      log(`  ❌ #${row.id} failed: ${e.message}`);
      await sbUpdate(row.id, { status: "failed", error_note: String(e.message).slice(0, 500) }).catch(() => {});
    }
  }

  if (LIVE) log(`Done. Posted ${posted}, failed ${failed}.`);
  else log(`Dry run complete. ${rows.length} repl(y/ies) are ready and waiting for the live switch. Nothing was posted.`);
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
