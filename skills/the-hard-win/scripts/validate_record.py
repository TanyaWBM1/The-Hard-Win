"""The Hard Win — record validator.

Mechanically enforces the non-negotiable rules so a thin or badly sourced card
CANNOT be loaded by accident. It does NOT judge whether a claim is true — that is
the human's job. It enforces the structural guardrails:

  * >= 2 independent reputable sources (distinct entries)
  * no quote-mill / pirate / agency-image sources
  * no emojis in card text fields
  * every field the renderer + loader needs is present
  * palette is one the locked renderer accepts
  * status must be 'pending' (a 'cut' record only needs a cut_reason; never loaded)

Usage:
    python validate_record.py records/toni-morrison.json
    -> PASS / FAIL with reasons; exit 0 on pass, 1 on fail.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
try:
    from render_card import PALETTES
    ALLOWED_PALETTES = set(PALETTES)
except Exception:
    ALLOWED_PALETTES = {"teal", "navy", "plum", "violet", "forest", "black"}

# Sources we never accept: quote-mills, pirate libraries, agencies sold as free.
BANNED = [
    "brainyquote", "azquotes", "quotefancy", "quoteslyfe", "pinterest", "wikiquote",
    "goodreads.com/quotes", "sci-hub", "scihub", "libgen", "getty", "bettmann", "shutterstock",
]
REQUIRED = ["subject_name", "hook", "body", "copy_today", "receipt", "caption", "sources", "status"]
CARD_TEXT = ["subject_name", "hook", "body", "copy_today", "receipt"]
EMOJI_RANGES = [(0x1F300, 0x1FAFF), (0x2600, 0x27BF), (0x1F1E6, 0x1F1FF), (0xFE00, 0xFE0F)]


def has_emoji(s):
    return any(any(a <= ord(c) <= b for a, b in EMOJI_RANGES) for c in (s or ""))


def source_text(src):
    """A source may be a plain string or a {name,url,type} dict."""
    if isinstance(src, dict):
        return " ".join(str(src.get(k, "")) for k in ("name", "url", "type")).strip()
    return str(src or "").strip()


def validate(record):
    errors, warnings = [], []
    status = record.get("status")

    # 'cut' records are intentionally incomplete; they only need a reason. Never loaded.
    if status == "cut":
        if not record.get("cut_reason"):
            errors.append("status is 'cut' but no cut_reason is recorded.")
        return errors, warnings
    if status != "pending":
        errors.append(f"status must be 'pending' to ship (got {status!r}). Scripts never set 'approved'/'posted'.")

    for f in REQUIRED:
        if record.get(f) in (None, "", []):
            errors.append(f"missing required field: {f}")

    # palette must be one the locked renderer accepts
    pal = record.get("palette")
    if pal and pal not in ALLOWED_PALETTES:
        errors.append(f"unknown palette {pal!r}. Allowed: {', '.join(sorted(ALLOWED_PALETTES))}.")

    # Two-source rule: >= 2 independent reputable sources, none banned.
    sources = record.get("sources") or []
    texts = [source_text(s) for s in sources if source_text(s)]
    if len(texts) < 2:
        errors.append(f"TWO-SOURCE RULE: needs >= 2 independent sources, found {len(texts)}.")
    for t in texts:
        low = t.lower()
        for bad in BANNED:
            if bad in low:
                errors.append(f"banned source ({bad}): {t}")
    if texts and len({t.lower() for t in texts}) < 2:
        errors.append("sources are not independent (need >= 2 distinct entries).")

    # No emojis in any text drawn on the card.
    for f in CARD_TEXT:
        if has_emoji(record.get(f, "")):
            errors.append(f"emoji in card field '{f}' — card text must be plain.")

    # Voice nudges (warnings only — the human decides).
    hook = record.get("hook", "")
    if hook.isupper():
        warnings.append("hook is ALL CAPS — the voice is calm, not shouting.")
    if "!" in hook:
        warnings.append("hook contains '!' — consider a calmer headline.")
    if not record.get("palette"):
        warnings.append("no palette set — the batch will assign one by rotation.")

    return errors, warnings


def main():
    if len(sys.argv) < 2:
        print("usage: python validate_record.py <record.json>")
        sys.exit(2)
    record = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8-sig"))
    errors, warnings = validate(record)
    for w in warnings:
        print("  warning:", w)
    if errors:
        print("FAIL:", record.get("subject_name", sys.argv[1]))
        for e in errors:
            print("  error:", e)
        sys.exit(1)
    print("PASS:", record.get("subject_name", sys.argv[1]),
          f"({len(record.get('sources', []))} sources, palette={record.get('palette')}, status={record.get('status')})")


if __name__ == "__main__":
    main()
