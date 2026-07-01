# SOP — Build an Instagram Automation Content System

> **This SOP is not a theory document. It records only the steps that worked, the mistakes
> that were corrected, and the checks needed to repeat the system safely.**

A repeatable, plain-language guide for standing up a new Instagram automation content system
like **The Hard Win** — from idea to working automation. Written so future Tanya can repeat
the whole setup six months from now without guessing.

---

## The governing rule of order

> **Do not start with automation.** Start with the account, the niche promise, the content
> rules, the repo, the database, and the approval gates. **Automation comes after the manual
> process is clear.**

That is the lesson from The Hard Win. The automation worked *because* the rulebook, the
Supabase statuses, the GitHub docs, and the manual approval gates existed **first**. Build in
that order and each layer rests on a solid one below it. Skip ahead and you automate confusion.

---

## 1. SOP purpose

This is a **success-built SOP**. Every step here earned its place by working in real life.

- Add or upgrade a step **only after it has actually worked or been verified** — not because
  it "should" work.
- If a step failed and you fixed it, record the fix (see §13 Troubleshooting).
- If a step is still unproven, leave it in the checklist **unchecked** and honest.
- When you complete a new verified step, capture it with the template in §15 and log it in the
  changelog (§14).

The result is a document you can trust: it describes the path that actually got a system live.

---

## 2. Project foundation (do this before anything technical)

- [ ] **Choose the channel / content concept.** One clear idea. *(The Hard Win: real people
      who did the hard version of something, paired with a checkable source.)*
- [ ] **Choose the audience.** Who is this for, in one sentence.
- [ ] **Choose the promise / angle.** What the follower reliably gets each time.
- [ ] **Choose the Instagram handle and brand name.** Check the handle is free on Instagram.
- [ ] **Create a basic content rulebook** (a `CONTENT_RULES.md`): voice, truth standard,
      what a "good post" looks like.
- [ ] **Define what the account will and will not post.** Write the "never" list too (no
      hype, no fabricated quotes, no unverified claims, etc.).

Output: a short written concept + a rulebook. No code yet.

---

## 3. Instagram account setup

- [ ] **Create the Instagram account** with your chosen handle.
- [ ] **Switch to a professional account** (Settings → Account type and tools).
- [ ] **Choose Business or Creator.** *(The Hard Win runs as a Creator-type account —
      confirmed later as `MEDIA_CREATOR` via the API.)*
- [ ] **Confirm the account is public.** Private accounts can't be automated or read by the API.
- [ ] **Add bio, profile image, and contact basics.**
- [ ] **Confirm the handle and brand name** match your foundation doc.

> A professional (Business/Creator) account is what unlocks the business/creator tools and the
> Instagram API access you'll need later. A personal account cannot do this.

---

## 4. Facebook / Meta connection

- [ ] **Create or choose a Facebook Page** for the brand (if your setup needs one).
- [ ] **Connect the professional Instagram account** to the Facebook Page if required by your
      chosen login path.
- [ ] **Confirm the account appears** in Meta Business Suite / the relevant Meta account tools.
- [ ] **Document ownership and admin access** — which Meta account owns the app and Page, and
      who has admin. Keep this note somewhere safe (not in the repo).

> Note: the *Instagram API with Instagram login* path (used by The Hard Win) does not always
> require a Facebook Page for posting, but you still need a Meta developer account that owns
> the app. Record exactly what you connected so future-you isn't guessing.

---

## 5. GitHub repo setup

Create the repo and the document skeleton **before** writing automation.

- [ ] **Create the repo** (private is fine).
- [ ] **Add `README.md`** — what the system is and how the pieces fit.
- [ ] **Add `NEXT_STEPS.md`** — the plain-language restart guide / daily loop.
- [ ] **Add `INSTAGRAM_PLAYBOOK.md`** — living platform rules (hashtag caps, placement,
      originality penalties) that change often.
