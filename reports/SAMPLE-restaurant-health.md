# Restaurant health report

- Generated (UTC): `2026-10-06T17:04:20Z`
- Mode: `custom` (sample_size=6, seed=42)
- Checked: **6** places with `google_place_id`
- Flagged for review: **0**
- Fetch/parse soft-fails: **0**
- Paid API calls: **0**

> This report does **not** edit `src/data/*-restaurants.json`.
> Human flow: researcher reviews → update `lunch-data/<district>/restaurants.json` → Apps Programmer sync into the app.

## Closure signals (kept / unexpected)

_No closure signals in this sample._

## Rating / review_count deltas

_No rating/review deltas ≥ threshold in this sample._

## Possibly reopened (was excluded as closed)

_None._

## Soft failures (logged & continued)

_None._

## Sample of clean checks

| District | Name | Seed → Live | Status |
|---|---|---|---|
| 中環／金鐘 | 翠亨邨 | 3.9 → 3.9 | open |
| 九龍灣 | Café MED | 3.7 → 3.7 | open |
| 觀塘 | 越泰豐（宜安街） | 3.8 → 3.8 | open |
| 旺角 | 薩莉亞意式餐廳 | 3.9 → 3.9 | open |
| 牛頭角 | 牛角Buffet（裕民坊） | 3.9 → 3.9 | open |
| 將軍澳 | 哥哥炸雞 | 4.2 → 4.2 | open |

## Limitations

- Google Maps HTML / `tbm=map` preload shape changes without notice; scrapers fail soft.
- Captcha / sorry pages → `blocked`; place may be skipped until next run.
- Name+address search must return the same `google_place_id`; otherwise `no_match`.
- `review_count` is sometimes null in public payloads.
- Rate-limited (~1.4s between places); sample mode keeps Actions minutes sane.
