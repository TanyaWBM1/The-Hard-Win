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

## 5. One loose end (optional)
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
| Supabase project (The Hard Win) | `tpirzpvvhhgpnwsrbbnh` |
| GitHub repo | https://github.com/TanyaWBM1/The-Hard-Win |

> Automate the labor, never the judgment. Nothing posts until you approve it.
