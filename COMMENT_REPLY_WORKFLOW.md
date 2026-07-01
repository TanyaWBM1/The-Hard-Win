# Comment Reply Workflow — The Hard Win

How we handle comments on Hard Win Instagram posts. The AI may **draft** a suggested
reply, but **nothing is published until Tanya approves it**. This is the same rule that
governs the posts themselves: automate the labor, never the judgment.

> **The one rule that outranks everything here:**
> **AI may draft public replies, but Tanya must approve every reply before posting.**

> Documentation + structure only. This file does **not** turn on live comment posting.
> The repo can already publish posts (`ig.js`, `credentials.env` → `ACCESS_TOKEN` /
> `IG_USER_ID`), but replying to comments is a **separate permission and endpoint** and is
> intentionally left disconnected until Tanya approves wiring it up. See
> [Not wired up yet](#not-wired-up-yet).

See also: [`CONTENT_RULES.md`](CONTENT_RULES.md) ·
[`skills/the-hard-win/INSTAGRAM_PLAYBOOK.md`](skills/the-hard-win/INSTAGRAM_PLAYBOOK.md).

---

## 1. The intake flow (start to finish)

Every comment travels the same path. It can stop at any step; it only reaches the public
if it passes the approval gate.

```
1. Capture comment      → save it (text, author, post, timestamp) as a new row
2. Classify comment     → assign a category (praise, question, hostile, etc.)
3. Assign risk level    → low / medium / high
4. Draft reply          → AI writes a suggested reply (or marks do_not_engage)
5. Wait for approval    → status sits at needs_review; Tanya reads it
        ┌─────────────────────────────┴─────────────────────────────┐
     approved / edited                                        rejected / do_not_engage
        │                                                            │
6. Publish (only now)   → post the reply, record it, set status=posted    (never published)
```

Plain-language version:

1. **Capture the comment.** When someone comments, log it — who said it, on which post,
   what they said, and when. Nothing else happens automatically.
2. **Classify the comment type.** Sort it into one of the categories in §2 so we know how
   to treat it.
3. **Assign a risk level.** `low` (safe to reply warmly), `medium` (needs care or a fact
   check), `high` (sensitive, disputed, or hostile — Tanya decides, AI does not draft a
   public reply without her).
4. **Draft a reply.** The AI writes a short, grounded suggestion in The Hard Win voice —
   *or* marks it `do_not_engage` (spam, trolling) and drafts nothing.
5. **Wait for approval.** The draft sits at `needs_review`. Tanya reads it and chooses:
   approve as-is, edit it, reject it, or leave it alone.
6. **Publish only after approval.** A reply is posted **only** once Tanya has set it to
   `approved` or `edited`. Then it's posted and marked `posted`.

---

## 2. Comment categories

Every captured comment gets exactly one category. The category sets the default handling.

| Category | What it is | Default handling |
|---|---|---|
| **praise/support** | Kind, encouraging, "love this" | Warm, brief thank-you. Low risk. |
| **question** | A genuine question about the person, fact, or idea | Answer only if we're sure; otherwise `needs_research`. |
| **source request** | "Where's this from?" / "Source?" | Point to the receipt/source we already verified. `needs_research` if unclear. |
| **correction/challenge** | Claims we got a fact wrong | **Never** reply until sources are re-checked. Route to `needs_research`, then Tanya. |
| **sensitive historical dispute** | Contested history, politics, identity, or legacy disputes | **High risk.** Escalate to Tanya. AI does not draft a public reply alone. |
| **hostile/trolling** | Insults, bait, bad-faith provocation | Do not argue. Default `do_not_engage`. |
| **spam/promo** | Bots, "check my page," links, giveaways | `do_not_engage`. Never reply. |
| **personal story** | Someone shares their own struggle/win | Warm, human acknowledgment. Never advice-dump. Low/medium risk. |

---

## 3. Status values

The `status` field is the single source of truth for where a comment is in the flow.

| Status | Meaning |
|---|---|
| `needs_review` | AI has drafted a reply (or a recommendation); waiting for Tanya. |
| `needs_research` | We can't reply responsibly until a fact/source is checked. |
| `approved` | Tanya approved the AI draft **as written**. Cleared to post. |
| `edited` | Tanya changed the draft and approved her version. Cleared to post. |
| `rejected` | Tanya declined this reply. Nothing gets posted. |
| `do_not_engage` | We will not reply at all (spam, trolling, bait). |
| `posted` | The reply has been published to Instagram. |

Only `approved` and `edited` are allowed to move to `posted`. Everything else is a dead end
by design.

---

## 4. AI reply rules

These are hard rules. The AI follows all of them, every time.

- **Never invent facts.** If we don't already have it verified, we don't say it.
- **Never argue with commenters.** No debating, no defending, no last word.
- **Never publish corrections without source review.** A "you're wrong" comment goes to
  `needs_research` first — we re-check our two sources before anyone replies.
- **Never respond to spam.** Spam and promo get `do_not_engage`, full stop.
- **Keep replies warm, brief, grounded, and in The Hard Win voice** — calm, plain,
  respectful, quietly powerful. No hype, no arguing, no emoji pile-ups.
- **Escalate sensitive or disputed comments to Tanya.** Anything contested, historical,
  political, or identity-related is hers to decide. The AI does not draft a public reply to
  these on its own.

And above all — the AI **drafts**, Tanya **approves**. No reply reaches the public without
her sign-off.

---

## 5. Suggested table schema

Store comments wherever the rest of the system already lives. Two options — pick one.

### Option A — Supabase (matches the existing `posts` table)

```sql
-- The Hard Win — incoming comments + AI reply drafts.
-- Paste into Supabase: SQL Editor -> New query -> Run.

create table if not exists comments (
  id              bigint generated always as identity primary key,
  ig_comment_id   text unique,          -- Instagram's comment id (dedupe on this)
  ig_post_id      text,                 -- which post it's on (-> posts.ig_post_id)
  author_username text,                 -- who commented
  comment_text    text not null,        -- what they said
  category        text,                 -- praise/support | question | source request |
                                        -- correction/challenge | sensitive historical dispute |
                                        -- hostile/trolling | spam/promo | personal story
  risk_level      text default 'low',   -- low | medium | high
  ai_draft_reply  text,                 -- the AI's suggested reply (may be null)
  final_reply     text,                 -- what actually gets posted (Tanya's version)
  status          text not null default 'needs_review',
                                        -- needs_review | needs_research | approved |
                                        -- edited | rejected | do_not_engage | posted
  approved_by     text,                 -- 'Tanya' once she signs off
  received_at     timestamptz not null default now(),
  posted_at       timestamptz,          -- set only when it actually posts
  notes           text                  -- research notes, why rejected, etc.
);

-- Lock it down: only the secret server key can touch it.
alter table comments enable row level security;
```

### Option B — Google Sheet (one row per comment)

| Column | Example |
|---|---|
| `ig_comment_id` | `17985...` |
| `ig_post_id` | `18004...` (Wilma Rudolph card) |
| `author_username` | `@runner_maya` |
| `comment_text` | "Where did you find this about her braces?" |
| `category` | source request |
| `risk_level` | low |
| `ai_draft_reply` | (AI suggestion) |
| `final_reply` | (Tanya's approved version) |
| `status` | needs_review |
| `approved_by` | (blank until Tanya signs off) |
| `received_at` | 2026-06-30 09:40 |
| `posted_at` | (blank until posted) |
| `notes` | |

---

## 6. Example comments with safe AI drafts

These show the *tone and safety bar*. Each draft still goes to `needs_review` first.

### Example 1 — praise/support (low risk)

> **Comment:** "This one hit me today. Needed it. 🙏"
>
> **Category:** praise/support **· Risk:** low **· Status:** `needs_review`
>
> **AI draft reply:** "Really glad it landed today. Keep showing up — that's the whole
> thing."

### Example 2 — source request (low risk, but verify before sending)

> **Comment:** "Is the part about her childhood illness actually true? Source?"
>
> **Category:** source request **· Risk:** low **· Status:** `needs_review`
>
> **AI draft reply:** "Good question — it's on the card's receipt line. We only ship a
> detail when two independent, reputable sources agree, and this one cleared that bar.
> Happy to point you to them."
>
> *(If we can't immediately confirm which two sources → set `needs_research`, don't send.)*

### Example 3 — correction/challenge (route to research, do not argue)

> **Comment:** "This date is wrong, you clearly didn't fact-check."
>
> **Category:** correction/challenge **· Risk:** medium **· Status:** `needs_research`
>
> **AI draft reply (held, not sent):** "Thanks for flagging it — we're double-checking the
> sources now and will correct it if it's off. We'd rather be right than fast."
>
> *(No reply posts until we re-check our two sources. If the commenter is right, we fix the
> post and thank them. If sensitive/disputed → escalate to Tanya.)*

---

## 7. Not wired up yet

This is deliberate. As of now the system **captures, classifies, drafts, and stages** — it
does **not** publish replies to Instagram.

- The repo can publish *posts* today (`ig.js` uses `credentials.env` → `ACCESS_TOKEN` and
  `IG_USER_ID`). Replying to *comments* is a **different Instagram permission and endpoint**
  and is intentionally left off.
- Before any live reply posting is turned on, Tanya approves: (a) the added Instagram
  permission scope, and (b) the posting step itself.
- Until then, the approval gate is manual and that is correct — the AI's job ends at
  `needs_review`.

> Automate the labor, never the judgment. **Every public reply is Tanya's call.**
