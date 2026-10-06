#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Weekly restaurant health check (0 paid API).

Reads src/data/*-restaurants.json, samples places that have google_place_id,
fetches public Google Maps HTML (search + tbm=map preload — same approach as
lunch-data/review/_cache/gmaps_lookup.py), and writes a markdown report of
closure / rating / review_count candidates for human review.

Never mutates production seed JSON.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import random
import re
import subprocess
import sys
import time
import urllib.parse
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "src" / "data"
DEFAULT_OUT = ROOT / "reports" / "restaurant-health.md"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)
SLEEP_SEC = 1.4
RATING_DELTA = 0.3
REVIEW_DELTA = 50


def curl(url: str) -> str:
    r = subprocess.run(
        [
            "curl",
            "-sL",
            "--max-time",
            "25",
            "-A",
            UA,
            "-H",
            "Accept-Language: zh-HK,zh-TW;q=0.9,en;q=0.8",
            url,
        ],
        capture_output=True,
    )
    return r.stdout.decode("utf-8", "ignore")


def dig(obj, path, default=None):
    try:
        for k in path:
            obj = obj[k]
        return obj
    except Exception:
        return default


def parse_place(p: list) -> dict:
    dump = json.dumps(p, ensure_ascii=False)
    hdump = json.dumps(dig(p, [203]), ensure_ascii=False)
    status = "open"
    closure_label = dig(p, [88, 0])
    if isinstance(closure_label, str) and (
        "歇業" in closure_label or "永久停業" in closure_label
    ):
        status = "permanently_closed"
    elif "永久停業" in hdump or "已歇業" in hdump:
        status = "permanently_closed"
    elif "暫停營業" in hdump or "暫時休業" in hdump:
        status = "temporarily_closed"
    elif "永久停業" in dump or "已歇業" in dump:
        status = "permanently_closed?"
    elif "暫停營業" in dump or "暫時休業" in dump:
        status = "temporarily_closed?"
    return {
        "name": dig(p, [11]),
        "name_alt": dig(p, [101]),
        "address": dig(p, [39]),
        "rating": dig(p, [4, 7]),
        "review_count": dig(p, [4, 8]),
        "lat": dig(p, [9, 2]),
        "lng": dig(p, [9, 3]),
        "place_id": dig(p, [78]),
        "categories": dig(p, [13]),
        "status": status,
        "closure_label": closure_label if isinstance(closure_label, str) else None,
        "status_line": dig(p, [203, 1, 4, 0]),
    }


def lookup_maps(q: str, lat: float, lng: float, zoom: int = 18) -> dict:
    murl = (
        f"https://www.google.com/maps/search/{urllib.parse.quote(q)}"
        f"/@{lat},{lng},{zoom}z?hl=zh-TW&gl=hk"
    )
    s = curl(murl)
    res = {
        "query": q,
        "maps_url": murl,
        "places": [],
        "error": None,
    }
    m = re.search(r'href="(/search\?tbm=map[^"]*)"', s)
    if not m:
        res["error"] = "blocked" if ("sorry" in s or "captcha" in s.lower()) else "no_preload"
        return res
    raw = curl("https://www.google.com" + html.unescape(m.group(1)))
    try:
        d = json.loads(raw[raw.index("\n") + 1 :])
        for it in dig(d, [0, 1]) or []:
            p = dig(it, [14])
            if p:
                res["places"].append(parse_place(p))
        for it in dig(d, [64]) or []:
            p = dig(it, [1])
            if isinstance(p, list) and len(p) > 20:
                res["places"].append(parse_place(p))
    except Exception as e:
        res["error"] = "parse:" + str(e)[:120]
    return res


def load_candidates() -> list[dict]:
    rows = []
    for path in sorted(DATA_DIR.glob("*-restaurants.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        district = data.get("district") or path.stem
        slug = path.name.replace("-restaurants.json", "")
        for bucket, items in (("kept", data.get("restaurants") or []), ("excluded", data.get("excluded") or [])):
            for r in items:
                pid = r.get("google_place_id")
                if not pid:
                    continue
                rows.append(
                    {
                        "slug": slug,
                        "district": district or r.get("district") or slug,
                        "bucket": bucket,
                        "id": r.get("id"),
                        "name_zh": r.get("name_zh"),
                        "name_en": r.get("name_en"),
                        "address": r.get("address"),
                        "lat": r.get("lat"),
                        "lng": r.get("lng"),
                        "google_place_id": pid,
                        "google_rating": r.get("google_rating"),
                        "google_review_count": r.get("google_review_count"),
                        "exclude_reason": r.get("exclude_reason"),
                        "tags": r.get("tags") or [],
                    }
                )
    return rows


def stratified_sample(rows: list[dict], limit: int, seed: int) -> list[dict]:
    """Prefer kept bucket; stratify by district slug."""
    rng = random.Random(seed)
    by_slug: dict[str, list] = defaultdict(list)
    for r in rows:
        # Prefer checking kept places (closure risk matters more there)
        if r["bucket"] == "kept":
            by_slug[r["slug"]].append(r)
    # If some districts have no kept-with-pid, fall back to excluded
    for r in rows:
        if r["bucket"] != "kept" and r["slug"] not in by_slug:
            by_slug[r["slug"]].append(r)
        elif r["bucket"] != "kept" and len(by_slug[r["slug"]]) < 2:
            by_slug[r["slug"]].append(r)

    slugs = sorted(by_slug.keys())
    if not slugs:
        return []
    # round-robin until limit
    pools = {s: by_slug[s][:] for s in slugs}
    for s in pools:
        rng.shuffle(pools[s])
    picked = []
    seen = set()
    while len(picked) < limit and any(pools.values()):
        for s in slugs:
            if len(picked) >= limit:
                break
            while pools[s]:
                cand = pools[s].pop()
                key = cand["google_place_id"]
                if key in seen:
                    continue
                seen.add(key)
                picked.append(cand)
                break
    return picked


def match_place(row: dict, places: list[dict]) -> dict | None:
    pid = row["google_place_id"]
    for p in places:
        if p.get("place_id") == pid:
            return p
    return None


def check_one(row: dict) -> dict:
    lat = row.get("lat")
    lng = row.get("lng")
    if lat is None or lng is None:
        lat, lng = 22.3, 114.17
    q = " ".join(
        x for x in [row.get("name_zh") or row.get("name_en") or "", row.get("address") or ""] if x
    ).strip() or (row.get("name_en") or row.get("id") or "restaurant")
    try:
        res = lookup_maps(q, float(lat), float(lng))
    except Exception as e:
        return {**row, "ok": False, "error": f"exception:{e}", "live": None, "flags": ["fetch_error"]}

    if res.get("error"):
        return {**row, "ok": False, "error": res["error"], "live": None, "flags": ["fetch_error"]}

    live = match_place(row, res.get("places") or [])
    if not live:
        return {
            **row,
            "ok": False,
            "error": "place_id_not_in_results",
            "live": None,
            "flags": ["no_match"],
            "n_results": len(res.get("places") or []),
        }

    flags = []
    status = live.get("status") or "open"
    if status.startswith("permanently_closed"):
        flags.append("permanently_closed")
    elif status.startswith("temporarily_closed"):
        flags.append("temporarily_closed")

    old_r = row.get("google_rating")
    new_r = live.get("rating")
    old_n = row.get("google_review_count")
    new_n = live.get("review_count")
    if old_r is not None and new_r is not None:
        try:
            if abs(float(new_r) - float(old_r)) >= RATING_DELTA:
                flags.append("rating_delta")
        except Exception:
            pass
    if old_n is not None and new_n is not None:
        try:
            if abs(int(new_n) - int(old_n)) >= REVIEW_DELTA:
                flags.append("review_count_delta")
        except Exception:
            pass

    # already-excluded closed: still report if Maps says open again (possible reopening)
    if row["bucket"] == "excluded" and status == "open":
        reason = (row.get("exclude_reason") or "").lower()
        if "closed" in reason or "已歇業" in (row.get("exclude_reason") or ""):
            flags.append("possibly_reopened")

    return {
        **row,
        "ok": True,
        "error": None,
        "live": live,
        "flags": flags,
        "maps_url": f"https://www.google.com/maps/place/?q=place_id:{row['google_place_id']}",
    }


def md_escape(s) -> str:
    return str(s if s is not None else "").replace("|", "\\|").replace("\n", " ")


def write_report(results: list[dict], out_path: Path, meta: dict) -> str:
    flagged = [r for r in results if r.get("flags")]
    errors = [r for r in results if not r.get("ok")]
    closed = [r for r in flagged if "permanently_closed" in r["flags"] or "temporarily_closed" in r["flags"]]
    rating = [r for r in flagged if "rating_delta" in r["flags"] or "review_count_delta" in r["flags"]]
    reopen = [r for r in flagged if "possibly_reopened" in r["flags"]]

    lines = []
    lines.append(f"# Restaurant health report")
    lines.append("")
    lines.append(f"- Generated (UTC): `{meta['generated_at']}`")
    lines.append(f"- Mode: `{meta['mode']}` (sample_size={meta['sample_size']}, seed={meta['seed']})")
    lines.append(f"- Checked: **{len(results)}** places with `google_place_id`")
    lines.append(f"- Flagged for review: **{len(flagged)}**")
    lines.append(f"- Fetch/parse soft-fails: **{len(errors)}**")
    lines.append(f"- Paid API calls: **0**")
    lines.append("")
    lines.append("> This report does **not** edit `src/data/*-restaurants.json`.")
    lines.append("> Human flow: researcher reviews → update `lunch-data/<district>/restaurants.json` → Apps Programmer sync into the app.")
    lines.append("")

    def section(title: str, rows: list[dict], empty: str):
        lines.append(f"## {title}")
        lines.append("")
        if not rows:
            lines.append(empty)
            lines.append("")
            return
        lines.append("| District | Bucket | Name | Seed rating | Live rating | Live status | Flags | Maps |")
        lines.append("|---|---|---|---|---|---|---|---|")
        for r in rows:
            live = r.get("live") or {}
            name = r.get("name_zh") or r.get("name_en") or r.get("id")
            seed_r = r.get("google_rating")
            seed_n = r.get("google_review_count")
            live_r = live.get("rating")
            live_n = live.get("review_count")
            seed_s = f"{seed_r}" + (f" ({seed_n})" if seed_n is not None else "")
            live_s = f"{live_r}" + (f" ({live_n})" if live_n is not None else "")
            maps = r.get("maps_url") or ""
            lines.append(
                "| {district} | {bucket} | {name} (`{id}`) | {seed} | {live} | {status} | {flags} | [link]({maps}) |".format(
                    district=md_escape(r.get("district")),
                    bucket=md_escape(r.get("bucket")),
                    name=md_escape(name),
                    id=md_escape(r.get("id")),
                    seed=md_escape(seed_s),
                    live=md_escape(live_s),
                    status=md_escape(live.get("status") or r.get("error") or "?"),
                    flags=md_escape(", ".join(r.get("flags") or [])),
                    maps=maps,
                )
            )
        lines.append("")

    section("Closure signals (kept / unexpected)", closed, "_No closure signals in this sample._")
    section("Rating / review_count deltas", rating, "_No rating/review deltas ≥ threshold in this sample._")
    section("Possibly reopened (was excluded as closed)", reopen, "_None._")
    section("Soft failures (logged & continued)", errors[:40], "_None._")

    lines.append("## Sample of clean checks")
    lines.append("")
    clean = [r for r in results if r.get("ok") and not r.get("flags")][:15]
    if not clean:
        lines.append("_No clean matches._")
    else:
        lines.append("| District | Name | Seed → Live | Status |")
        lines.append("|---|---|---|---|")
        for r in clean:
            live = r["live"]
            name = r.get("name_zh") or r.get("name_en") or r.get("id")
            lines.append(
                f"| {md_escape(r.get('district'))} | {md_escape(name)} | "
                f"{md_escape(r.get('google_rating'))} → {md_escape(live.get('rating'))} | "
                f"{md_escape(live.get('status'))} |"
            )
    lines.append("")
    lines.append("## Limitations")
    lines.append("")
    lines.append("- Google Maps HTML / `tbm=map` preload shape changes without notice; scrapers fail soft.")
    lines.append("- Captcha / sorry pages → `blocked`; place may be skipped until next run.")
    lines.append("- Name+address search must return the same `google_place_id`; otherwise `no_match`.")
    lines.append("- `review_count` is sometimes null in public payloads.")
    lines.append("- Rate-limited (~1.4s between places); sample mode keeps Actions minutes sane.")
    lines.append("")

    text = "\n".join(lines)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(text, encoding="utf-8")
    return text


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--full", action="store_true", help="Larger run (still capped).")
    ap.add_argument("--limit", type=int, default=0, help="Override sample size.")
    ap.add_argument("--seed", type=int, default=20261007)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--sleep", type=float, default=SLEEP_SEC)
    args = ap.parse_args()

    if args.limit > 0:
        limit = args.limit
        mode = "custom"
    elif args.full:
        limit = 120  # hard cap for Actions minutes
        mode = "full"
    else:
        limit = 40
        mode = "sample"

    all_rows = load_candidates()
    sample = stratified_sample(all_rows, limit=limit, seed=args.seed)
    print(f"candidates_with_place_id={len(all_rows)} sample={len(sample)} mode={mode}", flush=True)

    results = []
    for i, row in enumerate(sample, 1):
        print(
            f"[{i}/{len(sample)}] {row['slug']} {row['bucket']} {row.get('name_zh') or row.get('id')}",
            flush=True,
        )
        results.append(check_one(row))
        if i < len(sample):
            time.sleep(max(0.2, args.sleep))

    meta = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "mode": mode,
        "sample_size": len(sample),
        "seed": args.seed,
        "universe": len(all_rows),
    }
    text = write_report(results, args.out, meta)
    # machine-readable sidecar for CI
    side = args.out.with_suffix(".json")
    side.write_text(
        json.dumps(
            {
                "meta": meta,
                "results": [
                    {
                        "id": r.get("id"),
                        "slug": r.get("slug"),
                        "bucket": r.get("bucket"),
                        "flags": r.get("flags"),
                        "ok": r.get("ok"),
                        "error": r.get("error"),
                        "live_status": (r.get("live") or {}).get("status"),
                        "live_rating": (r.get("live") or {}).get("rating"),
                        "live_review_count": (r.get("live") or {}).get("review_count"),
                    }
                    for r in results
                ],
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    flagged_n = sum(1 for r in results if r.get("flags"))
    print(f"Wrote {args.out} and {side}; flagged={flagged_n}", flush=True)
    # Exit 0 always — soft fails are expected; CI opens issue from report.
    return 0


if __name__ == "__main__":
    sys.exit(main())
