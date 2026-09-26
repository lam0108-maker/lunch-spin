import type { Place } from '../types/place';
import { placePriceUpperHkd } from './format';

export const PRICE_CAP_OPTIONS: { label: string; value: number | null }[] = [
  { label: '不限', value: null },
  { label: '≤$50', value: 50 },
  { label: '≤$80', value: 80 },
  { label: '≤$120', value: 120 },
  { label: '≤$200', value: 200 },
];

/** 由池抽出實際出現過嘅菜系（unique、排序） */
export function uniqueCuisinesFromPlaces(places: Place[]): string[] {
  const set = new Set<string>();
  for (const p of places) {
    for (const c of p.cuisine ?? []) {
      const t = c.trim();
      if (t) set.add(t);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
}

/**
 * 菜系多選：無選＝全部。有選＝至少命中一個選中菜系。
 * 價錢上限：null＝不限；有上限時用 placePriceUpperHkd，未知價錢則排除。
 */
export function applyPlaceFilters(
  places: Place[],
  opts: {
    cuisines: string[];
    priceCapHkd: number | null;
  },
): Place[] {
  const cuisineSet =
    opts.cuisines.length > 0 ? new Set(opts.cuisines) : null;
  return places.filter((p) => {
    if (cuisineSet) {
      const hit = (p.cuisine ?? []).some((c) => cuisineSet.has(c.trim()));
      if (!hit) return false;
    }
    if (opts.priceCapHkd != null) {
      const upper = placePriceUpperHkd(p);
      if (upper == null) return false;
      if (upper > opts.priceCapHkd) return false;
    }
    return true;
  });
}
