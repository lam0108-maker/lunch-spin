import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DISTRICT_NAMES } from '../src/constants/districts';
import {
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from '../src/constants/theme';
import { useLunchSession } from '../src/hooks/useLunchSession';
import {
  coordsFromDistrict,
  requestWhenInUseLocation,
} from '../src/services/location';
import {
  getPlacesProvider,
  isLocalSeedEnabled,
  isMockPlacesMode,
} from '../src/services/places';
import {
  clearTodayHistory,
  getRecentSpins,
  getTodaySpins,
  statusLabelZh,
  type SpinHistoryEntry,
} from '../src/services/spinHistoryStore';
import { PRICE_CAP_OPTIONS } from '../src/utils/placeFilters';

const RADIUS_MIN = 100;
const RADIUS_MAX = 2000;

const SEED_DISTRICTS = [
  '將軍澳',
  '牛頭角',
  '觀塘',
  '九龍灣',
  '藍田',
  '油塘',
  '秀茂坪',
  '鯉魚門',
  '尖沙咀',
  '佐敦',
  '油麻地',
];

function formatRadius(m: number): string {
  if (m >= 1000) {
    const km = m / 1000;
    return Number.isInteger(km) ? `${km}km` : `${km.toFixed(1)}km`;
  }
  return `${Math.round(m)}m`;
}

function orderedDistrictChips(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const d of SEED_DISTRICTS) {
    if (DISTRICT_NAMES.includes(d) && !seen.has(d)) {
      seen.add(d);
      out.push(d);
    }
  }
  for (const d of DISTRICT_NAMES) {
    if (!seen.has(d)) {
      seen.add(d);
      out.push(d);
    }
  }
  return out;
}

