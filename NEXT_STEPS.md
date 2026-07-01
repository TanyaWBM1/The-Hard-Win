# Next Steps — pick up here tomorrow

A quick, plain-language restart guide for The Hard Win. (Snapshot: 2026-06-30.)

> **Building a new system from scratch (or repeating this one)?** See
> [`SOP_BUILD_INSTAGRAM_AUTOMATION_SYSTEM.md`](SOP_BUILD_INSTAGRAM_AUTOMATION_SYSTEM.md) — the
> master, success-built setup guide (account → rules → repo → Supabase → approval gates →
> then automation). This NEXT_STEPS file is for running the *existing* Hard Win day to day.

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

**Status (2026-07-01):** ✅ **token is authorized for comments.** Re-authorized with the
`instagram_business_manage_comments` scope; `node ig.js whoami` confirms **thehardwin /
MEDIA_CREATOR**, and `COMMENTS_LIVE=1 node comment-intake.js` scans cleanly (found 0 comments
so far — a valid, empty scan). **The next real test is a comment from a *different* Instagram
account** (yours-as-brand comments don't get staged — see `COMMENT_REPLY_WORKFLOW.md`). Once a
friend/second account comments, run `COMMENTS_LIVE=1 node comment-intake.js` → `npm run
replies:review` and it should appear as `needs_review`.

**Permissions:** the app intentionally keeps all **5** Instagram Business permissions (basic,
content_publish, manage_comments, manage_insights, manage_messages). Meta's app-review bundle
also shows **Human Agent** (because messaging is in the set). Only *comments* are used today;
*insights*, *messages*, and *Human Agent* are reserved for future approved workflows. The
comment system is public-comment only and **never sends DMs or Human Agent messages**. Details:
`COMMENT_REPLY_WORKFLOW.md` §12 and `SOP_BUILD_INSTAGRAM_AUTOMATION_SYSTEM.md` §8b–§8c.

**Runs automatically:** a Windows scheduled task — **"The Hard Win - Daily Comment Intake"** —
runs `run-intake.bat` **every day at 9:30 AM ET** (just after the poster). It runs **whether
you're logged in or not** (logon type S4U — no password stored), as long as the PC is on; if
it's off at 9:30, it runs the next time the machine is available. It pulls new comments and
stages drafts as `needs_review` — it **never posts**. Output is appended to
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

## 6. Compliance pages on the web (GitHub Pages)
The Privacy Policy, Terms, and Data Deletion pages are served publicly via **GitHub Pages** so
you can paste real URLs into the Meta app settings. Expected public URLs:

- `https://tanyawbm1.github.io/The-Hard-Win/PRIVACY_POLICY`
- `https://tanyawbm1.github.io/The-Hard-Win/TERMS_OF_SERVICE`
- `https://tanyawbm1.github.io/The-Hard-Win/DATA_DELETION`

**If the pages don't load, enable Pages manually (one time):**
1. Go to **https://github.com/TanyaWBM1/The-Hard-Win/settings/pages**
2. Under **Build and deployment → Source**, pick **Deploy from a branch**.
3. Set **Branch** = `main`, **Folder** = `/ (root)`, click **Save**.
4. Wait 1–2 minutes, then refresh. The three URLs above should load.
5. Still 404? Check **Actions** tab for a "pages build and deployment" run, and make sure the
   `index.md` / `_config.yml` are on `main`.

**Before submitting to Meta:** fill the real public brand email into the contact line of all
three pages (they currently show a placeholder). Tell Claude Code the address and it'll add it.

## 7. One loose end (optional)
- **`gh` CLI** is now **logged in** as `TanyaWBM1` (verified). Nothing to do here — future
  GitHub steps (like enabling Pages) can be done from the command line.

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
