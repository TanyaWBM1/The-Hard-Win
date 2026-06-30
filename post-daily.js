// The Hard Win — daily Instagram poster.
// Picks the next pending post from Supabase, ensures a card image exists,
// publishes it to Instagram, and marks the row as posted.
//
// Usage:
//   node post-daily.js            -> post the next pending card
//   node post-daily.js --id 3     -> post a specific row (by id), for testing
//   node post-daily.js --dry      -> do everything EXCEPT the final publish

const fs = require("fs");
const path = require("path");
const { renderCard } = require("./card");

// ---------- config / helpers ----------
function loadEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(path.join(__dirname, file), "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const ig = loadEnv("credentials.env");
const sb = loadEnv("supabase.env");
const SB = sb.SUPABASE_URL.replace(/\/$/, "");
const SB_KEY = sb.SUPABASE_SERVICE_KEY;
const GRAPH = "https://graph.instagram.com";
const BUCKET = "cards";

const args = process.argv.slice(2);
const forceId = args.includes("--id") ? args[args.indexOf("--id") + 1] : null;
const dryRun = args.includes("--dry");

const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };
const log = (...a) => console.log(new Date().toISOString(), ...a);

async function sbGetNext() {
  const today = new Date().toISOString().slice(0, 10);
  let url;
  if (forceId) {
    url = `${SB}/rest/v1/posts?id=eq.${forceId}&limit=1`;
  } else {
    // Posts ONLY rows a human has approved. 'pending' = staged/awaiting review.
    url =
      `${SB}/rest/v1/posts?status=eq.approved` +
      `&or=(scheduled_date.is.null,scheduled_date.lte.${today})` +
      `&order=scheduled_date.asc.nullslast,id.asc&limit=1`;
  }
  const r = await fetch(url, { headers: sbHeaders });
  const rows = await r.json();
  if (!Array.isArray(rows)) throw new Error("supabase read: " + JSON.stringify(rows));
  return rows[0] || null;
}

async function sbUpdate(id, patch) {
  const r = await fetch(`${SB}/rest/v1/posts?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...sbHeaders, Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error("supabase update: " + (await r.text()));
}

async function uploadCard(id, quote, explanation) {
  const buf = await renderCard({ quote, explanation });
  const file = `card-${id}-${Date.now()}.png`;
  const up = await fetch(`${SB}/storage/v1/object/${BUCKET}/${file}`, {
    method: "POST",
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "image/png" },
    body: buf,
  });
  if (!up.ok) throw new Error("upload: " + (await up.text()));
  return `${SB}/storage/v1/object/public/${BUCKET}/${file}`;
}

async function igCreate(imageUrl, caption) {
  const r = await fetch(`${GRAPH}/${ig.IG_USER_ID}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, caption: caption || "", access_token: ig.ACCESS_TOKEN }),
  });
  const j = await r.json();
  if (j.error) throw new Error("ig create: " + JSON.stringify(j.error));
  return j.id;
}

async function igWaitReady(containerId) {
  for (let i = 0; i < 10; i++) {
    const r = await fetch(`${GRAPH}/${containerId}?fields=status_code&access_token=${ig.ACCESS_TOKEN}`);
    const j = await r.json();
    if (j.status_code === "FINISHED") return;
    if (j.status_code === "ERROR") throw new Error("ig container error");
    await new Promise((res) => setTimeout(res, 3000));
  }
}

async function igPublish(containerId) {
  const r = await fetch(`${GRAPH}/${ig.IG_USER_ID}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerId, access_token: ig.ACCESS_TOKEN }),
  });
  const j = await r.json();
  if (j.error) throw new Error("ig publish: " + JSON.stringify(j.error));
  return j.id;
}

async function igComment(mediaId, message) {
  const r = await fetch(`${GRAPH}/${mediaId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, access_token: ig.ACCESS_TOKEN }),
  });
  const j = await r.json();
  if (j.error) throw new Error("ig comment: " + JSON.stringify(j.error));
  return j.id;
}

// ---------- main ----------
(async () => {
  const post = await sbGetNext();
  if (!post) {
    log("No approved posts. Nothing to do today. (Set a row's status to 'approved' to queue it.)");
    return;
  }
  try {
    const label = post.quote || post.hook || post.subject_name || "(untitled)";
    log(`Selected post #${post.id}: "${String(label).slice(0, 50)}..."`);

    let imageUrl = post.image_url;
    if (!imageUrl) {
      log("No image yet — generating and uploading a card...");
      imageUrl = await uploadCard(post.id, post.quote, post.explanation);
      await sbUpdate(post.id, { image_url: imageUrl });
      log("Card hosted:", imageUrl);
    }

    const caption = post.caption || post.quote || post.hook || "";
    log("Creating Instagram media container...");
    const containerId = await igCreate(imageUrl, caption);
    await igWaitReady(containerId);

    if (dryRun) {
      log("DRY RUN — everything is ready; skipping the final publish.");
      return;
    }

    log("Publishing to Instagram...");
    const postId = await igPublish(containerId);
    await sbUpdate(post.id, { status: "posted", posted_at: new Date().toISOString(), ig_post_id: postId });
    log("✅ PUBLISHED! Instagram post id:", postId);

    // First comment (secondary): the post is already live, so a comment failure must
    // NEVER undo it. Own try/catch — it logs + notes the failure but leaves status='posted'.
    const firstComment = (post.first_comment || "").trim();
    if (firstComment) {
      try {
        const commentId = await igComment(postId, firstComment);
        log("💬 First comment posted:", commentId);
      } catch (ce) {
        log("⚠️ first_comment failed (post is still live):", ce.message);
        await sbUpdate(post.id, { error_note: ("posted OK — first_comment failed: " + ce.message).slice(0, 500) }).catch(() => {});
      }
    } else {
      log("No first_comment set — skipping the comment step.");
    }
  } catch (e) {
    log("❌ ERROR:", e.message);
    await sbUpdate(post.id, { status: "error", error_note: String(e.message).slice(0, 500) }).catch(() => {});
    process.exit(1);
  }
})();
