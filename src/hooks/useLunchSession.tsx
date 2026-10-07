import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Place, PlaceId, RadiusMeters, UserCoords } from '../types/place';
import {
  addToBlacklist,
  getBlacklist,
  getBlacklistIds,
  getRejectMap,
  getTodayGone,
  getTodayRejects,
  incrementReject,
  markGoneToday,
  removeFromBlacklist,
  clearBlacklist,
  type BlacklistEntry,
} from '../services/rejectStore';
import {
  markHistoryGone,
  markHistoryRejected,
  recordSpinResult,
} from '../services/spinHistoryStore';
import { getMoreSurprise, setMoreSurprise as persistMoreSurprise } from '../services/prefsStore';
import { fetchNearbyRestaurants } from '../services/places';
import { applyPlaceFilters, uniqueCuisinesFromPlaces } from '../utils/placeFilters';
import { formatPlacePrice } from '../utils/format';
import { filterPool, weightedPickN } from '../utils/weightedPick';

export type SpinCount = 1 | 2 | 3;

interface LunchSessionValue {
  coords: UserCoords | null;
  radius: RadiusMeters;
  /** 篩選後、用嚟抽獎嘅池 */
  places: Place[];
  /** 未篩選嘅原始附近池（菜系 chips 來源） */
  rawPlaces: Place[];
  availableCuisines: string[];
  filterCuisines: string[];
  priceCapHkd: number | null;
  isMock: boolean;
  loading: boolean;
  error: string | null;
  /** 一次抽幾間（1–3），預設 1 */
  spinCount: SpinCount;
  /** 今次全部結果；單抽時 length === 1 */
  lastPicks: Place[];
  /** 主結果＝lastPicks[0]，畀 NameReel／wheel 用 */
  lastPick: Place | null;
  wheelPlaces: Place[];
  moreSurprise: boolean;
  blacklist: BlacklistEntry[];
  setRadius: (r: RadiusMeters) => void;
  setCoords: (c: UserCoords) => void;
  setFilterCuisines: (c: string[]) => void;
  setPriceCapHkd: (v: number | null) => void;
  setSpinCount: (n: SpinCount) => void;
  setMoreSurprise: (on: boolean) => Promise<void>;
  toggleFilterCuisine: (c: string) => void;
  loadPlaces: () => Promise<Place[]>;
  spin: () => Promise<Place | null>;
  rejectLast: () => Promise<void>;
  confirmGone: () => Promise<void>;
  /** 只剔走單一間（今日） */
  skipPlaceToday: (placeId: PlaceId) => Promise<void>;
  blacklistPlace: (place: Place) => Promise<void>;
  unblacklistPlace: (placeId: PlaceId) => Promise<void>;
  clearAllBlacklist: () => Promise<void>;
  refreshBlacklist: () => Promise<void>;
  clearError: () => void;
}

const Ctx = createContext<LunchSessionValue | null>(null);

function applyFiltersToRaw(
  raw: Place[],
  filterCuisines: string[],
  priceCapHkd: number | null,
): Place[] {
  return applyPlaceFilters(raw, {
    cuisines: filterCuisines,
    priceCapHkd,
  });
}

