import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Place, PlaceId } from '../types/place';

const HISTORY_KEY = 'lunchspin:spinHistory';
const RECENT_N = 10;

export type SpinStatus = 'spun' | 'gone' | 'rejected';

export interface SpinHistoryEntry {
  id: string;
  placeId: PlaceId;
  name: string;
  cuisine?: string;
  priceLabel?: string;
  status: SpinStatus;
  /** ISO timestamp */
  at: string;
  /** Asia/Hong_Kong calendar day YYYY-MM-DD */
  day: string;
}

function todayIso(): string {
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

function entryId(placeId: PlaceId, at: string): string {
  return `${placeId}@${at}`;
}

async function readAll(): Promise<SpinHistoryEntry[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SpinHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(list: SpinHistoryEntry[]): Promise<void> {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

function cuisineLabel(place: Place): string | undefined {
  const c = (place.cuisine ?? []).find((x) => !!x?.trim());
  return c?.trim() || undefined;
}

/** 每次出結果寫入「最近」；同一輪只記一條 spun */
export async function recordSpinResult(
  place: Place,
  priceLabel?: string,
): Promise<SpinHistoryEntry> {
  const at = new Date().toISOString();
  const entry: SpinHistoryEntry = {
    id: entryId(place.placeId, at),
    placeId: place.placeId,
    name: place.name,
    cuisine: cuisineLabel(place),
    priceLabel: priceLabel || undefined,
    status: 'spun',
    at,
    day: todayIso(),
  };
  const list = await readAll();
  list.unshift(entry);
  // 保留較多日內資料以便「今日」列表，但最近顯示只取 N
  const trimmed = list.slice(0, 80);
  await writeAll(trimmed);
  return entry;
}

async function updateLatestForPlace(
  placeId: PlaceId,
  status: SpinStatus,
): Promise<void> {
  const list = await readAll();
  const day = todayIso();
  const idx = list.findIndex((e) => e.placeId === placeId && e.day === day);
  if (idx >= 0) {
    list[idx] = { ...list[idx]!, status };
    await writeAll(list);
    return;
  }
  // 冇今日紀錄都補一條
  list.unshift({
    id: entryId(placeId, new Date().toISOString()),
    placeId,
    name: placeId,
    status,
    at: new Date().toISOString(),
    day,
  });
  await writeAll(list.slice(0, 80));
}

export async function markHistoryGone(placeId: PlaceId): Promise<void> {
  await updateLatestForPlace(placeId, 'gone');
}

export async function markHistoryRejected(placeId: PlaceId): Promise<void> {
  await updateLatestForPlace(placeId, 'rejected');
}

export async function getRecentSpins(n = RECENT_N): Promise<SpinHistoryEntry[]> {
  const list = await readAll();
  return list.slice(0, n);
}

export async function getTodaySpins(): Promise<SpinHistoryEntry[]> {
  const day = todayIso();
  const list = await readAll();
  return list.filter((e) => e.day === day);
}

/** 清除今日歷史紀錄（唔清長期 reject 權重） */
export async function clearTodayHistory(): Promise<void> {
  const day = todayIso();
  const list = await readAll();
  await writeAll(list.filter((e) => e.day !== day));
}

export async function clearAllSpinHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}

export function statusLabelZh(status: SpinStatus): string {
  switch (status) {
    case 'gone':
      return '已去食';
    case 'rejected':
      return '已唔鍾意';
    default:
      return '已抽中';
  }
}