- [ ] **Add `COMMENT_REPLY_WORKFLOW.md`** — the comment intake + approval + reply design.
- [ ] **Add `HOW_TO_RUN.md`** — the step-by-step manual for running the system.
- [ ] **Add `.gitignore`** — ignore `credentials.env`, `supabase.env`, `*.env`, `node_modules/`,
      and any log files.
- [ ] **Confirm `credentials.env` and logs are ignored** — run `git status` and make sure they
      do **not** appear as tracked.
- [ ] **Push the initial commit.**

> Verified in this build: env files and logs stayed untracked; only code and docs were pushed.

---

## 6. Content system setup (the manual rules the automation will obey)

- [ ] **Define content categories** — the kinds of posts you'll make.
- [ ] **Define card template rules** — layout, fonts, palette, what fields appear.
- [ ] **Define caption rules** — length, tone, what goes in the caption vs. the card.
- [ ] **Define first-comment rules** — what the auto first comment says (e.g., opener + CTA).
- [ ] **Define hashtag rules** — cap and placement. *(The Hard Win: max 5, in the caption.)*
- [ ] **Define originality rules** — public-domain images are raw material only; require
      several original layers per post.
- [ ] **Define approval status values** — e.g. `pending` → `approved` → `posted` / `error`.
- [ ] **Define the posting schedule** — how often, what time, which timezone.

> The point of this section: by the end, a human could run the whole thing by hand. Only then
> is it safe to automate.

---

## 7. Supabase setup (the database + the approval gates)

- [ ] **Create a Supabase project** for this brand (keep it separate from other projects).
- [ ] **Create the scheduled posts table** (e.g. `posts`) with a `status` column and a
      `scheduled_date`.
- [ ] **Create the comment reply table** (e.g. `ig_comment_replies`) with fields for the
      comment, the AI draft, the approved reply, status, risk, and timestamps.
- [ ] **Enable Row Level Security (RLS)** on both tables so only the secret server key can
      read/write them.
- [ ] **Add check constraints** for allowed `status` values and comment categories, so a bad
      value can't be saved.
- [ ] **Add the approval-gate constraint** — a row can't be `approved` unless the approved
      reply text is actually present.
- [ ] **Test the insert rules** — try inserting a valid row (should succeed).
- [ ] **Verify the approval gate** — try saving an `approved` row with no reply text (should be
      **rejected by the database**), then clean up your test rows.

> Verified in this build: the `approved`-without-text insert was rejected by Postgres, and a
> normal `needs_review` row inserted fine. Test rows were deleted afterward.

---

## 8. Instagram developer app setup

- [ ] **Create or configure a Meta developer app.**
- [ ] **Add the Instagram API product** to the app.
- [ ] **Complete "API setup with Instagram login."**
- [ ] **Add the Business login redirect URI** under
      **Instagram → API setup with Instagram login → Business login settings → Valid OAuth
      Redirect URIs**. Save it, refresh, and confirm it stuck. *(This is the settings area to
      use — not the generic "Facebook Login for Business" section; they look alike.)*
- [ ] **Use the Meta-generated / correctly-built authorization URL** (see §9).
- [ ] **Request the permissions the system needs.** For a full content / comment / engagement
      system like The Hard Win the **intentional set is all five** (see §8b for the reasoning
      and plain-language explanations). Include all five in the authorization URL's `scope`:
      - `instagram_business_basic` — required base
      - `instagram_business_content_publish` — to post
      - `instagram_business_manage_comments` — to read comments **and** post replies
      - `instagram_business_manage_insights` — analytics / performance (reserved for future use)
      - `instagram_business_manage_messages` — controlled messaging (reserved; **not** auto-DM)
- [ ] **Record the exact redirect URI used** (see §13 — it must match everywhere).
- [ ] **Do not store tokens in GitHub.** Tokens live only in local `credentials.env` (ignored).

