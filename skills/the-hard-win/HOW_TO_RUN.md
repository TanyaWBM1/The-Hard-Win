# THE HARD WIN — How to Add More Cards

This is the operating manual for the channel. Read it when you come back to add
cards and have forgotten how it works. It is written to be followed step by step.

The whole system has one rule on top of every other rule: **automate the labor,
never the judgment.** The skill does the research and the rendering. You do the
deciding. Nothing posts until you approve it by hand.

---

## The two rooms

There are two different tools, and they do two different jobs. Do not mix them up.

**Standard Claude chat** is where you do NexLev research. NexLev is a connector
that only works in standard chat. This is where you find new people, check what is
working in the niche, and decide who is worth a card.

**Claude Code** is where you run the skill. Claude Code has the project files, the
renderer, and the Supabase loader. This is where cards get built and staged. NexLev
does not work here.

Short version: **find the people in chat, build the cards in Code.**

---

## The full loop, start to finish

1. (Optional) Research in standard chat with NexLev to find new people or themes.
2. Hand the list of names to Claude Code.
3. Claude Code runs the skill: verifies each person, renders the cards, stages them
   as `pending` in Supabase.
4. You review the batch report and the rendered cards.
5. You approve the ones you want. Those start posting. The rest stay pending.

That is the whole thing. Steps 1 and 2 are the only parts that change each time.

---

## STEP 1 — Research in standard Claude chat (NexLev)

