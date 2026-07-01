# Comment Reply Workflow — The Hard Win

How we handle comments on Hard Win Instagram posts. The AI may **draft** a suggested
reply, but **nothing is published until Tanya approves it**. This is the same rule that
governs the posts themselves: automate the labor, never the judgment.

> **The one rule that outranks everything here:**
> **AI may draft public replies, but Tanya must approve every reply before posting.**

**Where reviews live:** Supabase — the `public.ig_comment_replies` table
(project **The Hard Win**, `tpirzpvvhhgpnwsrbbnh`). Not Google Sheets, not Airtable. This is
the same database that already holds the `posts` queue, so approvals live in one place.

> Documentation + structure only. This file does **not** turn on live comment posting.
> The repo can already publish posts (`ig.js`, `credentials.env` → `ACCESS_TOKEN` /
> `IG_USER_ID`), but reading and replying to comments is a **separate permission and
> endpoint** and is intentionally left disconnected until Tanya approves wiring it up. See
> [Not wired up yet](#not-wired-up-yet).

See also: [`CONTENT_RULES.md`](CONTENT_RULES.md) ·
[`setup-table.sql`](setup-table.sql) ·
[`supabase/migrations/20260630140000_ig_comment_replies.sql`](supabase/migrations/20260630140000_ig_comment_replies.sql) ·
[`skills/the-hard-win/INSTAGRAM_PLAYBOOK.md`](skills/the-hard-win/INSTAGRAM_PLAYBOOK.md).

---

## 1. The intake flow (start to finish)

Every comment travels the same path. It can stop at any step; it only reaches the public
if it passes the approval gate.

```
1. Capture comment      → save it as a new row in ig_comment_replies (status=needs_review)
2. Classify comment     → set comment_type (praise_support, question, hostile_trolling, ...)
3. Assign risk level    → risk_level = low / medium / high
4. Draft reply          → AI writes ai_reply_draft (or marks do_not_engage, drafts nothing)
5. Wait for approval     → row sits at needs_review; Tanya reads it
        ┌─────────────────────────────┴─────────────────────────────┐
   approved / edited                                          rejected / do_not_engage
   (approved_reply set)                                       (never published)
        │
6. Posting worker        → status=posting → publish → status=posted (or failed + error_note)
```

Plain-language version:

1. **Capture the comment.** When someone comments, save a row — who said it, on which post,
   the exact text, the permalink, and when. It starts at `needs_review`. Nothing else
   happens automatically.
2. **Classify the comment type.** Set `comment_type` to one of the categories in §2 so we
   know how to treat it.
3. **Assign a risk level.** Set `risk_level` — `low`, `medium`, or `high` — per the rules in
   §3.
4. **Draft a reply.** The AI writes a short, grounded `ai_reply_draft` in The Hard Win voice
   — *or* marks it `do_not_engage` (spam, trolling) and drafts nothing.
5. **Wait for approval.** The draft sits at `needs_review`. Tanya reads it and either
   approves as-is (`approved`), edits it (`edited`), rejects it (`rejected`), or leaves it
   alone (`do_not_engage` / `needs_research`). Her approval copies the exact text she signs
   off on into `approved_reply`.
6. **Publish only after approval.** The posting worker picks up **only** `approved` rows,
   flips them to `posting`, posts, then sets `posted` — or `failed` with an `error_note`.

---

## 2. Comment categories (`comment_type`)

Every captured comment gets exactly one `comment_type`. The category sets the default
handling and the starting risk level.

| `comment_type` | What it is | Default handling |
|---|---|---|
| `praise_support` | Kind, encouraging, "love this" | Warm, brief thank-you. Low risk. |
| `question` | A genuine question about the person, fact, or idea | Answer only if we're sure; otherwise `needs_research`. |
| `source_request` | "Where's this from?" / "Source?" | Point to the receipt we already verified; `needs_research` if unclear. |
| `correction_challenge` | Claims we got a fact wrong | **Never** reply until sources are re-checked. `needs_research`, then Tanya. |
| `sensitive_historical_dispute` | Contested history, politics, identity, or legacy disputes | **High risk.** Escalate to Tanya. AI does not draft a public reply alone. |
| `hostile_trolling` | Insults, bait, bad-faith provocation | Do not argue. Default `do_not_engage`. |
| `spam_promo` | Bots, "check my page," links, giveaways | `do_not_engage`. Never reply. |
| `personal_story` | Someone shares their own struggle/win | Warm, human acknowledgment. Never advice-dump. Medium risk. |

---

## 3. Risk levels (`risk_level`)

Risk decides how much human care a comment needs before anything is said back.

- **low** — `praise_support` and simple acknowledgments. Safe to reply warmly; still needs
  approval, but it's a quick yes/no for Tanya.
- **medium** — `question`, `source_request`, and `personal_story`. Fine to reply, but the
  content must be accurate (questions/sources may route to `needs_research` first).
- **high** — `correction_challenge`, disputes, identity/political conflict, accusations, and
  hostile comments (`sensitive_historical_dispute`, `hostile_trolling`). The AI does **not**
  draft a public reply on its own; these are escalated to Tanya, who decides whether we
  respond at all.

`source_check_required` is set to `true` whenever a reply would state or defend a fact —
always for `correction_challenge`, and for any `question`/`source_request` we can't answer
straight from an already-verified receipt.

---

## 4. Status values (`status`)

The `status` field is the single source of truth for where a comment is in the flow.

| Status | Meaning |
|---|---|
| `needs_review` | AI has drafted a reply (or a recommendation); waiting for Tanya. |
| `needs_research` | We can't reply responsibly until a fact/source is checked. |
| `approved` | Tanya approved the draft **as written**. `approved_reply` is set. Cleared to post. |
| `edited` | Tanya rewrote the draft; her version is what will post. |
| `rejected` | Tanya declined this reply. Nothing gets posted. |
| `do_not_engage` | We will not reply at all (spam, trolling, bait). |
| `posting` | The worker has picked the row up and is publishing it. |
| `posted` | The reply is live on Instagram (`posted_at` set, `ig_comment_id` of our reply recorded). |
| `failed` | A post attempt failed; see `error_note`. Safe to retry after a look. |

Only `approved` (and Tanya's `edited` rows, once moved to `approved`) may reach `posting`.
Everything else is a dead end by design. This is enforced in the database: a row **cannot**
be saved as `approved` unless `approved_reply` actually contains text.

---

## 5. Approval rule (the gate)

> **AI may draft replies, but no reply may post unless `status = 'approved'` and
> `approved_reply` is present.**

This is not just a convention — it's a database check constraint
(`ig_comment_replies_approval_chk`) on the live table, so an approved-but-empty row is
rejected by Postgres itself.

---

## 6. Posting-worker rule

The reply worker (when it is eventually wired up — see §10) follows one narrow contract:

- It may **only** process rows where `status = 'approved'`.
- It ignores every other status. `needs_review`, `edited` (until moved to `approved`),
  `rejected`, `do_not_engage`, `needs_research`, `posting`, `posted`, `failed` are all
  hands-off.
- It posts the text in `approved_reply` — never `ai_reply_draft`, never anything it composes
  itself.
- On success: set `status = 'posted'`, stamp `posted_at`.
- On failure: set `status = 'failed'` and write the reason into `error_note` (never fail
  silently — this mirrors the token-refresh log pattern already in the repo).

---

## 7. AI reply + safety rules

Hard rules. The AI follows all of them, every time.

- **Never invent historical facts.** If we don't already have it verified (two independent,
  reputable sources — see `CONTENT_RULES.md`), we don't say it.
- **Never argue with commenters.** No debating, no defending, no last word.
- **Never publish corrections without source review.** A "you're wrong" comment goes to
  `needs_research` first — we re-check our two sources before anyone replies.
- **Never respond to spam.** `spam_promo` gets `do_not_engage`, full stop.
- **Escalate sensitive comments to Tanya.** Anything contested, historical, political,
  identity-related, an accusation, or hostile is hers to decide. The AI does not draft a
  public reply to these on its own.
- **Keep replies warm, brief, grounded, and in The Hard Win voice** — calm, plain,
  respectful, quietly powerful. No hype, no arguing, no emoji pile-ups.

And above all — the AI **drafts**, Tanya **approves**. No reply reaches the public without
her sign-off.

---

## 8. The Supabase table (`ig_comment_replies`)

**Status: created and live** in project `tpirzpvvhhgpnwsrbbnh` (The Hard Win). The migration
is checked in at
[`supabase/migrations/20260630140000_ig_comment_replies.sql`](supabase/migrations/20260630140000_ig_comment_replies.sql).
RLS is enabled, so only the secret server key can read or write it.

| Field | Type | Purpose |
|---|---|---|
| `id` | bigint (identity) | Primary key. |
| `created_at` | timestamptz | When we captured the comment. |
| `updated_at` | timestamptz | Auto-touched on every update (trigger). |
| `ig_post_id` | text | Our post the comment is on (→ `posts.ig_post_id`). |
| `ig_comment_id` | text (unique) | The comment's own id — we dedupe on this. |
| `parent_media_id` | text | The media the comment belongs to (Graph parent). |
| `commenter_username` | text | Who commented. |
| `comment_text` | text | Exactly what they said. |
| `comment_permalink` | text | Link back to the comment. |
| `comment_type` | text | One of the §2 categories. |
| `risk_level` | text | `low` / `medium` / `high` (§3). |
| `ai_reply_draft` | text | The AI's suggestion (may be null / do_not_engage). |
| `approved_reply` | text | The exact text cleared to post (Tanya's). |
| `status` | text | One of the §4 statuses. |
| `approved_by` | text | `Tanya`, once she signs off. |
| `approved_at` | timestamptz | When she approved. |
| `posted_at` | timestamptz | When the reply actually posted. |
| `error_note` | text | Failure detail if a post attempt fails. |
| `source_check_required` | boolean | True when the reply states/defends a fact (§3). |
| `notes` | text | Research notes, why rejected, context. |

Guardrails baked into the table:

- `status` is checked against the exact §4 list; `comment_type` against the §2 list;
  `risk_level` against `low/medium/high`.
- `ig_comment_replies_approval_chk`: you cannot save a row as `approved` unless
  `approved_reply` has real text — the approval gate, enforced by the database.
- `updated_at` is kept honest by a trigger.
- Row-level security is on.

---

## 9. Example comments with safe AI drafts

These show the *tone and safety bar*. Each row still starts at `needs_review`.

### Example 1 — praise_support (low risk)

> **Comment:** "This one hit me today. Needed it. 🙏"
>
> `comment_type` = `praise_support` · `risk_level` = `low` · `status` = `needs_review` ·
> `source_check_required` = `false`
>
> **`ai_reply_draft`:** "Really glad it landed today. Keep showing up — that's the whole
> thing."

### Example 2 — source_request (medium risk, verify before sending)

> **Comment:** "Is the part about her childhood illness actually true? Source?"
>
> `comment_type` = `source_request` · `risk_level` = `medium` · `status` = `needs_review` ·
> `source_check_required` = `true`
>
> **`ai_reply_draft`:** "Good question — it's on the card's receipt line. We only ship a
> detail when two independent, reputable sources agree, and this one cleared that bar. Happy
> to point you to them."
>
> *(If we can't immediately confirm which two sources → set `status = needs_research`, don't
> send.)*

### Example 3 — correction_challenge (high risk, route to research, do not argue)

> **Comment:** "This date is wrong, you clearly didn't fact-check."
>
> `comment_type` = `correction_challenge` · `risk_level` = `high` · `status` =
> `needs_research` · `source_check_required` = `true`
>
> **`ai_reply_draft` (held, not sent):** "Thanks for flagging it — we're double-checking the
> sources now and will correct it if it's off. We'd rather be right than fast."
>
> *(No reply posts until we re-check our two sources. If the commenter is right, we fix the
> post and thank them. Anything disputed → escalate to Tanya.)*

---

## 10. The scripts (draft-only)

Two Node scripts implement the flow. **Both refuse to touch live Instagram by default.**

### `comment-intake.js` — capture + classify + draft (never posts)

Reads comments, classifies each (`lib-comment-classify.js`), assigns risk, drafts a safe
reply, and stages a row in `ig_comment_replies` as `needs_review`. It **only ever writes
drafts** — it cannot post.

```bash
node comment-intake.js                # read sample-comments.json (offline, safe default)
node comment-intake.js --file x.json  # read a specific fixture
COMMENTS_LIVE=1 node comment-intake.js  # read LIVE IG comments (needs approved scope)
```

- Live reading is **off** unless `COMMENTS_LIVE=1`. By default it runs against
  `sample-comments.json` so it's testable without hitting Instagram.
- With `COMMENTS_LIVE=1` it scans **all recent posts on the account** (the account's own
  media list from Instagram), not just the cards this system tracked — bounded by
  `MEDIA_SCAN_LIMIT` (default 50).
- Re-running is safe: rows dedupe on `ig_comment_id`, so anything Tanya has already
  reviewed/approved is left untouched.
- The classifier is a plain, deterministic ruleset (no live LLM), so it never invents facts.
  High-risk categories (`correction_challenge`, `sensitive_historical_dispute`,
  `hostile_trolling`) get **no** auto-draft and are flagged for Tanya. Swapping in a real
  LLM later is fine **as long as those same guardrails stay**.

**Runs on a schedule.** A Windows scheduled task, *"The Hard Win - Daily Comment Intake"*,
runs `run-intake.bat` daily at 9:30 AM ET — i.e. `COMMENTS_LIVE=1 node comment-intake.js`,
logged to `comment-intake-log.txt`. This is draft-only automation: it stages `needs_review`
rows and **never posts**. The boundary is unchanged — public replying is still a manual,
two-switch step (see below).

> Comment intake scans the most recent Instagram media directly from @thehardwin, not only
> posts stored in Supabase. The default scan limit is **50** recent posts. Increase with
> `MEDIA_SCAN_LIMIT=100` only when checking older posts or troubleshooting missed comments.

> **Gotcha — the account's own comments aren't returned by the API.** Instagram's comments
> endpoint only returns comments left by **other accounts**, never comments authored by the
> account owner (@thehardwin) on its own posts. So the post's `comments_count` will include
> our own "first comment" CTA lines and any comment you leave while logged in as the brand —
> but intake will (correctly) not see them, and `comments_count` can be higher than the
> number of rows staged. **To test the live path, comment from a different Instagram
> account** (a second personal account or a friend), then run
> `COMMENTS_LIVE=1 node comment-intake.js` → `npm run replies:review`. The comment will land
> as `needs_review` with a low-risk draft. This is a platform rule, not a bug in intake.

### `reply-worker.js` — post approved replies (dry run by default)

Finds `status = 'approved'` rows and, **only when explicitly switched live**, posts
`approved_reply` to Instagram. By default it's a **dry run**: it prints what it *would* post
and changes nothing.

```bash
node reply-worker.js                          # DRY RUN — lists approved replies, posts nothing
node reply-worker.js --id 5                   # DRY RUN for one row
REPLIES_LIVE=1 node reply-worker.js --confirm  # ACTUALLY post (both flag AND --confirm required)
```

- Going live needs **both** `REPLIES_LIVE=1` **and** `--confirm` — no accidental posting.
- Contract: only `approved` rows; posts `approved_reply` (never the raw draft); on success
  `status → posted` + `posted_at`; on failure `status → failed` + `error_note`.

npm shortcuts: `npm run intake`, `npm run reply-worker`.

---

## 11. Live status (updated 2026-07-01)

Tanya has approved (a) turning comment intake/replies on and (b) running the reply worker
live. The code and automation are done, **and the token permission is now in place.**

- **Comment reading — WORKING (scope granted).** The account is type `MEDIA_CREATOR` on the
  *Instagram API with Instagram Login*. On 2026-07-01 the token was re-authorized and
  `node ig.js exchange` confirmed the granted permissions include
  `instagram_business_manage_comments` (alongside `instagram_business_basic`,
  `instagram_business_content_publish`, `instagram_business_manage_insights`, and
  `instagram_business_manage_messages`). `node ig.js whoami` confirms **thehardwin /
  MEDIA_CREATOR**, and `COMMENTS_LIVE=1 node comment-intake.js` scans cleanly.
  *(Earlier a missing scope made the comments endpoint return an empty list with no error —
  now resolved. A scan that finds 0 comments is still a valid scan; it just means no outside
  comments yet.)*
- **Reply posting — ready, still manual.** Posting a reply uses the same
  `instagram_business_manage_comments` permission, which the token now has. It stays behind
  the two switches on purpose: `REPLIES_LIVE=1 node reply-worker.js --confirm`.

**Still to verify (needs a comment from a different account):** the account's own comments are
not returned by the API, so the end-to-end test — an outside-account comment landing as
`needs_review`, then an approved reply posting — is pending a friend/second account leaving a
comment. Then: `COMMENTS_LIVE=1 node comment-intake.js` → `npm run replies:review`.

What did **not** change: the human gate. Nothing reaches the public automatically. The AI
only ever drafts; the worker only posts rows Tanya has personally moved to `approved`, and
only when she runs it with both live switches. There is no always-on auto-reply.

> Automate the labor, never the judgment. **Every public reply is Tanya's call.**
