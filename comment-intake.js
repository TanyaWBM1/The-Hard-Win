// The Hard Win — comment intake (DRAFT-ONLY).
// Pulls comments on our posts, classifies each, drafts a safe reply, and stages a row in
// Supabase (ig_comment_replies) as needs_review. It NEVER posts anything — the AI's job
// ends at a draft waiting for Tanya. See COMMENT_REPLY_WORKFLOW.md.
//
// Usage:
//   node comment-intake.js                 -> read sample-comments.json (offline, safe default)
//   node comment-intake.js --file x.json   -> read a specific fixture file
//   COMMENTS_LIVE=1 node comment-intake.js  -> read LIVE comments from Instagram
//        (requires an Instagram permission scope Tanya has approved; OFF by default)
//        Scans ALL recent posts on the account (the account's own media list), not just
//        the cards this system tracked. Bound the scan with MEDIA_SCAN_LIMIT (default 50):
//        MEDIA_SCAN_LIMIT=100 COMMENTS_LIVE=1 node comment-intake.js
//
// Re-running is safe: rows are de-duplicated on ig_comment_id, so a comment already staged
// (and possibly already approved/edited by Tanya) is left untouched.

const fs = require("fs");
const path = require("path");
const { classify } = require("./lib-comment-classify");

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
const fileArg = args.includes("--file") ? args[args.indexOf("--file") + 1] : "sample-comments.json";
const LIVE = process.env.COMMENTS_LIVE === "1";

const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };
const log = (...a) => console.log(new Date().toISOString(), ...a);

// ---- where comments come from --------------------------------------------
// Each returned comment: { ig_post_id, parent_media_id, ig_comment_id,
//                          commenter_username, comment_text, comment_permalink }

async function readFixture() {
  const p = path.join(__dirname, fileArg);
  if (!fs.existsSync(p)) throw new Error(`fixture not found: ${fileArg}`);
  const rows = JSON.parse(fs.readFileSync(p, "utf8"));
  if (!Array.isArray(rows)) throw new Error("fixture must be a JSON array of comments");
  return rows;
}

// LIVE reader — guarded. Only runs with COMMENTS_LIVE=1 and an approved permission scope.
async function readLive() {
  const ig = loadEnv("credentials.env");
  if (!ig.ACCESS_TOKEN || !ig.IG_USER_ID) throw new Error("credentials.env missing ACCESS_TOKEN / IG_USER_ID");

  // Scan ALL recent posts on the account — the account's own media list, not just the cards
  // this system tracked in Supabase. Bounded to MEDIA_SCAN_LIMIT most-recent posts.
  const media = await listRecentMedia(ig);
  log(`Scanning ${media.length} recent post(s) on the account for comments...`);

  const out = [];
  for (const m of media) {
    const mediaId = m.id;
    const url = `${GRAPH}/${mediaId}/comments?fields=id,text,username,timestamp&access_token=${ig.ACCESS_TOKEN}`;
    const j = await fetch(url).then((r) => r.json());
    if (j.error) { log("⚠️ could not read comments for", mediaId, "-", j.error.message || ""); continue; }
    for (const c of j.data || []) {
      out.push({
        ig_post_id: mediaId,
        parent_media_id: mediaId,
        ig_comment_id: c.id,
        commenter_username: c.username || null,
        comment_text: c.text || "",
        comment_permalink: m.permalink || null,
      });
    }
  }
  return out;
}

// Pull the account's recent media, following pages until we hit MEDIA_SCAN_LIMIT.
const MEDIA_SCAN_LIMIT = Number(process.env.MEDIA_SCAN_LIMIT || 50);
async function listRecentMedia(ig) {
  const media = [];
  let url = `${GRAPH}/${ig.IG_USER_ID}/media?fields=id,permalink,timestamp&limit=25&access_token=${ig.ACCESS_TOKEN}`;
  while (url && media.length < MEDIA_SCAN_LIMIT) {
    const j = await fetch(url).then((r) => r.json());
    if (j.error) throw new Error("ig media list: " + JSON.stringify(j.error));
    for (const m of j.data || []) media.push(m);
    url = (j.paging && j.paging.next) || null;
  }
  return media.slice(0, MEDIA_SCAN_LIMIT);
}

// ---- stage a row (dedupe on ig_comment_id; never clobber Tanya's work) ----
async function stage(row) {
  const c = classify(row.comment_text);
  const body = [{
    ig_post_id: row.ig_post_id || null,
    ig_comment_id: row.ig_comment_id || null,
    parent_media_id: row.parent_media_id || null,
    commenter_username: row.commenter_username || null,
    comment_text: row.comment_text || "",
    comment_permalink: row.comment_permalink || null,
    comment_type: c.comment_type,
    risk_level: c.risk_level,
    ai_reply_draft: c.ai_reply_draft,
    status: c.status,
    source_check_required: c.source_check_required,
    notes: c.notes,
  }];

  // resolution=ignore-duplicates: if ig_comment_id already exists, do nothing.
  const r = await fetch(`${SB}/rest/v1/ig_comment_replies?on_conflict=ig_comment_id`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("supabase insert: " + (await r.text()));
  const inserted = await r.json();
  return { classified: c, inserted: Array.isArray(inserted) && inserted.length > 0 };
}

// ---- main -----------------------------------------------------------------
(async () => {
  log(`Comment intake — DRAFT ONLY. Source: ${LIVE ? "LIVE Instagram" : `fixture (${fileArg})`}.`);
  if (!LIVE) log("(Live reading is OFF. Set COMMENTS_LIVE=1 only after the IG permission scope is approved.)");

  const comments = LIVE ? await readLive() : await readFixture();
  log(`Found ${comments.length} comment(s) to process.`);

  let staged = 0, skipped = 0;
  const tally = {};
  for (const row of comments) {
    if (!row.ig_comment_id) { log("⚠️ skipping a comment with no ig_comment_id"); continue; }
    try {
      const { classified, inserted } = await stage(row);
      tally[classified.comment_type] = (tally[classified.comment_type] || 0) + 1;
      if (inserted) {
        staged++;
        log(`  + staged ${row.ig_comment_id} [${classified.comment_type}/${classified.risk_level}] -> ${classified.status}`);
      } else {
        skipped++;
        log(`  = already staged ${row.ig_comment_id} (left untouched)`);
      }
    } catch (e) {
      log(`  ❌ failed on ${row.ig_comment_id}: ${e.message}`);
    }
  }

  log(`Done. Staged ${staged} new, skipped ${skipped} existing.`);
  log("By type:", JSON.stringify(tally));
  log("Nothing was posted. Review drafts in Supabase → ig_comment_replies (status=needs_review).");
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