> Hard-won lesson: reading comment *counts* works with the basic scope, but reading comment
> *text* and posting replies needs `instagram_business_manage_comments`. If that scope is
> missing, the comments endpoint returns an **empty list with no error** — easy to mistake for
> "no comments." Request the scope up front.

### 8a. Public compliance pages (required before publishing / app review)

Meta app publishing and app review require **public URLs** for your policies. Create these
as plain-language pages in the repo (and host them where Meta can reach them, e.g. GitHub
Pages), then paste the URLs into the Meta Developer App settings:

- [ ] **Privacy Policy** (`PRIVACY_POLICY.md`) — what public Instagram data is processed, why,
      how it's protected, "AI drafts, humans approve," no selling data, logs kept private.
- [ ] **Terms of Service** (`TERMS_OF_SERVICE.md`) — what the account is; comments may be
      moderated and used to draft human-reviewed replies; not legal/medical/financial authority.
- [ ] **Data Deletion** (`DATA_DELETION.md`) — what may be stored, how to request deletion, and
      that Instagram-controlled content must be deleted by the user in the Instagram app.

Rules for these pages: **plain language; no secrets** (no tokens, API keys, app secret,
Supabase keys, credentials); **no private street address**; use a **public brand contact
email or a clear placeholder** — never a personal email. This matters because arbitrary public
accounts' comments only come through the API once the app is out of Development mode, and
getting to Live mode goes through app review, which checks these pages.

**Hosting (GitHub Pages).** The pages are served from this repo via GitHub Pages (Jekyll).
Add `_config.yml` + an `index.md`, put `---\nlayout: default\n---` front matter at the top of
each policy page, then enable Pages (Settings → Pages → Source: `main` / root). The public URL
pattern (extensionless — GitHub Pages resolves the `.html`) is:

```
https://<github-user>.github.io/<repo>/PRIVACY_POLICY
https://<github-user>.github.io/<repo>/TERMS_OF_SERVICE
https://<github-user>.github.io/<repo>/DATA_DELETION
```

For The Hard Win specifically:

```
https://tanyawbm1.github.io/The-Hard-Win/PRIVACY_POLICY
https://tanyawbm1.github.io/The-Hard-Win/TERMS_OF_SERVICE
https://tanyawbm1.github.io/The-Hard-Win/DATA_DELETION
```

Paste those into the Meta Developer App settings (Privacy Policy URL, Terms of Service URL,
and Data Deletion URL / instructions). *(For The Hard Win the public contact email on these
pages is `support@tanyamlawson.com`.)*

### 8b. The intentional five-permission set (The Hard Win)

The Hard Win intentionally keeps **all five** Instagram Business permissions configured. It is
not only a posting system — it is becoming a controlled Instagram **content, comment, review,
and engagement** system. Posting and comment management are used **now**; insights and messages
are **reserved** for future approved workflows. **Do not remove any of the five** from the docs
or the OAuth `scope`.

| Permission | Plain-language meaning | Status |
|---|---|---|
| `instagram_business_basic` | Lets the app read the professional Instagram account profile and media. | In use |
| `instagram_business_content_publish` | Lets the app publish original feed/photo/video content on behalf of the account. | In use |
| `instagram_business_manage_comments` | Lets the app read and manage comments on the professional account, supporting the approved comment-reply workflow. | In use |
| `instagram_business_manage_insights` | Reserved for analytics and performance review, including future post/account insights. | Reserved |
| `instagram_business_manage_messages` | Reserved for future controlled messaging workflows. **Not** currently used for automatic DM replies, and must **not** be wired into automation unless Tanya explicitly approves that future feature. | Reserved |

**Boundary note.** Keeping a permission does **not** mean the workflow is allowed to use it
automatically. Every new use of a permission must be **documented, approved, tested in dry-run
mode first, and added to this SOP before live use.**

