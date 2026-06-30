# Instagram Platform Playbook — The Hard Win

A **living record** of Instagram's current rules that affect how we caption, tag, and post.
Platform behavior changes often, so this file is **reviewed every quarter** (see the schedule
at the bottom) and the changelog tracks every upgrade/downgrade/policy shift.

> Anything in here can go stale. Trust the **Last verified** date and the cited sources, not memory.

---

## CURRENT RULES — last verified: 2026-06-30  ·  next review: 2026-10-01

### Hashtags
- **HARD CAP: 5 hashtags maximum per post / Reel.** Rolled out **December 2025**,
  platform-*enforced* (not a suggestion). More than 5 → Instagram blocks the post or
  silently strips the extra tags.
- **The cap is total, regardless of placement** — caption, first comment, or split between
  them, you get **5 total**. Putting tags in the comment does **not** buy extra slots.
- **Placement: caption is now recommended.** Equal to comments for classification, but the
  caption indexes keywords + tags the moment you publish; there's no longer any advantage to
  putting them in the first comment.
- **Hashtags are a classification signal, not a reach lever.** Mosseri/Meta have repeatedly
  said more hashtags ≠ more reach. Use **3–5 relevant, specific** tags, not generic ones.
- **Keywords beat hashtags for discovery.** Instagram search indexes caption *text*, so a
  clear, keyword-rich caption (names, dates, topic) drives more search/reach than tags do.

### Original content (recommendations eligibility)
- Instagram limits reach for **unoriginal** content: reposts, screenshots of others' work with
  just a credit, or low-effort edits (borders, watermarks, speed changes) become **ineligible
  for recommendations to non-followers**. Accounts *primarily* posting unoriginal content can be
  left out of recommendations entirely (recover by being mostly-original over a 30-day window).
- **Original = self-created or *materially* edited** (added text, narration, graphics, design that
  substantially transforms the source). Minimal overlays, watermarks, crops, or speed changes do
  NOT qualify.
- **The Hard Win's own originality standard (stricter than the minimum — do NOT rely on "Instagram
  will count it as original"):** treat public-domain images as **raw material, not finished
  content**. A post is safe for our standard only when we add meaningful editorial transformation —
  original research, original captioning, original layout, original typography, source-aware
  context, and a distinct Hard Win visual frame. A light overlay, repost, screenshot, watermark,
  or minimal crop is not enough.
- **ORIGINALITY STANDARD (internal rule):** every Hard Win post must contain **at least three
  original contribution layers** drawn from: researched context · original written framing · custom
  visual composition · source citation / provenance note · original caption · design treatment.
  Public-domain imagery may be used **only as source material inside a materially transformed
  post** — never posted as-is or with a caption merely slapped on top.

