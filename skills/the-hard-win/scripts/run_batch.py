"""The Hard Win — bounded batch loader (LOOPS & LIMITS rule #1).

ONE plain for-loop over a FIXED list of records: validate -> render (locked,
dark, rotating palette) -> upload -> stage to Supabase as status='pending' ->
next. No research (records are provided), no posting, no auto-approve. After the
last record it prints a batch report and HALTS.

A record that fails validation is FLAGGED and skipped (not loaded) — the loop
moves on; it never loops to force a pass.

Usage:
    python run_batch.py --file records/batch-latebloomers.json          # render + stage pending
    python run_batch.py --file records/batch-latebloomers.json --dry     # render only, write nothing
"""
import argparse
import json
import re
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from render_card import render_card, palette_for_index  # noqa: E402
from validate_record import validate  # noqa: E402

PROJECT_ROOT = Path(__file__).resolve().parents[3]
SKILL_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = SKILL_ROOT / "output"
BUCKET = "cards"
DB_COLUMNS = ["subject_name", "hook", "body", "copy_today", "receipt", "image_credit", "caption", "image_url", "status"]


def load_env(name):
    p = PROJECT_ROOT / name
    env = {}
    for line in p.read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def slugify(name):
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", name.lower())).strip("-")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", required=True)
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--reupload", action="store_true",
                    help="re-render and OVERWRITE existing images (same URLs); insert NO new rows")
    args = ap.parse_args()

    records = json.loads(Path(args.file).read_text(encoding="utf-8-sig"))
    print(f"Batch of {len(records)} records (fixed list — N is never auto-expanded).\n")

    sb = None
    if not args.dry:
        sb = load_env("supabase.env")
        base = sb["SUPABASE_URL"].rstrip("/")
        key = sb["SUPABASE_SERVICE_KEY"]
        hdr = {"apikey": key, "Authorization": f"Bearer {key}"}

    report = []
    for i, rec in enumerate(records):
        palette = rec.get("palette") or palette_for_index(i)
        rec["palette"] = palette
        slug = slugify(rec["subject_name"])
        line = {"n": i + 1, "subject": rec["subject_name"], "palette": palette,
                "receipt": rec.get("receipt", ""), "sources": rec.get("sources", []), "status": ""}

        errors, warnings = validate(rec)
        if errors:
            line["status"] = "FLAGGED — not loaded: " + "; ".join(errors)
            report.append(line)
            print(f"[{i+1:02d}] FLAG  {rec['subject_name']}: {errors}")
            continue

        out_path = OUT_DIR / f"hardwin-{slug}.png"
        render_card(rec, palette=palette, out_path=str(out_path))

        if args.dry:
            line["status"] = f"rendered (dry) -> {out_path.name}"
            report.append(line)
            print(f"[{i+1:02d}] DRY   {rec['subject_name']}  [{palette}] -> {out_path.name}")
            continue

        filename = f"hardwin-{slug}.png"
        image_url = f"{base}/storage/v1/object/public/{BUCKET}/{filename}"
        up = requests.post(f"{base}/storage/v1/object/{BUCKET}/{filename}",
                           headers={**hdr, "Content-Type": "image/png", "x-upsert": "true"},
                           data=out_path.read_bytes())
        if not up.ok:
            line["status"] = "UPLOAD FAILED: " + up.text[:120]
            report.append(line)
            print(f"[{i+1:02d}] ERR   upload {rec['subject_name']}: {up.text[:120]}")
            continue

        if args.reupload:
            line["status"] = "image refreshed (no new row)"
            report.append(line)
            print(f"[{i+1:02d}] IMG   {rec['subject_name']}  [{palette}]  image refreshed")
            continue

        row = {k: rec.get(k) for k in DB_COLUMNS}
        row["image_url"] = image_url
        row["status"] = "pending"
        ins = requests.post(f"{base}/rest/v1/posts",
                            headers={**hdr, "Content-Type": "application/json", "Prefer": "return=representation"},
                            data=json.dumps(row, ensure_ascii=False).encode("utf-8"))
        if not ins.ok:
            line["status"] = "INSERT FAILED: " + ins.text[:120]
            report.append(line)
            print(f"[{i+1:02d}] ERR   insert {rec['subject_name']}: {ins.text[:120]}")
            continue

        rid = ins.json()[0].get("id", "?")
        line["status"] = f"LOADED pending (row #{rid})"
        report.append(line)
        print(f"[{i+1:02d}] OK    {rec['subject_name']}  [{palette}]  row #{rid}")

    # ---- batch report ----
    print("\n" + "=" * 70)
    print("BATCH REPORT")
    print("=" * 70)
    for r in report:
        print(f"\n#{r['n']:02d}  {r['subject']}   [{r['palette']}]")
        print(f"     receipt : {r['receipt']}")
        print(f"     sources : {', '.join(r['sources'])}")
        print(f"     result  : {r['status']}")
    loaded = sum(1 for r in report if r["status"].startswith("LOADED"))
    flagged = sum(1 for r in report if r["status"].startswith("FLAGGED"))
    print("\n" + "-" * 70)
    print(f"{loaded} staged as PENDING, {flagged} flagged, of {len(records)}.")
    print("HARD STOP. Nothing is approved or posted. Review in Supabase and set")
    print("status='approved' on the ones you want; the 9:15am task posts only those.")


if __name__ == "__main__":
    main()