**Safety rule (messaging).** The current comment-reply system is **public-comment focused**. It
must **not** send Instagram DMs or private replies unless a separate approved DM/private-reply
workflow is designed, documented, tested, and authorized.

**Meta review justification.** If Meta review asks why each permission is needed, the current
justification is:

- **basic** — account/media access
- **content_publish** — scheduled post publishing
- **manage_comments** — public comment intake and human-approved replies
- **manage_insights** — future analytics and performance reporting
- **manage_messages** — reserved for future controlled inbox/message management, **not** active
  auto-DM behavior

### 8c. Current Meta app review permission bundle

When you submit for app review, Meta shows the bundle it will review. For The Hard Win this
currently includes **Human Agent** *plus* the five Instagram Business permissions — because the
messaging permission (`instagram_business_manage_messages`) is part of the requested set, Meta
automatically pulls in **Human Agent**.

| Reviewed item | Plain-language meaning | Status |
|---|---|---|
| **Human Agent** | Allows a real human agent to respond to user messages with the `human_agent` tag within Meta's allowed window (within 7 days of a user's message). **Not** currently used for automatic DM replies. Any future use must be manually approved, documented, and tested. | Reserved (future) |
| `instagram_business_basic` | Lets the app read the professional Instagram account profile and media. | In use |
| `instagram_business_content_publish` | Lets the app publish original feed/photo/video content on behalf of the account. | In use |
| `instagram_business_manage_comments` | Lets the app read and manage comments — public comment intake and human-approved public replies. | In use |
| `instagram_business_manage_insights` | Reserved for analytics and performance review, including future post/account insights. | Reserved |
| `instagram_business_manage_messages` | Reserved for future controlled messaging/inbox workflows. Not currently used for automatic DM replies. | Reserved |

**Hard safety boundary.** The current live system may: publish scheduled posts and first
comments, read public comments, draft suggested public replies, and post approved public
replies **only through the approved reply worker**. It must **not** send DMs, private replies,
or Human Agent–tagged messages unless a separate DM/private-message workflow is designed,
documented, reviewed, dry-run tested, and **explicitly approved by Tanya.**

**Meta review note.** If Meta asks why Human Agent / `manage_messages` is included: it is
**reserved for future human-reviewed inbox support only — not active automated messaging.** If
Meta review becomes harder because of this extra scope, the **fallback plan** is to **remove
Human Agent and `instagram_business_manage_messages`** and proceed with the narrower public
content/comment workflow. The current working product is public posting + public comment
handling, so the narrowest defensible review path is the three/four Instagram permissions
(`instagram_business_basic`, `instagram_business_content_publish`,
`instagram_business_manage_comments`, and optionally `instagram_business_manage_insights`).

---

## 9. Token exchange setup

- [ ] **Open the authorization URL** in a browser.
- [ ] **Approve the permissions.**
- [ ] **Copy the `code`** from the redirect URL's address bar. *(The redirect page may 404 —
      that's fine; you only need the `code`.)*
- [ ] **Run the exchange from the repo folder:** `node ig.js exchange "PASTE_CODE_HERE"`
      (the helper defaults to the recorded redirect URI; it must match the authorize URL).
- [ ] **Confirm the permissions printed** include the scopes you requested (especially
      `instagram_business_manage_comments`).
- [ ] **Run `node ig.js whoami`.**
- [ ] **Confirm the correct username and account type.**

> **Never paste tokens or authorization codes into chat, docs, or the repo.** The exchange
> helper writes the token straight into local `credentials.env`. In this SOP, record only safe
> notes — "exchanged on <date>, scopes confirmed" — never the values themselves.
>
> An authorization code is single-use and expires within minutes. If it leaks or expires, just
> re-run the authorize URL to get a fresh one.

---

## 10. Posting automation setup

Only after §2–§9 are solid.

