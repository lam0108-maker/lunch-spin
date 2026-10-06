#!/usr/bin/env bash
# Copy curated seed JSON into public/admin/data/ so GitHub Pages can serve
# them same-origin (no CORS). Run before `npx expo export -p web`.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/src/data"
DEST="$ROOT/public/admin/data"
mkdir -p "$DEST"

python3 - <<PY
import glob, json, os, shutil
src = "${SRC}"
dest = "${DEST}"
os.makedirs(dest, exist_ok=True)
# wipe prior copies so removed districts disappear
for old in glob.glob(os.path.join(dest, "*-restaurants.json")):
    os.remove(old)
manifest = []
for f in sorted(glob.glob(os.path.join(src, "*-restaurants.json"))):
    base = os.path.basename(f)
    shutil.copy2(f, os.path.join(dest, base))
    d = json.load(open(f, encoding="utf-8"))
    kept = len(d.get("restaurants") or [])
    excl = len(d.get("excluded") or [])
    slug = base.replace("-restaurants.json", "")
    manifest.append({
        "slug": slug,
        "file": base,
        "district": d.get("district") or slug,
        "version": d.get("version"),
        "updated_at": d.get("updated_at"),
        "kept": kept,
        "excluded": excl,
    })
    print(f"  {base}: kept={kept} excluded={excl}")
out = {
    "generated_note": "synced from src/data/*-restaurants.json via scripts/sync-admin-data.sh",
    "districts": manifest,
}
with open(os.path.join(dest, "manifest.json"), "w", encoding="utf-8") as fh:
    json.dump(out, fh, ensure_ascii=False, indent=2)
print(f"Wrote manifest ({len(manifest)} districts) → {dest}/manifest.json")
PY