export default function SetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    coords,
    radius,
    setRadius,
    setCoords,
    loadPlaces,
    loading,
    error,
    isMock,
    places,
    rawPlaces,
    availableCuisines,
    filterCuisines,
    priceCapHkd,
    setPriceCapHkd,
    toggleFilterCuisine,
    setFilterCuisines,
    spinCount,
    setSpinCount,
  } = useLunchSession();

  const [locBusy, setLocBusy] = useState(false);
  const [locMsg, setLocMsg] = useState(
    '可地圖揀位／揀地區／或開 GPS——唔逼開定位。',
  );
  const [district, setDistrict] = useState('將軍澳');
  const [manualError, setManualError] = useState<string | null>(null);
  // 篩選預設展開；今日／最近仍預設摺
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [todayHistory, setTodayHistory] = useState<SpinHistoryEntry[]>([]);
  const [recentHistory, setRecentHistory] = useState<SpinHistoryEntry[]>([]);
  const [historyBusy, setHistoryBusy] = useState(false);

  const chipList = useMemo(() => orderedDistrictChips(), []);
  const localSeedOn = isLocalSeedEnabled();
  const provider = getPlacesProvider();

  const refreshHistory = useCallback(async () => {
    try {
      const [today, recent] = await Promise.all([
        getTodaySpins(),
        getRecentSpins(10),
      ]);
      setTodayHistory(today);
      setRecentHistory(recent);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  const requestExactLocation = useCallback(async () => {
    setLocBusy(true);
    setManualError(null);
    setLocMsg('正請求精確位置…');
    const res = await requestWhenInUseLocation();
    setLocBusy(false);
    if (res.ok) {
      setCoords(res.coords);
      setLocMsg('已取得你嘅精確位置（GPS）');
    } else {
      setLocMsg(res.message);
    }
  }, [setCoords]);

  useEffect(() => {
    // no auto request on web-friendly flow
  }, []);

  useEffect(() => {
    if (!coords) return;
    if (coords.label === '地圖揀位' && !coords.isFallback) {
      setLocMsg('已用地圖揀位（非 GPS）');
      setManualError(null);
    }
  }, [coords]);

  // 展開篩選又未有池 → 自動載入，方便出菜系 chips
  useEffect(() => {
    if (filtersOpen && coords && rawPlaces.length === 0 && !loading) {
      void loadPlaces();
    }
  }, [filtersOpen, coords, rawPlaces.length, loading, loadPlaces]);

  const applyDistrict = () => {
    const res = coordsFromDistrict(district);
    if (!res.ok) {
      setManualError(res.message);
      return;
    }
    setManualError(null);
    setCoords(res.coords);
    setLocMsg(`已用「${res.coords.label}」地區中心（非精確 GPS）`);
  };

  const [pendingNav, setPendingNav] = useState(false);
  useEffect(() => {
    if (pendingNav && !loading && places.length > 0) {
      setPendingNav(false);
      router.push('/wheel');
    }
    if (pendingNav && !loading && places.length === 0) {
      setPendingNav(false);
    }
  }, [pendingNav, loading, places, router]);

  const start = async () => {
    if (!coords) {
      setManualError('請先喺地圖揀位、揀地區，或開 GPS');
      return;
    }
    setPendingNav(true);
    const filtered = await loadPlaces();
    if (filtered.length === 0) {
      setPendingNav(false);
    }
  };

  const onClearToday = async () => {
    setHistoryBusy(true);
    await clearTodayHistory();
    await refreshHistory();
    setHistoryBusy(false);
  };

  const hasExact = !!coords && !coords.isFallback;
  const filterSummaryParts: string[] = [];
  if (filterCuisines.length > 0) {
    filterSummaryParts.push(`菜系 ${filterCuisines.length}`);
  }
  if (priceCapHkd != null) {
    filterSummaryParts.push(`≤$${priceCapHkd}`);
  }
  const filterSummary =
    filterSummaryParts.length > 0
      ? filterSummaryParts.join(' · ')
      : '未設篩選';

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroBlock}>
          <Text style={styles.hero}>今日食咩好？</Text>
          <Text style={styles.sub}>
            附近餐廳抽獎 · 將軍澳／九龍東／尖沙咀／佐敦／油麻地本地庫優先
          </Text>
        </View>

        {provider === 'osm' && !localSeedOn && (
          <Text style={styles.captionNote}>
            附近搜尋使用 OpenStreetMap。「帶我去」仍開 Google Maps。
          </Text>
        )}
        {provider === 'osm' && localSeedOn && (
          <Text style={styles.captionFooter}>
            本地庫優先 · OpenStreetMap 作後備
          </Text>
        )}
        {isMockPlacesMode() && (
          <View style={styles.bannerQuiet}>
            <Text style={styles.bannerQuietText}>演示模式：模擬餐廳資料</Text>
          </View>
        )}
        {provider !== 'mock' && isMock && places.length > 0 && (
          <View style={styles.bannerQuiet}>
            <Text style={styles.bannerQuietText}>
              網路暫時失敗，而家用模擬資料。可稍後再試。
            </Text>
          </View>
        )}

        <View style={[styles.card, shadows.card]}>
          <Text style={styles.label}>位置</Text>
          {locBusy ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.body}>{locMsg}</Text>
          )}
          {hasExact && (
            <Text style={styles.exact}>
              {coords!.label === '地圖揀位' ? '地圖座標' : '精確座標'}{' '}
              {coords!.latitude.toFixed(5)}, {coords!.longitude.toFixed(5)}
            </Text>
          )}
          {coords?.isFallback && (
            <Text style={styles.muted}>
              而家用地區中心：{coords.label ?? '手動'}（非 GPS）
            </Text>
          )}

          <Text style={styles.optionHint}>推薦</Text>
          <Pressable
            style={[styles.mapBtn, shadows.elevated]}
            onPress={() => {
              if (coords != null) {
                router.push({
                  pathname: '/pick-location',
                  params: {
                    lat: String(coords.latitude),
                    lng: String(coords.longitude),
                  },
                });
              } else {
                router.push('/pick-location');
              }
            }}
          >
            <Text style={styles.mapBtnText}>喺地圖揀位置</Text>
          </Pressable>

          <Pressable
            style={[styles.gpsBtn, locBusy && styles.disabled]}
            disabled={locBusy}
            onPress={() => void requestExactLocation()}
          >
            <Text style={styles.gpsBtnText}>
              {hasExact ? '重新取得精確位置' : '使用精確位置（GPS）'}
            </Text>
          </Pressable>

          <View style={styles.manual}>
            <Text style={styles.backupLabel}>後備：揀地區</Text>
            <TextInput
              style={styles.input}
              value={district}
              onChangeText={setDistrict}
              placeholder="例如：將軍澳"
              placeholderTextColor={colors.textMuted}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chips}
              contentContainerStyle={styles.districtChipRow}
            >
              {chipList.map((d) => {
                const selected = d === district;
                return (
                  <Pressable
                    key={d}
                    style={[styles.chipCompact, selected && styles.chipSelected]}
                    onPress={() => setDistrict(d)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipSelectedText,
                      ]}
                    >
                      {d}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.textActionBtn} onPress={applyDistrict}>
              <Text style={styles.textActionBtnText}>用呢個地區</Text>
            </Pressable>
            {manualError && <Text style={styles.error}>{manualError}</Text>}
          </View>
        </View>

        <View style={[styles.card, shadows.card]}>
          <View style={styles.radiusHeader}>
            <Text style={styles.label}>搜尋半徑</Text>
            <Text style={styles.radiusValue}>{formatRadius(radius)}</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={RADIUS_MIN}
            maximumValue={RADIUS_MAX}
            step={100}
            value={radius}
            onValueChange={(v: number) => setRadius(Math.round(v))}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
          />
          <View style={styles.radiusEnds}>
            <Text style={styles.muted}>100m</Text>
            <Text style={styles.muted}>2km</Text>
          </View>
        </View>

        <View style={[styles.card, shadows.card]}>
          <Pressable
            style={styles.foldHeader}
            onPress={() => setFiltersOpen((v) => !v)}
          >
            <View style={styles.foldHeaderText}>
              <Text style={styles.label}>篩選</Text>
              <Text style={styles.muted}>{filterSummary}</Text>
            </View>
            <Text style={styles.foldChevron}>{filtersOpen ? '收起' : '展開'}</Text>
          </Pressable>

          {filtersOpen && (
            <View style={styles.filterBody}>
              <Text style={styles.filterLabel}>菜系（多選，無選＝全部）</Text>
              {!coords ? (
                <Text style={styles.muted}>請先揀位置，再載入菜系。</Text>
              ) : loading && availableCuisines.length === 0 ? (
                <ActivityIndicator color={colors.primary} />
              ) : availableCuisines.length === 0 ? (
                <Text style={styles.muted}>
                  未有餐廳池。可撳下方「更新餐廳池」或直接開始抽。
                </Text>
              ) : (
                <View style={styles.chipWrap}>
                  {availableCuisines.map((c) => {
                    const selected = filterCuisines.includes(c);
                    return (
                      <Pressable
                        key={c}
                        style={[
                          styles.chipCompact,
                          selected && styles.chipSelected,
                        ]}
                        onPress={() => toggleFilterCuisine(c)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selected && styles.chipSelectedText,
                          ]}
                        >
                          {c}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
              {filterCuisines.length > 0 && (
                <Pressable onPress={() => setFilterCuisines([])} hitSlop={8}>
                  <Text style={styles.linkBtn}>清除菜系</Text>
                </Pressable>
              )}

              <Text style={[styles.filterLabel, styles.filterLabelSpaced]}>
                價錢上限（午餐）
              </Text>
              <View style={styles.priceRow}>
                {PRICE_CAP_OPTIONS.map((opt) => {
                  const selected = priceCapHkd === opt.value;
                  return (
                    <Pressable
                      key={opt.label}
                      style={[
                        styles.priceChip,
                        selected && styles.chipSelected,
                      ]}
                      onPress={() => setPriceCapHkd(opt.value)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selected && styles.chipSelectedText,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {coords && (
                <Pressable
                  style={[styles.outlineBtn, loading && styles.disabled]}
                  disabled={loading}
                  onPress={() => void loadPlaces()}
                >
                  <Text style={styles.outlineBtnText}>
                    {loading ? '載入中…' : '更新餐廳池'}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        <View style={[styles.card, shadows.card]}>
          <Pressable
            style={styles.foldHeader}
            onPress={() => {
              setHistoryOpen((v) => !v);
              void refreshHistory();
            }}
          >
            <View style={styles.foldHeaderText}>
              <Text style={styles.label}>今日／最近</Text>
              <Text style={styles.muted}>
                今日 {todayHistory.length} · 最近 {recentHistory.length}
              </Text>
            </View>
            <Text style={styles.foldChevron}>
              {historyOpen ? '收起' : '展開'}
            </Text>
          </Pressable>
          {historyOpen && (
            <View style={styles.filterBody}>
              <Text style={styles.filterLabel}>今日</Text>
              {todayHistory.length === 0 ? (
                <Text style={styles.muted}>今日未有抽獎紀錄</Text>
              ) : (
                todayHistory.map((e) => (
                  <Text key={e.id} style={styles.historyLine}>
                    {e.name}
                    {e.cuisine ? ` · ${e.cuisine}` : ''}
                    {' · '}
                    {statusLabelZh(e.status)}
                  </Text>
                ))
              )}
              <Text style={[styles.filterLabel, styles.filterLabelSpaced]}>
                最近 10 次
              </Text>
              {recentHistory.length === 0 ? (
                <Text style={styles.muted}>未有最近結果</Text>
              ) : (
                recentHistory.map((e) => (
                  <Text key={e.id} style={styles.historyLine}>
                    {e.name}
                    {e.cuisine ? ` · ${e.cuisine}` : ''}
                    {' · '}
                    {statusLabelZh(e.status)}
                  </Text>
                ))
              )}
              {todayHistory.length > 0 && (
                <Pressable
                  style={[styles.outlineBtn, historyBusy && styles.disabled]}
                  disabled={historyBusy}
                  onPress={() => void onClearToday()}
                >
                  <Text style={styles.outlineBtnText}>清除今日記錄</Text>
                </Pressable>
              )}
              <Text style={styles.captionNote}>
                「去食」過嘅店今日唔會再入抽獎池。清除今日記錄只清顯示用歷史，唔會還原已去食／唔鍾意排除。
              </Text>
            </View>
          )}
        </View>

        {rawPlaces.length > 0 && (
          <Text style={styles.poolHint}>
            附近 {rawPlaces.length} 間
            {places.length !== rawPlaces.length
              ? ` → 篩選後 ${places.length} 間`
              : ''}
            （名單最多顯示約 24 間方便睇，實際從成個池抽）
          </Text>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View
        style={[
          styles.stickyBar,
          shadows.sticky,
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <View style={styles.spinCountRow}>
          <Text style={styles.spinCountLabel}>抽幾間：</Text>
          {([1, 2, 3] as const).map((n) => {
            const selected = spinCount === n;
            return (
              <Pressable
                key={n}
                style={[
                  styles.spinCountChip,
                  selected && styles.spinCountChipSelected,
                ]}
                onPress={() => setSpinCount(n)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`抽 ${n} 間`}
              >
                <Text
                  style={[
                    styles.spinCountChipText,
                    selected && styles.spinCountChipTextSelected,
                  ]}
                >
                  {n}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          style={[
            styles.primaryBtn,
            shadows.elevated,
            (!coords || loading) && styles.disabled,
          ]}
          disabled={!coords || loading}
          onPress={start}
        >
          {loading ? (
            <ActivityIndicator color={colors.textOnPrimary} />
          ) : (
            <Text style={styles.primaryBtnText}>
              {spinCount === 1 ? '開始抽Lunch' : `開始抽 ${spinCount} 間`}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl + spacing.xxl,
    gap: spacing.section,
  },
  heroBlock: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  hero: {
    ...typography.hero,
    color: colors.text,
  },
  sub: {
    ...typography.subtitle,
    color: colors.textMuted,
    fontWeight: '500',
  },
  captionNote: {
    ...typography.caption,
    color: colors.textMuted,
  },
  captionFooter: {
    ...typography.caption,
    color: colors.textSubtle,
  },
  bannerQuiet: {
    backgroundColor: colors.warnBg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  bannerQuietText: {
    color: colors.warn,
    fontSize: 12,
    lineHeight: 17,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.text,
  },
  optionHint: {
    ...typography.helper,
    color: colors.primary,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  backupLabel: {
    ...typography.helper,
    fontWeight: '700',
    color: colors.textMuted,
  },
  body: {
    ...typography.bodySmall,
    color: colors.text,
  },
  exact: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.success,
    fontWeight: '700',
  },
  muted: {
    ...typography.caption,
    color: colors.textMuted,
  },
  /** 主 CTA：地圖揀位 */
  mapBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  mapBtnText: {
    color: colors.textOnPrimary,
    fontWeight: '800',
    fontSize: 16,
    lineHeight: 20,
  },
  /** 次要：GPS outline，較細 */
  gpsBtn: {
    backgroundColor: 'transparent',
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  gpsBtnText: {
    color: colors.secondary,
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 18,
  },
  manual: {
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  chips: { flexGrow: 0 },
  districtChipRow: {
    gap: spacing.chipGap,
    paddingVertical: 2,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.chipGap,
  },
  chipCompact: {
    backgroundColor: colors.chipBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.chipSelected,
    borderColor: colors.primaryDark,
  },
  chipText: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.text,
    fontWeight: '600',
  },
  chipSelectedText: {
    color: colors.chipSelectedText,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.chipGap,
  },
  priceChip: {
    backgroundColor: colors.chipBg,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  /** 文字級次要動作：「用呢個地區」 */
  textActionBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  textActionBtnText: {
    ...typography.buttonSm,
    color: colors.secondary,
  },
  radiusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  radiusValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  slider: { width: '100%', height: 36 },
  radiusEnds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  foldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foldHeaderText: {
    flex: 1,
    gap: 2,
    paddingRight: spacing.sm,
  },
  foldChevron: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  filterBody: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  filterLabel: {
    ...typography.helper,
    fontWeight: '700',
    color: colors.text,
  },
  filterLabelSpaced: {
    marginTop: spacing.xs,
  },
  linkBtn: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
  },
  historyLine: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  outlineBtn: {
    backgroundColor: 'transparent',
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  outlineBtnText: {
    color: colors.secondary,
    fontWeight: '600',
    fontSize: 14,
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 2,
    backgroundColor: colors.stickyBar,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  spinCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.chipGap,
  },
  spinCountLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginRight: spacing.xs,
  },
  spinCountChip: {
    minWidth: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  spinCountChipSelected: {
    backgroundColor: colors.chipSelected,
    borderColor: colors.primaryDark,
  },
  spinCountChipText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  spinCountChipTextSelected: {
    color: colors.chipSelectedText,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: colors.textOnPrimary,
    ...typography.button,
    fontSize: 18,
  },
  disabled: { opacity: 0.5 },
  poolHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  error: { color: colors.danger, fontSize: 13, lineHeight: 18 },
});