- [ ] **Local `credentials.env`** holds the token + IG user id (ignored by git).
- [ ] **Post worker** picks the next `approved` row, renders/hosts the image, and publishes.
- [ ] **First-comment worker** posts the opener/CTA as the first comment *after* the post is
      live — a comment failure must never undo a successful post.
- [ ] **Scheduled Windows task** runs the poster on your chosen cadence.
- [ ] **Log files** capture each run (and stay gitignored).
- [ ] **Dry-run before live mode** — prove everything works up to the final publish.
- [ ] **Verify one successful post** end to end.
- [ ] **Verify the first comment** landed.
- [ ] **Document failures and fixes** as you go (§13 + §14).

> Verified in this build: real cards published on schedule, and the first comment posts under
> them. The poster marks rows `posted` and records the Instagram post id.

---

## 11. Comment intake and reply workflow

### 11a. Active workflow right now — manual comment engagement

> **Manual comment engagement is the active workflow while automated replies are paused.**
> Use `npm run posts:summary` to identify posts with comments, then open Instagram and reply
> manually. The summary tool is **read-only**: it does **not** read comment text, does **not**
> post replies, does **not** update Supabase, and does **not** change account data.

The daily loop while paused:

1. Run **`npm run posts:summary`** — a read-only list of recent posts with date, **comments
   count**, **likes count**, permalink, and a caption preview. Posts that have comments are
   flagged with **💬**.
2. **Identify the posts with comments** from that list.
3. **Open Instagram** (app or web), read the comments on those posts, and **reply by hand**.

Why manual: while the Meta app is unpublished / in Development mode, the API returns comment
*counts* but not comment *text* from outside accounts — so a person reading the app is the
reliable path. Visibility is retained (`posts:summary`); only the automated replying is paused.

**Automated visibility check:** `posts:summary` also runs on a schedule — a Windows task,
*"The Hard Win - Weekly Posts Summary"*, runs `run-posts-summary.bat` every **Friday at 9:45 AM
ET** (S4U, runs logged out; "start when available"; logs to `posts-summary-log.txt`). It is a
**read-only** weekly visibility check — no posting, no Supabase writes, no comment-text reading,
no account changes.

### 11b. Automated workflow (built and documented — **PAUSED**, not deleted)

The pieces below are complete and remain in the repo, ready to resume if Tanya restarts it:

- [ ] **`comment-intake.js` reads and drafts only** — it classifies each comment, assigns risk,
      writes an AI draft, and stages a `needs_review` row. It **never posts**.
- [ ] **A daily Windows task runs intake** (draft-only, logged). *(Currently **disabled** while
      paused — re-enable with `Enable-ScheduledTask -TaskName "The Hard Win - Daily Comment Intake"`.)*
- [ ] **Intake scans the account's media directly from Instagram** (the account's own recent
      posts), not just posts tracked in the database — bounded by a scan limit.
- [ ] **Own-account comments may count in Instagram but are not staged** as external comments
      — the API doesn't return the account owner's own comments (see §13).
- [ ] **The `replies:review` command is read-only** — it lists what's waiting and changes
      nothing.
- [ ] **The reply worker dry-run posts nothing** — it only shows what *would* post.
- [ ] **The live reply worker requires BOTH `REPLIES_LIVE=1` and `--confirm`.**
- [ ] **Only `approved` Supabase rows can ever be posted** — enforced by the worker and the
      database approval gate.

> **A scan that finds 0 comments is still a successful scan** — it means the intake ran, read
> the account's posts, and found nothing from outside accounts to stage. An empty result is
> not an error; it just means no outside comments yet. *(Verified 2026-07-01: intake with the
> new scoped token scanned 3 posts, found 0, staged nothing, posted nothing.)*

> The boundary, always: the AI drafts; a human approves; only then can anything post.

---

## 12. Verification checklist

Mark `[x]` **only** after you've seen it work. `[ ]` = not yet verified. *(Status shown is from
The Hard Win build as of 2026-07-01.)*

