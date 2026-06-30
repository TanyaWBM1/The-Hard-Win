"""The Hard Win — load a rendered card into Supabase as status='pending'.

The ONLY script that writes to the database. It will:
  1. Re-run validate_record (refuses anything that fails the hard rules).
  2. Refuse any record whose status is not exactly 'pending'.
  3. Upload the PNG to the public 'cards' bucket.
  4. Insert ONE row into `posts` using ONLY the existing columns, status='pending'.

It NEVER sets 'approved' or 'posted', NEVER alters the table, and NEVER touches
the n8n workflow. The full structured source list stays in the local record JSON
(the audit trail); the receipt + caption name the sources on the row itself.

Usage:
    python load_to_supabase.py --record records/toni-morrison.json --image output/hardwin-toni-morrison.png
    python load_to_supabase.py --record records/toni-morrison.json --image out.png --dry
"""
import argparse
import json
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate_record import validate  # noqa: E402

PROJECT_ROOT = Path(__file__).resolve().parents[3]  # ig-daily-cards/
BUCKET = "cards"

# Only columns that actually exist on `posts` are ever written.
DB_COLUMNS = ["subject_name", "hook", "body", "copy_today", "receipt", "image_credit", "caption", "image_url", "status"]


def load_env(name):
    p = PROJECT_ROOT / name
    if not p.exists():
        raise SystemExit(f"Missing {p} (expected at the project root).")
    env = {}
    for line in p.read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def slug_for(name):
    return str(name).lower().replace(" ", "-").replace(".", "")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--record", required=True)
    ap.add_argument("--image", required=True)
    ap.add_argument("--dry", action="store_true", help="validate + show what would happen; write nothing")
    args = ap.parse_args()

    record = json.loads(Path(args.record).read_text(encoding="utf-8-sig"))

    # Guardrail 1: hard rules.
    errors, warnings = validate(record)
    for w in warnings:
        print("  warning:", w)
    if errors:
        print("REFUSING TO LOAD:", record.get("subject_name", args.record))
        for e in errors:
            print("  error:", e)
        sys.exit(1)

    # Guardrail 2: only pending drafts are ever loaded.
    if record.get("status") != "pending":
        print(f"REFUSING TO LOAD: status is {record.get('status')!r}, not 'pending'.")
        sys.exit(1)

    sb = load_env("supabase.env")
    base = sb["SUPABASE_URL"].rstrip("/")
    key = sb["SUPABASE_SERVICE_KEY"]
    hdr = {"apikey": key, "Authorization": f"Bearer {key}"}

    filename = f"hardwin-{slug_for(record['subject_name'])}.png"
    image_url = f"{base}/storage/v1/object/public/{BUCKET}/{filename}"

    row = {k: record.get(k) for k in DB_COLUMNS}
    row["image_url"] = image_url
    row["status"] = "pending"

    if args.dry:
        print("DRY RUN — would upload", args.image, "->", image_url)
        print("DRY RUN — would insert (status=pending):")
        print("  ", json.dumps({k: row[k] for k in ("subject_name", "receipt", "status")}, ensure_ascii=False))
        print("   sources kept in record JSON:", record.get("sources"))
        return

    # Upload PNG (x-upsert so a re-render replaces cleanly).
    up = requests.post(
        f"{base}/storage/v1/object/{BUCKET}/{filename}",
        headers={**hdr, "Content-Type": "image/png", "x-upsert": "true"},
        data=Path(args.image).read_bytes(),
    )
    if not up.ok:
        raise SystemExit("upload failed: " + up.text)

    # Insert the pending row.
    ins = requests.post(
        f"{base}/rest/v1/posts",
        headers={**hdr, "Content-Type": "application/json", "Prefer": "return=representation"},
        data=json.dumps(row, ensure_ascii=False).encode("utf-8"),
    )
    if not ins.ok:
        raise SystemExit("insert failed: " + ins.text)

    new_id = ins.json()[0].get("id", "?")
    print(f"LOADED as PENDING — row #{new_id}: {record['subject_name']}")
    print(f"  image: {image_url}")
    print("  status: pending  (awaiting human approval — nothing posts automatically)")


if __name__ == "__main__":
    main()
