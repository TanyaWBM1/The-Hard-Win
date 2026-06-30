"""The Hard Win — research-notes scaffolder.

Creates a blank, template-correct record for a candidate person so research is
captured the same way every time. It does NOT do the research and does NOT fill
any facts — that is deliberate. The labor (a consistent template, a slug, the
rules in front of you, the next palette in rotation) is automated; the judgment
(the facts, the 2+ sources, the decision to cut) stays human.

Usage:
    python research_notes.py "Toni Morrison" --index 0
    python research_notes.py "Bessie Coleman" --palette navy
    -> writes records/<slug>.json with empty fields and a 2-slot sources stub.
"""
import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from render_card import palette_for_index, ROTATION  # noqa: E402

RECORDS_DIR = Path(__file__).resolve().parent.parent / "records"

RULES = [
    "TWO-SOURCE RULE: ship a fact only if confirmed across 2+ independent reputable sources.",
    "Never quote-mills (BrainyQuote/AZQuotes/Pinterest), never Sci-Hub/LibGen, never agency images sold as free (Getty/Bettmann).",
    "Demote, don't dress up: thin sourcing -> drop the detail or label it 'approximate'.",
    "If the central claim is contested, set status='cut' with cut_reason and do not ship.",
    "Quotes must trace to the actual speech/book/interview, not an aggregator.",
    "No emojis on the card. Voice is plain, calm, non-hype. status is always 'pending' on creation.",
    "QUERY CAP ~6: if 2 independent sources don't surface within ~6 searches, set status='cut' with cut_reason. A failed verification is a valid outcome, not an error to loop away. Never lower the source bar to force a pass.",
]


def slugify(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("--palette", default=None, help="teal|navy|plum|violet|forest|black")
    ap.add_argument("--index", type=int, default=None, help="rotation index (assigns next palette in ROTATION)")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    palette = args.palette or (palette_for_index(args.index) if args.index is not None else None)
    slug = slugify(args.name)
    out = RECORDS_DIR / f"{slug}.json"
    if out.exists() and not args.force:
        raise SystemExit(f"{out} already exists. Use --force to overwrite.")

    stub = {
        "_rules": RULES,
        "_rotation": ROTATION,
        "subject_name": args.name,
        "hook": "",
        "body": "",
        "copy_today": "",
        "receipt": "",
        "sources": ["", ""],
        "image_credit": "",
        "caption": "",
        "palette": palette,
        "status": "pending",
        "cut_reason": ""
    }
    RECORDS_DIR.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(stub, indent=2, ensure_ascii=False), encoding="utf-8")
    print("created", out, f"(palette: {palette})")
    print("Next: research the person, fill the fields and 2+ sources, then validate_record.py.")


if __name__ == "__main__":
    main()
