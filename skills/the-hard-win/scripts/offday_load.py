"""The Hard Win — off-day "receipt card" loader.

These cards are ALREADY rendered (PNGs live in ig-daily-cards/assets). This loader
NEVER regenerates or restyles them. For each record it:
  1. Uploads the existing PNG to the Supabase 'cards' bucket (x-upsert).
  2. Inserts ONE row in posts with status='pending' (subject_name, receipt,
     caption, image_credit, image_url). Off-day cards have no hook/body/copy_today.

Human gate: pending only. Never sets approved/posted. Does not schedule.

Usage:
    python offday_load.py --file records/batch-offday.json
    python offday_load.py --file records/batch-offday.json --dry
"""
import argparse
import json
import sys
from pathlib import Path

import requests

PROJECT_ROOT = Path(__file__).resolve().parents[3]   # ig-daily-cards/
ASSETS = PROJECT_ROOT / "assets"
BUCKET = "cards"
DB_COLUMNS = ["subject_name", "receipt", "caption", "image_credit", "image_url", "status"]


def load_env(name):
    env = {}
    for line in (PROJECT_ROOT / name).read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", required=True)
    ap.add_argument("--dry", action="store_true")
    args = ap.parse_args()

    records = json.loads(Path(args.file).read_text(encoding="utf-8-sig"))
    sb = load_env("supabase.env")
    base = sb["SUPABASE_URL"].rstrip("/")
    key = sb["SUPABASE_SERVICE_KEY"]
    hdr = {"apikey": key, "Authorization": f"Bearer {key}"}

    created = []
    for rec in records:
        if rec.get("status") != "pending":
            print(f"SKIP {rec['subject_name']}: status is {rec.get('status')!r}, not 'pending'.")
            continue
        asset = ASSETS / rec["asset"]
        if not asset.exists():
            print(f"SKIP {rec['subject_name']}: missing asset {asset}")
            continue

        image_url = f"{base}/storage/v1/object/public/{BUCKET}/{rec['asset']}"
        if args.dry:
            print(f"DRY  {rec['subject_name']}  ->  {image_url}  (credit: {rec.get('image_credit') or 'EMPTY'})")
            continue

        up = requests.post(f"{base}/storage/v1/object/{BUCKET}/{rec['asset']}",
                           headers={**hdr, "Content-Type": "image/png", "x-upsert": "true"},
                           data=asset.read_bytes())
        if not up.ok:
            print(f"ERR  upload {rec['subject_name']}: {up.text[:120]}")
            continue

        row = {k: rec.get(k) for k in DB_COLUMNS}
        row["image_url"] = image_url
        row["status"] = "pending"
        ins = requests.post(f"{base}/rest/v1/posts",
                            headers={**hdr, "Content-Type": "application/json", "Prefer": "return=representation"},
                            data=json.dumps(row, ensure_ascii=False).encode("utf-8"))
        if not ins.ok:
            print(f"ERR  insert {rec['subject_name']}: {ins.text[:160]}")
            continue
        rid = ins.json()[0].get("id", "?")
        created.append((rid, rec["subject_name"], bool(rec.get("image_credit"))))
        print(f"OK   row #{rid}  {rec['subject_name']}  (off-day, pending)")

    if not args.dry:
        print("\n" + "-" * 60)
        print(f"{len(created)} off-day rows created as PENDING.")
        missing = [c for c in created if not c[2]]
        if missing:
            print(f"IMAGE_CREDIT EMPTY on {len(missing)} rows — fill before approving:")
            for rid, name, _ in missing:
                print(f"   #{rid}  {name}")


if __name__ == "__main__":
    main()
