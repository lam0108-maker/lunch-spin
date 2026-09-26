import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PlaceId, RejectRecord } from '../types/place';

const REJECTS_KEY = 'lunchspin:rejects';
const TODAY_GONE_KEY = 'lunchspin:todayGone';
const TODAY_REJECTS_KEY = 'lunchspin:todayRejects';
const DAY_KEY = 'lunchspin:day';

function todayIso(): string {
  // Asia/Hong_Kong calendar day
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
}

async function rollDayIfNeeded(): Promise<void> {
  const day = todayIso();
  const stored = await AsyncStorage.getItem(DAY_KEY);
  if (stored !== day) {
    await AsyncStorage.multiSet([
      [DAY_KEY, day],
      [TODAY_GONE_KEY, JSON.stringify([])],
      [TODAY_REJECTS_KEY, JSON.stringify([])],
    ]);
  }
}

export async function getRejectMap(): Promise<Record<PlaceId, RejectRecord>> {
  await rollDayIfNeeded();
  const raw = await AsyncStorage.getItem(REJECTS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<PlaceId, RejectRecord>;
  } catch {
    return {};
  }
}

export async function getRejectCount(placeId: PlaceId): Promise<number> {
  const map = await getRejectMap();
  return map[placeId]?.count ?? 0;
}

export async function incrementReject(placeId: PlaceId): Promise<number> {
  await rollDayIfNeeded();
  const map = await getRejectMap();
  const prev = map[placeId]?.count ?? 0;
  const next = prev + 1;
  map[placeId] = {
    placeId,
    count: next,
    lastRejectDate: todayIso(),
  };
  await AsyncStorage.setItem(REJECTS_KEY, JSON.stringify(map));

  const todayRejects = await getTodayRejects();
  if (!todayRejects.includes(placeId)) {
    todayRejects.push(placeId);
    await AsyncStorage.setItem(TODAY_REJECTS_KEY, JSON.stringify(todayRejects));
  }
  return next;
}

export async function markGoneToday(placeId: PlaceId): Promise<void> {
  await rollDayIfNeeded();
  const list = await getTodayGone();
  if (!list.includes(placeId)) {
    list.push(placeId);
    await AsyncStorage.setItem(TODAY_GONE_KEY, JSON.stringify(list));
  }
}

export async function getTodayRejects(): Promise<PlaceId[]> {
  await rollDayIfNeeded();
  const raw = await AsyncStorage.getItem(TODAY_REJECTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PlaceId[];
  } catch {
    return [];
  }
}

export async function getTodayGone(): Promise<PlaceId[]> {
  await rollDayIfNeeded();
  const raw = await AsyncStorage.getItem(TODAY_GONE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PlaceId[];
  } catch {
    return [];
  }
}

/** 測試／除錯用 */
export async function clearAllRejectData(): Promise<void> {
  await AsyncStorage.multiRemove([
    REJECTS_KEY,
    TODAY_GONE_KEY,
    TODAY_REJECTS_KEY,
    DAY_KEY,
  ]);
}
