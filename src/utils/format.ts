export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** 粗估步行：80 m/min（約 4.8 km/h） */
export const WALK_METERS_PER_MIN = 80;

/**
 * 顯示「約 X 分鐘行路」；少過 1 分離「少過 1 分鐘」。
 */
export function formatWalkMinutes(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '';
  const mins = meters / WALK_METERS_PER_MIN;
  if (mins < 1) return '少過 1 分鐘';
  return `約 ${Math.round(mins)} 分鐘行路`;
}

/** 只回傳分鐘數字（整數），少過 1 回 0；分享文案用 */
export function walkMinutesRounded(meters: number): number {
  if (!Number.isFinite(meters) || meters < 0) return 0;
  const mins = meters / WALK_METERS_PER_MIN;
  if (mins < 1) return 0;
  return Math.round(mins);
}

/** $ symbols + 平／中／貴 for seed / Google price_level */
export function formatPriceLevel(level: number | null): string {
  if (level == null) return '';
  if (level <= 0) return '免費／平';
  const n = Math.min(4, Math.max(1, level));
  const dollars = '$'.repeat(n);
  const label = n <= 1 ? '平' : n === 2 ? '中' : '貴';
  return `${dollars} · ${label}`;
}

/** Prefer human HKD range; else price level label. Empty if unknown. */
export function formatPlacePrice(place: {
  priceLunchHkd?: string | null;
  priceLevel?: number | null;
}): string {
  const hkd = (place.priceLunchHkd ?? '').trim();
  if (hkd) {
    return hkd.startsWith('約') || hkd.startsWith('$') ? hkd : `約 ${hkd}`;
  }
  return formatPriceLevel(place.priceLevel ?? null);
}

export function formatRating(
  rating: number | null,
  count?: number | null,
): string {
  if (rating == null) return '';
  const c = count != null ? `（${count}）` : '';
  return `★ ${rating.toFixed(1)}${c}`;
}

/** Truncate lunch notes for result card (~80 chars) */
export function truncateNotes(notes: string, max = 80): string {
  const t = notes.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trimEnd()}…`;
}

/**
 * 解析 price_lunch_hkd 區間上限：
 * "60-80" → 80；"約$70" → 70；"約 $39–65" → 65；純數字 OK。
 * 搵唔到數字回 null。
 */
export function parsePriceLunchUpper(raw: string | null | undefined): number | null {
  const s = (raw ?? '').trim();
  if (!s) return null;
  const nums = s.match(/\d+/g);
  if (!nums || nums.length === 0) return null;
  const values = nums.map((n) => parseInt(n, 10)).filter((n) => Number.isFinite(n));
  if (values.length === 0) return null;
  return Math.max(...values);
}

/** price_level → 約午餐上限（HKD），篩選 fallback */
export const PRICE_LEVEL_UPPER_HKD: Record<number, number> = {
  0: 30,
  1: 50,
  2: 100,
  3: 200,
  4: 400,
};

export function estimatePriceUpperFromLevel(
  level: number | null | undefined,
): number | null {
  if (level == null || !Number.isFinite(level)) return null;
  const n = Math.round(level);
  if (n in PRICE_LEVEL_UPPER_HKD) return PRICE_LEVEL_UPPER_HKD[n]!;
  if (n < 0) return PRICE_LEVEL_UPPER_HKD[0]!;
  return PRICE_LEVEL_UPPER_HKD[4]!;
}

/** 餐廳用於價錢篩選嘅上限：優先 lunch HKD，否則 price_level */
export function placePriceUpperHkd(place: {
  priceLunchHkd?: string | null;
  priceLevel?: number | null;
}): number | null {
  const fromHkd = parsePriceLunchUpper(place.priceLunchHkd);
  if (fromHkd != null) return fromHkd;
  return estimatePriceUpperFromLevel(place.priceLevel);
}
