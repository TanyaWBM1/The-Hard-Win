# Next Steps — pick up here tomorrow

A quick, plain-language restart guide for The Hard Win. (Snapshot: 2026-06-30.)

---

## 1. First thing tomorrow — check the morning post
After **9:15 AM ET** (the poster runs every other day):

1. Open Instagram **@thehardwin**. Did the new card post? Today's is **Wilma Rudolph**.
2. Look for the **first comment** under it (the motivational line + follow CTA).
3. If something looks wrong: open **Supabase → `posts` table** and check that row's `status`
   and `error_note`. Or just open **Claude Code** and say *"diagnose why today's post didn't go out."*

## 2. Check the quarterly review (runs first time 7/1)
- A **pull request** should appear at https://github.com/TanyaWBM1/The-Hard-Win/pulls
  ("Quarterly IG platform review — 2026-07 — <outcome>"). Skim it, and **merge if it looks right**.
- It only updates `skills/the-hard-win/INSTAGRAM_PLAYBOOK.md` — never your posts.

## 3. To add more cards (the normal loop)
1. *(Optional)* In **standard Claude chat**, use **NexLev** to find new people/angles
   (check 6+ uploads, don't trust one outlier score).
2. In **Claude Code**, say: *"Run the the-hard-win skill. New batch: [names or a theme]."*
   Same rules — two sources per person, stage as `pending`, stop with a report.
3. **Review** the batch report **and** the rendered cards (facts true? layout clean?).
4. **Approve** the ones you want (flip `status` → `approved` in Supabase, or tell Claude Code
   "approve all except X"). Approved cards post automatically, every other day.

## 4. Current state (so you remember)
- **Queue:** ~35 approved, 1 pending (Marcus Garvey #30). Runway ~2+ months at every-other-day.
- **Hashtags:** max **5**, and they live **in the caption** now. First comment = opener + CTA only.
- **Originality:** public-domain images are *raw material* only — every post needs ≥3 original
  layers (see `CONTENT_RULES.md`). Our cards are original renders, so we're safe.

## 5. Comment replies — the daily loop (draft-only, you approve every one)
The system can now draft replies to comments on your posts, but **nothing posts until you
approve it** — same rule as the cards. Full details in `COMMENT_REPLY_WORKFLOW.md`.

**Status:** live comment *reading* is confirmed working on your IG token. Reply *posting* is
armed but stays off until you run the worker with the two live switches (below).

**Runs automatically:** a Windows scheduled task — **"The Hard Win - Daily Comment Intake"** —
runs `run-intake.bat` **every day at 9:30 AM ET** (just after the poster). It pulls new
comments and stages drafts as `needs_review` — it **never posts**. Output is appended to
`comment-intake-log.txt`. So each morning you can just run `npm run replies:review` to see
what's waiting; steps 1–2 below happen on their own. (To pause it:
`Disable-ScheduledTask -TaskName "The Hard Win - Daily Comment Intake"`.)

> **Note on the scan:** comment intake scans the most recent Instagram media directly from
> @thehardwin, not only posts stored in Supabase. The default scan limit is **50** recent
> posts. Increase with `MEDIA_SCAN_LIMIT=100` only when checking older posts or
> troubleshooting missed comments.

The loop, whenever you want to check comments:

1. **Pull + draft.** In this folder run: `npm run intake`
   *(That reads the sample file. To pull your **real** comments instead:*
   `COMMENTS_LIVE=1 node comment-intake.js`*.)* It saves each comment to Supabase with a
   suggested reply and a status — it **never posts**.
2. **Read the drafts (read-only).** Run: `npm run replies:review`
   It prints every reply waiting on you (`needs_review`, `needs_research`, `failed`) right in
   the terminal — commenter, comment, AI draft, risk, status, and any error. It **only
   reads**: it never posts and never changes the database. *(You can still review in
   **Supabase → Table Editor → `ig_comment_replies`** if you prefer.)*
3. **Approve the ones you want.** In **Supabase → Table Editor → `ig_comment_replies`**, for
   each row you want to reply to:
   - Happy with the draft? Copy it into `approved_reply`, set `status = approved`, put your
     name in `approved_by`.
   - Want to change it? Put your wording in `approved_reply` and set `status = approved`
     (or `edited`).
   - Don't reply? Leave it, or set `rejected` / `do_not_engage`.
   *(Spam, trolls, and disputed/history fights are auto-flagged and get **no** draft — leave
   those alone or mark `do_not_engage`.)*
4. **See what would post (safe).** Run: `npm run reply-worker` — this is a **dry run**. It
   lists your approved replies and posts nothing.
5. **Actually post (when you're ready).** Run:
   `REPLIES_LIVE=1 node reply-worker.js --confirm`
   It posts **only** the `approved` rows, then marks them `posted`. If one fails it marks it
   `failed` and writes the reason in `error_note`.

**The whole loop, at a glance:**
```bash
npm run intake                              # 1. draft replies (never posts)
npm run replies:review                      # 2. read what's waiting (read-only)
                                            # 3. approve rows in Supabase
npm run reply-worker                        # 4. dry run — see what would post
REPLIES_LIVE=1 node reply-worker.js --confirm   # 5. actually post approved replies
```

> You approved turning this on. It's still built so **you** click go — the AI only ever
> drafts; it never replies to the public on its own.

## 6. One loose end (optional)
- **`gh` CLI** is installed but **not logged in**. To finish: open a **new PowerShell window** →
  `gh auth login` → GitHub.com → HTTPS → web browser → authorize. Check with `gh auth status`.
  *(Everything works without this; it just makes future GitHub steps smoother.)*

## Key references
| What | Where |
|---|---|
| How to add cards (full manual) | `skills/the-hard-win/HOW_TO_RUN.md` |
| The rules / skill | `skills/the-hard-win/SKILL.md` |
| Instagram platform rules (living) | `skills/the-hard-win/INSTAGRAM_PLAYBOOK.md` |
| Content + hashtag standards | `CONTENT_RULES.md` · `HASHTAG_RULES.md` |
| Comment reply workflow + scripts | `COMMENT_REPLY_WORKFLOW.md` |
| Supabase project (The Hard Win) | `tpirzpvvhhgpnwsrbbnh` |
| GitHub repo | https://github.com/TanyaWBM1/The-Hard-Win |

> Automate the labor, never the judgment. Nothing posts until you approve it.