- [x] Instagram account is professional
- [x] Account is public
- [x] Facebook / Meta connection confirmed
- [x] Repo pushed to GitHub
- [x] Credentials + logs ignored (not tracked)
- [x] Supabase tables live (posts + comment replies)
- [x] Token exchanged successfully (with comment scope) — *verified 2026-07-01*
- [x] `whoami` confirms correct account **on the new scoped token** — *thehardwin / MEDIA_CREATOR*
- [x] Test post published
- [x] First comment published
- [x] Comment intake scans successfully with the new scoped token — *runs clean; 0 comments is still a valid scan*
- [ ] Outside-account test comment staged — *pending a comment from a different account*
- [ ] Approved reply posted only after manual approval — *pending; dry-run verified*

> This mix of `[x]` and `[ ]` is the SOP working as intended: it tells the truth about what is
> proven and what is still open.

---

## 13. Troubleshooting notes (known gotchas from this build)

- **Run commands from the repo folder, not your home folder.** Many "file not found" / "cannot
  read env" errors are just the wrong working directory.
  - Git Bash example: `cd "C:\Users\Billionaire Mind DT\ig-daily-cards"`
- **A 404 after the OAuth redirect can be normal** — if the `code` appears in the address bar,
  the flow worked; grab the code and continue.
- **`redirect_uri` must match exactly** in three places: the authorize URL, the value saved in
  **Instagram → API setup with Instagram login → Business login settings**, and the token
  exchange. One trailing slash off = `Invalid redirect_uri`. Use the *Instagram* Business login
  settings, not the generic Facebook Login section.
- **Exposed authorization codes should not be reused** — they're single-use and short-lived.
  If one leaks, get a fresh one from the authorize URL.
- **The account's own comments (e.g. from @thehardwin) are not staged by intake** — Instagram's
  API only returns comments from *other* accounts. `comments_count` can be higher than the
  number of staged rows because it includes your own first-comment CTAs and any comment you
  leave as the brand. **Test with a second/outside account.**
- **`comments_count` > 0 but the comments endpoint returns an empty array (no error) = Meta App
  Mode is Development/Testing.** In Development mode the API only returns data (including
  comments) from people who have a **role on the app** — admins, developers, and added
  **testers**. Comments from arbitrary public accounts are filtered out of API responses even
  though the UI shows them and `comments_count` includes them. This is *not* a scope or code
  problem (it persists even with `instagram_business_manage_comments` granted).
  - **How to spot it:** a real outside comment is visible in the Instagram app and
    `comments_count` reflects it, but the comments endpoint returns `[]` — and it's the *same*
    across every post (all counts > 0, all endpoints return 0). *(Seen 2026-07-01: an outside
    comment from `ronnieee119` on the Toni Morrison post — `comments_count = 1` — returned
    empty from the API; all 4 posts totaled 10 counted comments and 0 returned.)*
  - **App Mode is not readable via the API** — confirm it visually: **Meta App Dashboard → the
    App Mode toggle at the top (Development / Live).**
  - **Fix / next test:** add the commenter as an **Instagram Tester** (App Dashboard → Roles →
    add tester → they accept), *or* test with a second account that already has a tester/dev
    role, *or* move the app toward **App Review / Live mode** — which is what's ultimately
    required before comments from *arbitrary* public accounts are returned. Fastest confirmation:
    add the tester, re-run `COMMENTS_LIVE=1 node comment-intake.js`; if it now stages, mode
    filtering was the cause.
- **The PC must be on for Windows Task Scheduler to run.** Scheduled tasks won't fire on a
  powered-off machine; "start when available" lets them catch up next time it's on. Running
  when logged out needs the task's logon type set to S4U (no stored password).
- **Logs may contain commenter text and usernames** — keep them **gitignored**, never commit them.

---

## 14. Changelog

