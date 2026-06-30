# The Hard Win — card production skill

Produces daily Instagram cards that feature a **real person who did the hard
version of something**, each with a **receipt** (a source line you can check).
The scripts do the labor; **you and Claude keep the judgment.** Nothing posts
automatically — every card lands in Supabase as `status='pending'` for approval.

Read `SKILL.md` for the rules (non-negotiable). This is the how-to-run.

## Prerequisites (already set up in this project)
- Python + Pillow + requests: `py -m pip install pillow requests`
- `render_card.py` is the **locked** renderer — use as-is, do not redesign.
- Supabase `posts` table already exists with the right columns; the `cards`
  storage bucket already exists. **No migration.**
- Credentials read from the project root: `supabase.env` (image host) and
  `credentials.env` (Instagram). No keys live inside the skill.

## Run a batch of N people
You give Claude a list of names (or a theme and let it propose candidates). For
**each** person, rotating the palette by index `i = 0,1,2,…`:

```
# 1. Scaffold a record (labor) — assigns the next palette in the 6-rotation
py scripts/research_notes.py "Toni Morrison" --index 0

# 2. RESEARCH (judgment — Claude + you)
#    Fill records/toni-morrison.json: dated facts, hook/body/copy_today/caption,
#    the receipt line, and 2+ independent reputable sources.

# 3. Validate the hard rules (labor / guardrail) — must print PASS
py scripts/validate_record.py records/toni-morrison.json

# 4. Render the card (labor) — palette comes from the record (rotation)
py scripts/render_card.py records/toni-morrison.json
#    -> output/hardwin-toni-morrison.png

# 5. Load to Supabase as PENDING (labor) — re-validates, never auto-approves
py scripts/load_to_supabase.py --record records/toni-morrison.json --image output/hardwin-toni-morrison.png
#    Add --dry first to preview without writing anything.
```

After the batch, Claude prints a **report** — each subject, the receipt, the named
sources, palette, and any flags or cuts — then **STOPS**. You approve in Supabase
(flip `status` from `pending`) before anything enters the posting queue.

## Loops & limits (by design)
- **One bounded batch loop** over the fixed list of N you pass — N is never auto-expanded.
- **~6 research queries per person, max.** If 2 independent reputable sources don't
  surface, the person is **CUT** (`status:"cut"` + `cut_reason`) and the loop moves on.
  A cut is a valid outcome, not a failure — the bar is never lowered to force a pass.
- **Hard stop after the last person:** print the batch report, then HALT for your
  approval. No auto-starting another batch, no continuing past the list.
- **No posting loop.** Posting is n8n's job, gated on `status='approved'`, which only
  you set. The skill never sets `approved` and never posts.

## Preview the palette rotation for one record
```
py scripts/render_card.py --swatch
#    -> output/sample_<palette>.png for all six (teal, navy, plum, violet, forest, black)
```

## The hard stops (so they're impossible to miss)
- `validate_record.py` refuses: fewer than 2 sources, any quote-mill / pirate /
  agency source, emojis in card text, an unknown palette, or a non-`pending` status.
- `load_to_supabase.py` re-validates, refuses anything not `pending`, writes only
  existing `posts` columns, and never sets `approved`/`posted`.
- A `cut` person is logged (`status:"cut"` + `cut_reason`) and never loaded.
- The n8n workflow and the `posts` schema are never modified by this skill.
