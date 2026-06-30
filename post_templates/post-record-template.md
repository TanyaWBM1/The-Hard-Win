# Post Record Template

The shape of one queued post. Authoritative field-by-field schema:
[`skills/the-hard-win/records/_schema.json`](../skills/the-hard-win/records/_schema.json).
Live queue rows live in the Supabase `posts` table; verified source lists stay in the local
record JSON (the audit trail).

> Stub / living template.

---

## Fields
```json
{
  "subject_name": "Full Name",
  "hook":         "One-line headline — the hard version of what they did.",
  "body":         "2–4 plain sentences with dated, verifiable context.",
  "copy_today":   "One concrete action drawn from the person's real constraint (DO THIS TODAY).",
  "receipt":      "Fact + dates. Confirmed: Source A, Source B.",
  "sources":      ["Source A", "Source B"],
  "image_credit": "For off-day cards: public-domain image source + license line.",
  "caption":      "IG caption (clean story) ending with up to 5 hashtags.",
  "first_comment":"Nod to the figure → urgent reader push (DO THIS TODAY) + follow CTA. No tags.",
  "palette":      "teal | navy | plum | violet | forest | black",
  "status":       "pending"
}
```

## Rules
- `status` starts at **`pending`**. Only a human flips it to `approved`. The poster posts only
  `approved` rows, then sets `posted`.
- Two independent reputable sources required (see [`CONTENT_RULES.md`](../CONTENT_RULES.md)).
- ≤5 hashtags, in the caption (see [`HASHTAG_RULES.md`](../HASHTAG_RULES.md)).
