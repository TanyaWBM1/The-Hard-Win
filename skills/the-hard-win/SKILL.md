---
name: the-hard-win
description: >-
  Produce daily Instagram cards for the account The Hard Win. Every card features
  a REAL person who did the hard version of something, paired with a verifiable
  source line ("the receipt"). Use this when researching, drafting, rendering, or
  queuing The Hard Win cards, or processing a batch of candidate people. Prime
  directive: AUTOMATE THE LABOR, NEVER THE JUDGMENT — the skill researches,
  drafts, renders, and loads to Supabase as status='pending', then STOPS for human
  approval. It never auto-approves and never posts.
---

# The Hard Win — card production skill

## Prime directive
**AUTOMATE THE LABOR, NEVER THE JUDGMENT.** The scripts do deterministic work —
scaffold records, check sourcing, render the locked design, upload, insert pending
rows. The research, the wording, the sourcing calls, and the decision to cut a
person stay with a human (you + Claude). Nothing is approved or posted by the skill.

## What the brand is
Every card features a **real person who did the hard version of something**, paired
with a **receipt**: a source line you can check. Voice is calm, plain, non-hype.
**No emojis on the card.** Per-card fields:
`subject_name`, `hook` (headline), `body` (2–4 plain sentences), `copy_today`
(one concrete action drawn from the person's real constraint), `receipt` (the
source line), `image_credit` (optional), `caption` (the IG caption), `palette`
(which background color).

---

## NON-NEGOTIABLE RULES

1. **TWO-SOURCE RULE:** a fact ships only if confirmed across two independent,
   reputable sources (encyclopedias, museums, university pages, fact-checked
   obituaries, primary documents). NEVER quote-mills (BrainyQuote, AZQuotes,
   Pinterest), NEVER Sci-Hub/LibGen, NEVER agency images sold as free
   (Getty/Bettmann).

2. **DEMOTE, DON'T DRESS UP:** thin sourcing = drop the detail or label it
   "approximate." If the central inspirational claim is contested, CUT the person
   entirely and log why (we cut Diana Nyad because her record was unratified).

3. **HUMAN GATE:** the skill drafts, renders, and loads to Supabase as
   status='pending' with sources attached, then STOPS. A human approves before
   anything posts. Never auto-approve, never invent a person/date/quote/source,
   never flip a row to 'approved' or post it.

4. **Quotes must trace to the actual speech/book/interview, not an aggregator.**

These are enforced mechanically by `scripts/validate_record.py` (2+ sources,
banned-source block, no emojis, status must be 'pending') and by
`scripts/load_to_supabase.py` (re-validates; refuses anything not 'pending';
writes only existing `posts` columns; never sets 'approved'/'posted').

---

## LOOPS & LIMITS (build exactly these — do not add others)

1. **One bounded batch loop.** Iterate over the input list of N people, one at a
   time: research → draft → render → stage to Supabase as `status='pending'` →
   next person. A plain for-loop over a **fixed** list. N is whatever the human
   passes; **never auto-expand it.**

2. **Bounded retries per person.** When researching, search a fixed maximum number
   of times — **cap ≈ 6 queries per person.** If two independent reputable sources
   do not surface within that cap, **STOP for that person and mark them a CUT with
   the reason** (`status:"cut"`, `cut_reason:"…"`). Do **not** keep searching until
   something passes, and do **not** lower the source bar to make one pass. **A
   failed verification is a valid, expected outcome — not an error to loop away.**

3. **Hard stop at end of batch.** After the last person, print the batch report
   (each person, receipt, sources, flags/cuts) and **HALT.** Do not automatically
   start another batch, continue to more people, or re-run. Wait for explicit
   human approval.

4. **No posting loop in this skill at all.** Posting is n8n's job, gated on
   `status='approved'`, which only a human sets. The skill **never sets 'approved'
   and never posts.**

**Forbidden loop patterns:** retry-until-success on research; any self-continuing
or "agentic" loop that proceeds past the batch without the human; any loop that
flips rows to `'approved'` or posts. If a step can't complete within its limit,
**flag it and move on — never loop to force it.**

---

## Card rendering (LOCKED — do not redesign)
Rendering is done by `scripts/render_card.py`, used **as provided**. It renders a
**1080×1350** card: dark background, cream text, amber accent, HW seal (top-left),
VERIFIED pill (top-right), subject name, serif hook, sans body, a "DO THIS TODAY"
block with an accent left-rule, and the receipt in mono pinned to the bottom with
the THE HARD WIN wordmark bottom-right.