| Date | Step added or changed | What was verified | Notes |
|------|-----------------------|-------------------|-------|
| 2026-07-01 | Instagram token re-authorized with the comment scope; live intake verified | `node ig.js exchange` succeeded; printed permissions included `instagram_business_manage_comments` (plus `instagram_business_basic`, `instagram_business_content_publish`, `instagram_business_manage_insights`, `instagram_business_manage_messages`); `node ig.js whoami` = username **thehardwin**, account type **MEDIA_CREATOR**; `COMMENTS_LIVE=1 node comment-intake.js` scanned 3 recent posts, found 0 comments; `npm run replies:review` found nothing waiting; nothing was posted | Long-lived token saved only to local `credentials.env` (never committed). Outside-account comment test still pending. |
| 2026-07-01 | Added read-only `posts:summary` tool; manual engagement is the active workflow | `npm run posts:summary` lists recent posts with date, comments count, likes count, permalink, and caption preview, and flags posts with comments using 💬. It is **read-only**: does not read comment text, does not post replies, does not update Supabase, does not change account data. Documented as the active manual workflow (§11a) while automation stays paused (§11b). | Visibility retained even though automated replying is paused. |
| 2026-07-01 | **Paused** automated Instagram comment replies (decision) | Decision: Tanya replies to comments **manually** in Instagram for now; the automated system is **kept but paused** (Meta App Review / Live Mode / Human Agent / messaging overhead too high at this stage). Daily intake scheduled task **disabled**. Meta App Review is **not** to be continued unless Tanya restarts it. **The manual reply workflow is acceptable at this stage.** | Nothing deleted — scripts, the `ig_comment_replies` schema, and the diagnostic notes (§13 Development-mode visibility) are retained for a future resume. Do not request or use Human Agent / messaging workflows unless Tanya explicitly approves a future DM/private-message system. |
| 2026-07-01 | Documented Meta app-review bundle incl. Human Agent (§8c) | Meta's review bundle shows **Human Agent** + the 5 Instagram permissions (Human Agent is pulled in because `manage_messages` is requested). Documented Human Agent as reserved future messaging support only; added hard safety boundary (no DMs / private / Human Agent messages) and a fallback plan to drop Human Agent + `manage_messages` if review pushes back. | No messaging feature is active. |
| 2026-07-01 | Documented intentional five-permission Instagram set (§8b) | Decision recorded to keep all 5 Business permissions: basic + content_publish + manage_comments in use; manage_insights + manage_messages reserved for future approved workflows. Boundary + messaging safety rule + Meta-review justification documented. | Keeping a permission ≠ using it; new uses require doc + approval + dry-run + SOP entry first. Comment system stays public-comment only (no DMs). |
| 2026-07-01 | Added public compliance pages for Meta app review | Created `PRIVACY_POLICY.md`, `TERMS_OF_SERVICE.md`, `DATA_DELETION.md`; linked from README; §8a added. Plain language; no secrets; contact left as a placeholder to fill with a public brand email | Needed before publishing / app review (and thus before public comments come through the API). |
| 2026-07-01 | Comment visibility diagnostic (read-only) | Real outside comment from `ronnieee119` on the Toni Morrison post (media `18127259155715944`, `comments_count = 1`) is visible in the Instagram UI but the comments endpoint returns `[]` with no error. Across all 4 posts: 10 counted comments, 0 returned by the API. Scope is present, so this is **API visibility = Meta App in Development mode** (only role-users' comments are returned). | No posting, no Supabase writes, no workflow change. Next: add commenter as an Instagram Tester or move app to Live, then re-run intake. See §13. |

*(Add a row every time you complete or correct a verified step. Keep it factual.)*

---

## 15. Add the next verified step here

When you get the next thing working, copy this template, fill it in, then fold it into the
right section above and log it in §14.

```
- Date:
- Step tested:
- Command or screen used:
- Result:
- Evidence:
- SOP update needed:
```