You do not always need this step. If you already know who you want (e.g. "ten more
late-bloomer scientists"), skip to Step 2. Use this step when you want to find new
people or check the niche is still healthy.

### NexLev setup notes (so it does not fight you)

- NexLev runs in **standard Claude chat only.** Not in Claude Code. Claude Code web
  wants a GitHub repo for every session, which you do not need for research.
- Set NexLev tool permissions to **"Always allow."** Otherwise it stops and asks on
  every single call and the research crawls.

### How to read the niche

Ask Claude (in chat) to search the niche with NexLev. Good starting moves:

- **Explore the niche by topic.** Ask for channels in the inspiration / "real people,
  real proof" / biography / hard-story space. The tool returns channels with their
  subscriber counts, revenue estimates, RPM, upload frequency, and recent titles.
- **Look for clusters, not single channels.** A healthy niche has several channels
  with an outlier score of 2 or higher, decent RPM, and recent creation dates. One
  lucky channel is noise. A cluster is a signal.
- **Pull outlier videos from a channel you like.** This shows you which specific
  videos beat that channel's own average — i.e. which *stories* or *people* are
  pulling weight. Those are candidates for your own cards.

### The outlier-score warning (important, easy to forget)

**Do not trust `outlierScore` by itself.** A single number can mislead. A channel can
show a high score off one freak video while everything else is flat.

Before you trust that a channel or a topic is really working, **check the view
distribution across 6 or more recent uploads.** You want to see several videos doing
well, not one spike dragging the average up. If only one video popped and the rest
are flat, that is not a working channel — that is one lucky video. Move on.

### What you are looking for

People who did the **hard version** of something, where the key fact is **true and
checkable.** That is the whole brand. A great story with no receipt is not a card.
When you find candidates, write down the names and the one fact that would be the
receipt. Bring that list to Claude Code.

---

## STEP 2 — Run the skill in Claude Code

Open Claude Code in the `ig-daily-cards` project. The `the-hard-win` skill lives in
`skills/the-hard-win/`. You do not need to re-explain the rules — they are written
into the skill files. You just give it the new names.

### The prompt to use

Paste something like this, swapping in your names or theme:

```
Run the the-hard-win skill. New batch: [list the names, OR a theme like
"10 more late-bloomer scientists"].

Same rules as always:
- Two independent reputable sources per person. No quote-mills, no single-source.
- Demote, do not dress up. If a fact will not hold, cut the person — a cut is fine.
- Stage as pending only. Never auto-approve, never post.
- One bounded pass. Do not retry a person forever; ~6 queries then cut.
- Hard stop with a batch report when the batch is done.

Render the cards on the fixed scripts/render_card.py and stage them in Supabase
as pending. Show me the batch report and stop.
```

### What the skill does on its own

- Researches each person and applies the **two-source rule.** Anyone who cannot be
  confirmed twice gets **cut.** A cut is a valid, healthy outcome — it is the rule
  working, not a failure.
- Renders each card on `render_card.py`, which **auto-fits the text** so the action
  block can never overlap the receipt line. (This was a real bug once. The renderer
  now shrinks the hook + body + action together until it clears a 48px floor, and it
  will raise an error rather than save an overlapping card.)
- Rotates the six palettes (teal, navy, plum, violet, forest, black) so the feed
  cycles through all of them.
- Loads each card to Supabase as `status = pending`.
- **Stops** with a report. It does not loop, does not schedule, does not post.

### The loop limits (why it will not run away)

The skill is built to stop. It does one bounded pass over your list, caps research at
about six queries per person before cutting, hard-stops with a report when the batch
is done, and has **no posting loop at all.** If a run ever seems to be going in
circles, that is wrong — stop it. A correct run is short and ends in a report.

---

## STEP 3 — Review and approve (this part is yours)

Nothing posts until you do this. The skill leaves everything `pending`.

Read the batch report. Then look at the actual rendered cards — do not approve off the
report alone. You are checking **two** things on every card:

1. **Is the receipt true?** Does the fact match the sources, with no inflation.
2. **Does the card render clean?** No crowding, no text running into the receipt line,
   the action reads as a real action.

You have caught layout bugs by eye that the renderer thought were fine. Trust that.
That second check is exactly why the human gate exists.

Watch for the judgment calls the report flags — a complicated figure (the Marcus
Garvey type, where the honest caption includes a failure or conviction), or a person
whose dates could not be confirmed and were left off on purpose. Decide those yourself.

To approve: flip the card's `status` from `pending` to `approved` in Supabase, or just
tell Claude Code (e.g. "approve all except [name]"). Approved cards roll into the
every-other-day schedule. The rest stay pending until you say otherwise.

---

## Supabase facts you will need

- **IG project ref:** `tpirzpvvhhgpnwsrbbnh`. This is the channel's database.
- **Table:** `posts`. **Images bucket:** `cards` (public).
- **Status values:** `pending` → `approved` → `posted` (and `error`).
- The poster only ever posts rows with `status = 'approved'`. A `pending` row is
  invisible to it. That is the safety gate.

### The MCP warning (do not skip this)

The Supabase **MCP connector is pointed at the CreatorSeal project**, NOT this IG
project. CreatorSeal has no `posts` table. **Never run an IG query through the MCP
connection** — it will hit the wrong database. The loader goes REST-direct to the IG
project using `supabase.env`. If something about Supabase looks empty or wrong, check
that you are not accidentally on the CreatorSeal MCP connection.

(If you ever get time: repoint or clearly label that MCP connector so the two projects
can never be crossed.)

---

## Card facts (the format, so future-you remembers the standard)

Every main card has: `subject_name`, `hook`, `body`, `copy_today` (labeled
**DO THIS TODAY** on the card), `receipt`, `image_credit`, `caption`, `image_url`,
`status`, and a palette.

The **receipt** is the point of the whole brand. It is the source line that makes the
fact checkable. The receipt always rides in the caption too. The skill may rephrase a
hook or caption, but it must **never** change a verified date, name, or source.

Approved vocabulary stays plain. No hype. The differentiator is that every fact is
true and you can check it.

---

## Off-day "receipt close-up" cards (separate, still manual)

These are the second post type — the big number/fact with a faded public-domain photo
behind it. **They are not baked into the skill yet.** Running the skill gives you main
cards only. Off-day cards are a separate, hand-run step:

1. Find a **public-domain** photo on Wikimedia Commons. Confirm the license on the
   file's own page (the "this work is in the public domain" line). The article page is
   not good enough — you need the **file page.**
2. Save it to `assets/` as `source-firstname-lastname.png`.
3. Write down the file-page URL and the license line. That is the **image receipt** —
   it goes in `image_credit`. A card cannot be approved without it.
4. Render it on the off-day script, then have Claude Code stage it as `pending`,
   matched to a person already in the queue.

Rule that decides the layout: **put the text where the face is not.** Face on the
right → text in a left column. Face on the left → text in a right column. Face
centered → centered text.

Off-day cards cannot post until a main run is approved and scheduled. They are polish
on top of the main feed, not a feed of their own.

> Someday-job: fold the off-day render + credit step into the skill so it is one
> gated run like the main cards. Not done yet.

---

## The short version (tape this to the wall)

1. Find people in **standard chat** with NexLev. Check 6+ uploads, do not trust one
   outlier score.
2. Hand the names to **Claude Code**. Run the the-hard-win skill. Same rules.
3. Skill verifies (two sources), renders (no overlap), stages as **pending**, stops.
4. You review **facts and layout.** Approve what you want. Decide the hard cases.
5. Approved cards post every other day. Pending cards wait for you.

Automate the labor. Never the judgment.