It takes a `palette` argument — **do not hardcode a color.** Six approved dark
backgrounds (all hold cream + amber):

`teal · navy · plum · violet · forest · black`

**Rotate the palette per card** via the renderer's own
`render_card.palette_for_index(i)` / `ROTATION`, so the feed cycles all six and
never repeats two days running.

```python
from render_card import render_card, palette_for_index
render_card(card, palette=palette_for_index(i), out_path=f"output/hardwin-{slug}.png")
```

---

## The process (labor vs. judgment)

| Step | Who | How |
|---|---|---|
| 1. Get candidates | human provides names, or skill proposes by theme | a plain list |
| 2. Scaffold a record per person | **labor (script)** | `research_notes.py "Name" --index i` → `records/<slug>.json` |
| 3. Research each person | **judgment (Claude + human)** | multi-source web research; extract **dated** facts; find 2+ reputable sources; trace any quote to its work. **Cap ≈ 6 queries** — if 2 sources don't surface, CUT and move on (a cut is a completed outcome, not a failure) |
| 4. Draft hook/body/copy_today/caption | **judgment** | calm, plain, non-hype; no emojis on card; `copy_today` ties to the real constraint |
| 5. Assemble receipt + source list | **judgment** | name the 2+ sources in `receipt`; fill `sources[]` |
| 6. Validate | **labor (script)** | `validate_record.py` — enforces the hard rules |
| 7. Decide cuts | **judgment (human)** | contested/unratified central claim → `status:"cut"` + `cut_reason` |
| 8. Render | **labor (script)** | `render_card.py` → `output/hardwin-firstname-lastname.png`, palette by rotation |
| 9. Load as pending | **labor (script)** | `load_to_supabase.py` — uploads PNG to 'cards', inserts `status='pending'` |
| 10. Batch report, then STOP | **skill** | print each person, receipt, sources, flags/cuts; **wait for approval** |

### Where sources live
The `posts` table has no `sources` column, so the structured `sources[]` list stays
in the local record JSON (the audit trail) and is **named in the `receipt` and
`caption`** that are written to the row. Nothing about the table is changed.

### The batch report (what the skill hands you, then stops)
For each person: **subject**, **hook**, **receipt**, the **named sources**, the
**palette** used, and any **flags / cuts** (demoted details, "approximate" labels,
or a cut and why). Then **STOP**. No approving, scheduling, or posting.

---

## Worked example — Toni Morrison (status: pending)
Template file: `worked_example.json`. Rendered in all six palettes:
`output/hardwin-toni-morrison-*.png`.

- **subject_name:** Toni Morrison
- **hook:** "She wrote her first novel before her kids woke up."
- **body:** "A divorced single mother of two, working full time as an editor, she
  wrote in the quiet early mornings. Her first novel came out when she was 39."
- **copy_today:** "Find one quiet 20-minute window that already exists in your day.
  Give it to what matters, not the phone."
- **receipt:** "The Bluest Eye (Holt, Rinehart & Winston, 1970). Morrison born
  1931, age 39 at publication."
- **sources (2+ independent, reputable):** Encyclopaedia Britannica; Howard
  University archive; National Women's History Museum.
- **palette:** rotates (rendered in all six as a swatch).
- **flags:** none. Dated facts, cross-confirmed; the book is cited as a primary
  source; no aggregator quote used.

**Counter-example (the cut):** Diana Nyad's central claim (unassisted
Cuba–Florida swim) was **unratified / contested**. Per rule 2 that is a **cut**,
not a dress-up: `status:"cut"`, `cut_reason:"record unratified / contested by
independent observers"`. Logged, never loaded.

---

## File map
```
skills/the-hard-win/
  SKILL.md                 <- this file
  README.md                <- how to invoke for a batch of N people
  worked_example.json      <- the canonical card template (Toni Morrison)
  scripts/
    render_card.py         <- LOCKED renderer (provided, use as-is) — 1080x1350, 6 palettes
    research_notes.py      <- scaffold a record per person (labor)
    validate_record.py     <- enforces the hard rules (guardrail)
    load_to_supabase.py    <- uploads PNG + inserts status='pending' (labor)
  records/
    _schema.json           <- field-by-field record schema
    <slug>.json            <- one per candidate (the audit trail, holds sources)
  output/
    hardwin-<name>.png     <- rendered cards
```

## Hard stop
This skill ends at a batch summary with everything written as `pending`. It does
not approve, schedule, post, alter the `posts` table, or modify the n8n workflow.
Approval is a human action.