### What this means for The Hard Win (our config)
- **Never exceed 5 hashtags per post**, counting caption + comment combined.
- **Lead the caption with the hook and real keywords** (person's name, what they did, year) —
  that's our biggest search lever, and our cards already do this.
- **Hashtag count: COMPLIANT (≤5 per card).** Trimmed 2026-06-30 (dropped `#RealHistory` from
  the 24 cards that had 6); ≤5 tags total per post.
- **Hashtag placement: CAPTION (done 2026-06-30).** The ≤5 tags now ride at the end of each
  caption; the first comment carries only the motivational opener + follow CTA (no tags).
  Caption + comment combined stays ≤5.

---

## CHANGELOG (newest first)

| Date | Change | Source | Action we took / need |
|---|---|---|---|
| 2026-06-30 | Moved all hashtags from the first comment into the **caption** (best-practice placement). First comment now = opener + follow CTA only. | this playbook | Done (Supabase: caption carries ≤5 tags, `first_comment` is tag-free). |
| 2026-06-30 | Logged 2 more official sources (Original Content Guidelines + Creators Blog). Adopted an internal **Originality Standard** (≥3 original layers; public-domain images = raw material only, never finished content). | creators.instagram.com/original-content-guidelines | Our renders are original; PD images used only inside materially-transformed posts. NOT claiming "Instagram counts PD+overlay as original." |
| 2026-06-30 | Trimmed all first-comments to **≤5 hashtags** (dropped `#RealHistory` from 24 Black-history cards) to comply with the cap. | this playbook | Done (data in Supabase `posts.first_comment`). Comment→caption placement move still pending. |
| 2026-06-30 | Confirmed **5-hashtag hard cap** (live since Dec 2025), enforced regardless of caption vs comment placement; **caption now the recommended home**; keyword captions out-perform hashtag-heavy posts. | Social Media Today; Later; Hootsuite 2026 data | TRIM all cards to ≤5 tags; decide caption vs comment placement (pending user). |
| 2025-12 (reported) | Instagram began enforcing the **5-tag cap** platform-wide (after earlier 3-tag tests). | Social Media Today | — |

---

## SOURCES (re-check these each review)
- **PRIMARY (official):** Instagram Creators — Algorithms & Ranking:
  https://creators.instagram.com/grow/algorithms-and-ranking  ← start here every quarter;
  it's the official hub and links out to the detailed "how Instagram works" / signals articles.
- **PRIMARY (official):** Instagram Creators — Original Content Guidelines:
  https://creators.instagram.com/original-content-guidelines  ← originality rules / reach penalties.
- **PRIMARY (official):** Instagram Creators — Blog (announcements feed):
  https://creators.instagram.com/blog  ← scan for any new feature/policy announcements each quarter.
- Social Media Today — "Instagram Implements New Limits on Hashtag Use":
  https://www.socialmediatoday.com/news/instagram-implements-new-limits-on-hashtag-use/808309/
- Later — "Ultimate Guide to Using Instagram Hashtags (2026)":
  https://later.com/blog/ultimate-guide-to-using-instagram-hashtags/
- Also check each quarter: **Adam Mosseri** (@mosseri) posts/AMA and the official
  **@creators** account + Instagram Help Center, for any new caption, hashtag, alt-text,
  link, or Reels-length rules.

---

## QUARTERLY REVIEW CHECKLIST
Run on the schedule below (or by hand). For each item: confirm still-true, note any change in
the changelog with a dated source, and flag anything that breaks our current posting setup.

1. **Hashtag cap** — still 5? changed number? still enforced regardless of placement?
2. **Placement** — caption vs first comment: any new official guidance?
3. **Caption** — character limit, keyword/SEO indexing, first-line truncation point.
4. **Reach levers** — what Instagram/Mosseri currently say drives distribution (saves, sends,
   watch time, originality, etc.).
5. **Reels / image specs** — any change to recommended dimensions, length, or cover rules.
6. **Links & mentions** — rules on links in bio/caption/comments, @mention limits, CTAs.
7. **Original-content rules** — any change to what counts as original vs. unoriginal, recommendation-
   eligibility penalties, watermark/repost rules (check Original Content Guidelines + the Blog).
8. **Anything that would change `post-daily.js`, the card renderer, or our caption/tag format.**

After reviewing: update **Last verified** + **next review** dates above, add a changelog row,
and if anything breaks our setup, surface it (don't silently "fix" content — flag for human approval).

**Every quarterly review must end with exactly ONE recorded outcome** (in the changelog row AND
the PR/issue) — never a loose "checked it" note:
**No Change · Playbook Updated · Templates Updated · Workflow Updated · Review Failed / Needs Manual Follow-Up.**

---

## HOW THE QUARTERLY CHECK RUNS
Two things fire on the same cadence (≈1st of Jan/Apr/Jul/Oct):
- **Cloud review routine — PRIMARY.** A scheduled Claude cloud agent re-runs this checklist,
  updates this file, and opens a **PR** with the changes. This is the real review.
- **GitHub Action — reminder/backstop ONLY.** Files a tracking *issue* on the same cadence
  (`.github/workflows/quarterly-platform-review.yml`), in case the routine is ever paused.

**Quarterly Review Rule (avoid duplicate noise):** The GitHub Action is a reminder/backstop only;
the cloud review routine is the primary review process. **If both run in the same quarter, close
the GitHub Action issue by linking to the cloud routine's PR/review.** Do **not** run two separate
platform reviews for the same quarter unless the first review **failed**.

See the project memory (`thehardwin-ig-automation`) for the schedule's exact definition. If the
schedule is ever removed, this checklist can be run by hand at any time.