export function LunchSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [coords, setCoords] = useState<UserCoords | null>(null);
  const [radius, setRadius] = useState<RadiusMeters>(1000);
  const [rawPlaces, setRawPlaces] = useState<Place[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [filterCuisines, setFilterCuisines] = useState<string[]>([]);
  const [priceCapHkd, setPriceCapHkd] = useState<number | null>(null);
  const [isMock, setIsMock] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spinCount, setSpinCount] = useState<SpinCount>(1);
  const [lastPicks, setLastPicks] = useState<Place[]>([]);
  const [lastPick, setLastPick] = useState<Place | null>(null);
  const [wheelPlaces, setWheelPlaces] = useState<Place[]>([]);
  const [moreSurprise, setMoreSurpriseState] = useState(false);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);

  const availableCuisines = useMemo(
    () => uniqueCuisinesFromPlaces(rawPlaces),
    [rawPlaces],
  );

  const refreshBlacklist = useCallback(async () => {
    try {
      setBlacklist(await getBlacklist());
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        setMoreSurpriseState(await getMoreSurprise());
      } catch {
        // ignore
      }
      await refreshBlacklist();
    })();
  }, [refreshBlacklist]);

  const setMoreSurprise = useCallback(async (on: boolean) => {
    setMoreSurpriseState(on);
    try {
      await persistMoreSurprise(on);
    } catch {
      // ignore
    }
  }, []);

  const reapplyFilters = useCallback(
    (raw: Place[], cuisines: string[], cap: number | null) => {
      const filtered = applyFiltersToRaw(raw, cuisines, cap);
      setPlaces(filtered);
      return filtered;
    },
    [],
  );

  const setFilterCuisinesAndReapply = useCallback(
    (c: string[]) => {
      setFilterCuisines(c);
      if (rawPlaces.length > 0) {
        reapplyFilters(rawPlaces, c, priceCapHkd);
      }
    },
    [rawPlaces, priceCapHkd, reapplyFilters],
  );

  const setPriceCapAndReapply = useCallback(
    (v: number | null) => {
      setPriceCapHkd(v);
      if (rawPlaces.length > 0) {
        reapplyFilters(rawPlaces, filterCuisines, v);
      }
    },
    [rawPlaces, filterCuisines, reapplyFilters],
  );

  const toggleFilterCuisine = useCallback(
    (cuisine: string) => {
      setFilterCuisines((prev) => {
        const next = prev.includes(cuisine)
          ? prev.filter((x) => x !== cuisine)
          : [...prev, cuisine];
        if (rawPlaces.length > 0) {
          setPlaces(applyFiltersToRaw(rawPlaces, next, priceCapHkd));
        }
        return next;
      });
    },
    [rawPlaces, priceCapHkd],
  );

  const loadPlaces = useCallback(async (): Promise<Place[]> => {
    if (!coords) {
      setError('未有位置');
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const { places: list, mock } = await fetchNearbyRestaurants(
        coords,
        radius,
      );
      setRawPlaces(list);
      setIsMock(mock);
      const filtered = applyFiltersToRaw(list, filterCuisines, priceCapHkd);
      setPlaces(filtered);

      if (list.length === 0) {
        setError('附近搵唔到餐廳，試吓加大範圍。');
        return [];
      }
      if (filtered.length === 0) {
        setError(
          '篩選後冇餐廳符合，試吓取消菜系或放寬價錢上限，唔好入抽獎。',
        );
        return [];
      }
      return filtered;
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入餐廳失敗');
      return [];
    } finally {
      setLoading(false);
    }
  }, [coords, radius, filterCuisines, priceCapHkd]);

  const spin = useCallback(async (): Promise<Place | null> => {
    const [rejectMap, todayRejects, todayGone, blacklistIds] =
      await Promise.all([
        getRejectMap(),
        getTodayRejects(),
        getTodayGone(),
        getBlacklistIds(),
      ]);
    const pool = filterPool(places, todayRejects, todayGone, blacklistIds);
    if (pool.length === 0) {
      setError('今日附近餐廳都抽過／唔鍾意晒喇，試吓加大範圍或換地區。');
      return null;
    }
    const counts: Record<string, number> = {};
    for (const p of pool) {
      counts[p.placeId] = rejectMap[p.placeId]?.count ?? 0;
    }
    const n = Math.min(spinCount, pool.length);
    const chosenList = weightedPickN(pool, counts, n, Math.random, {
      moreSurprise,
    });
    if (chosenList.length === 0) {
      setError('抽獎失敗');
      return null;
    }
    const chosen = chosenList[0]!;
    // reel 展示用：池內最多 24 個；確保全部抽中結果都喺名單（multi-slot 落地）
    const forWheel = pool.slice(0, 24);
    for (const pick of [...chosenList].reverse()) {
      if (!forWheel.find((p) => p.placeId === pick.placeId)) {
        forWheel.unshift(pick);
      }
    }
    if (forWheel.length > 24) forWheel.length = 24;
    // 不足 12 就循環填
    while (forWheel.length < 12 && pool.length > 0) {
      forWheel.push(pool[forWheel.length % pool.length]!);
    }
    setWheelPlaces(forWheel);
    setLastPicks(chosenList);
    setLastPick(chosen);
    setError(null);
    try {
      for (const p of chosenList) {
        await recordSpinResult(p, formatPlacePrice(p) || undefined);
      }
    } catch {
      // 歷史寫入失敗唔阻抽獎
    }
    return chosen;
  }, [places, spinCount, moreSurprise]);

  const rejectLast = useCallback(async () => {
    const targets = lastPicks.length > 0 ? lastPicks : lastPick ? [lastPick] : [];
    if (targets.length === 0) return;
    for (const p of targets) {
      await incrementReject(p.placeId);
      try {
        await markHistoryRejected(p.placeId);
      } catch {
        // ignore
      }
    }
  }, [lastPicks, lastPick]);

  const confirmGone = useCallback(async () => {
    const targets = lastPicks.length > 0 ? lastPicks : lastPick ? [lastPick] : [];
    if (targets.length === 0) return;
    for (const p of targets) {
      await markGoneToday(p.placeId);
      try {
        await markHistoryGone(p.placeId);
      } catch {
        // ignore
      }
    }
  }, [lastPicks, lastPick]);

  const skipPlaceToday = useCallback(async (placeId: PlaceId) => {
    await markGoneToday(placeId);
    try {
      await markHistoryGone(placeId);
    } catch {
      // ignore
    }
    setLastPicks((prev) => {
      const next = prev.filter((p) => p.placeId !== placeId);
      setLastPick(next[0] ?? null);
      return next;
    });
  }, []);

  const blacklistPlace = useCallback(
    async (place: Place) => {
      await addToBlacklist(place.placeId, place.name);
      await refreshBlacklist();
      setLastPicks((prev) => {
        const next = prev.filter((p) => p.placeId !== place.placeId);
        setLastPick(next[0] ?? null);
        return next;
      });
    },
    [refreshBlacklist],
  );

  const unblacklistPlace = useCallback(
    async (placeId: PlaceId) => {
      await removeFromBlacklist(placeId);
      await refreshBlacklist();
    },
    [refreshBlacklist],
  );

  const clearAllBlacklist = useCallback(async () => {
    await clearBlacklist();
    await refreshBlacklist();
  }, [refreshBlacklist]);

  const value = useMemo(
    () => ({
      coords,
      radius,
      places,
      rawPlaces,
      availableCuisines,
      filterCuisines,
      priceCapHkd,
      isMock,
      loading,
      error,
      spinCount,
      lastPicks,
      lastPick,
      wheelPlaces,
      moreSurprise,
      blacklist,
      setRadius,
      setCoords,
      setFilterCuisines: setFilterCuisinesAndReapply,
      setPriceCapHkd: setPriceCapAndReapply,
      setSpinCount,
      setMoreSurprise,
      toggleFilterCuisine,
      loadPlaces,
      spin,
      rejectLast,
      confirmGone,
      skipPlaceToday,
      blacklistPlace,
      unblacklistPlace,
      clearAllBlacklist,
      refreshBlacklist,
      clearError: () => setError(null),
    }),
    [
      coords,
      radius,
      places,
      rawPlaces,
      availableCuisines,
      filterCuisines,
      priceCapHkd,
      isMock,
      loading,
      error,
      spinCount,
      lastPicks,
      lastPick,
      wheelPlaces,
      moreSurprise,
      blacklist,
      setFilterCuisinesAndReapply,
      setPriceCapAndReapply,
      setMoreSurprise,
      toggleFilterCuisine,
      loadPlaces,
      spin,
      rejectLast,
      confirmGone,
      skipPlaceToday,
      blacklistPlace,
      unblacklistPlace,
      clearAllBlacklist,
      refreshBlacklist,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLunchSession(): LunchSessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLunchSession 必須喺 LunchSessionProvider 內');
  return v;
}
