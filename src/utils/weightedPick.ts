import type { Place, PlaceId } from '../types/place';

/**
 * w = 1 / (1 + rejectCount)^1.3
 * 純加權隨機，唔會用 AI。
 */
export function weightForRejects(rejectCount: number): number {
  const c = Math.max(0, rejectCount);
  return 1 / Math.pow(1 + c, 1.3);
}

export function weightedPick<T extends { placeId: PlaceId }>(
  items: T[],
  rejectCounts: Record<PlaceId, number>,
  rng: () => number = Math.random,
): T | null {
  if (items.length === 0) return null;

  const weights = items.map((item) =>
    weightForRejects(rejectCounts[item.placeId] ?? 0),
  );
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return items[Math.floor(rng() * items.length)] ?? null;

  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return items[i]!;
  }
  return items[items.length - 1]!;
}

/** 今日已 reject／已「去食」嘅地方唔入池 */
export function filterPool(
  places: Place[],
  todayRejects: PlaceId[],
  todayGone: PlaceId[],
): Place[] {
  const ban = new Set([...todayRejects, ...todayGone]);
  return places.filter((p) => !ban.has(p.placeId));
}

/** 轉盤顯示用：最多 12、最少 8（不足就重複填） */
export function buildWheelLabels(
  places: Place[],
  chosen: Place,
  max = 12,
): Place[] {
  const unique = [...places];
  if (!unique.find((p) => p.placeId === chosen.placeId)) {
    unique.unshift(chosen);
  }
  // 保證 chosen 喺列表
  let list = unique.slice(0, max);
  if (list.length < 8) {
    const pad: Place[] = [];
    let i = 0;
    while (list.length + pad.length < 8 && unique.length > 0) {
      pad.push(unique[i % unique.length]!);
      i++;
    }
    list = [...list, ...pad].slice(0, Math.max(8, list.length));
  }
  // 打亂，但之後會由 UI 對齊 chosen 嘅扇形
  return list.slice(0, Math.min(max, Math.max(8, list.length)));
}
