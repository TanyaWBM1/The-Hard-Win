// The Hard Win — posts summary (READ-ONLY).
// Lists the account's recent Instagram posts with their like and comment counts, so you can
// glance at which posts have comment activity worth checking in the Instagram app.
//
// It ONLY reads (GET) the account's own media via `instagram_business_basic`. It does NOT read
// comment text, does NOT post, does NOT touch Supabase, and does NOT change anything.
//
// Note: it can show the *count* of comments per post, but not the comment text/authors — while
// the Meta app is unpublished/in Development mode the API withholds non-role users' comments.
// To read the actual comments, open the post in the Instagram app.
//
// Usage:
//   node posts-summary.js        (or: npm run posts:summary)

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

const ig = loadEnv("credentials.env");
const GRAPH = "https://graph.instagram.com";
const LIMIT = Number(process.env.MEDIA_SCAN_LIMIT || 25);

const cap = (s) => (s || "").replace(/\s+/g, " ").trim().slice(0, 48);
const day = (t) => (t || "").slice(0, 10);

(async () => {
  if (!ig.ACCESS_TOKEN || !ig.IG_USER_ID) throw new Error("credentials.env missing ACCESS_TOKEN / IG_USER_ID");

  const me = await fetch(`${GRAPH}/me?fields=username,account_type&access_token=${ig.ACCESS_TOKEN}`).then((r) => r.json());
  if (me.error) throw new Error("account read: " + JSON.stringify(me.error));

  const url = `${GRAPH}/${ig.IG_USER_ID}/media?fields=permalink,timestamp,comments_count,like_count,caption&limit=${LIMIT}&access_token=${ig.ACCESS_TOKEN}`;
  const m = await fetch(url).then((r) => r.json());
  if (m.error) throw new Error("media read: " + JSON.stringify(m.error));
  const posts = m.data || [];

  console.log("");
  console.log(`The Hard Win — posts summary (READ-ONLY)  ·  @${me.username} (${me.account_type})`);
  console.log("=".repeat(78));
  if (posts.length === 0) {
    console.log("\nNo posts found.\n");
    return;
  }

  let totalComments = 0, withComments = 0;
  for (const p of posts) {
    const c = p.comments_count || 0;
    const flag = c > 0 ? "💬" : "  ";
    totalComments += c;
    if (c > 0) withComments++;
    console.log(`${flag} ${day(p.timestamp)}  comments:${String(c).padStart(3)}  likes:${String(p.like_count || 0).padStart(3)}  ${p.permalink}`);
    console.log(`     ${cap(p.caption)}`);
  }

  console.log("-".repeat(78));
  console.log(`${posts.length} post(s) · ${withComments} with comments · ${totalComments} comments total`);
  console.log("Counts only — to read comment text, open the post in the Instagram app.");
  console.log("");
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
