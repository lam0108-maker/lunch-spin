import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from '../src/constants/theme';
import { useLunchSession } from '../src/hooks/useLunchSession';
import { mapsUrlForPlace } from '../src/services/places';
import type { Place } from '../src/types/place';
import {
  formatDistance,
  formatPlacePrice,
  formatRating,
  formatWalkMinutes,
  truncateNotes,
} from '../src/utils/format';
import { shareLunchResult } from '../src/utils/shareResult';
import {
  sanitizeLunchNotes,
  userFacingTags,
} from '../src/utils/displayLabels';

const NOTES_PREVIEW = 80;

function hasValidDistance(meters: number | null | undefined): boolean {
  return Number.isFinite(meters) && (meters as number) >= 0;
}

function placeTagPills(place: Place): string[] {
  const out: string[] = [];
  for (const c of place.cuisine ?? []) {
    if (c && !out.includes(c)) out.push(c);
  }
  for (const t of userFacingTags(place.tags)) {
    if (t && !out.includes(t)) out.push(t);
  }
  return out.slice(0, 8);
}

function PlaceResultCard({
  place,
  index,
  total,
  compact,
  alt,
  busy,
  onSkipToday,
  onBlacklist,
}: {
  place: Place;
  index: number;
  total: number;
  compact?: boolean;
  alt?: boolean;
  busy?: boolean;
  onSkipToday: (place: Place) => void;
  onBlacklist: (place: Place) => void;
}) {
  const [notesExpanded, setNotesExpanded] = useState(false);
  const priceLabel = formatPlacePrice(place);
  const ratingLabel = formatRating(place.rating, place.ratingCount);
  const showDist = hasValidDistance(place.distanceMeters);
  const walkLabel = showDist
    ? formatWalkMinutes(place.distanceMeters)
    : '';
  const tagPills = useMemo(() => placeTagPills(place), [place]);
  const notesFull = sanitizeLunchNotes(place.lunchNotes);
  const notesLong = notesFull.length > NOTES_PREVIEW;
  const notesShown =
    notesFull &&
    (notesExpanded || !notesLong
      ? notesFull
      : truncateNotes(notesFull, NOTES_PREVIEW));

  const openMaps = async () => {
    await Linking.openURL(mapsUrlForPlace(place));
  };

  return (
    <View
      style={[
        styles.resultCard,
        shadows.card,
        compact && styles.resultCardCompact,
        alt && styles.resultCardAlt,
        total > 1 && styles.resultCardMulti,
      ]}
    >
      {total > 1 ? (
        <View style={styles.cardIndexRow}>
          <Text style={styles.cardIndex}>第 {index + 1} 間</Text>
        </View>
      ) : (
        <Text style={styles.emoji}>🍽️</Text>
      )}
      <Text style={[styles.name, compact && styles.nameCompact]}>{place.name}</Text>

      {walkLabel ? (
        <Text style={styles.walkMain}>{walkLabel}</Text>
      ) : null}
      {showDist ? (
        <Text style={styles.distSub}>
          （{formatDistance(place.distanceMeters)}）
        </Text>
      ) : null}

      <View style={styles.meta}>
        {priceLabel ? (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{priceLabel}</Text>
          </View>
        ) : null}
        {ratingLabel ? (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{ratingLabel}</Text>
          </View>
        ) : null}
      </View>

      {tagPills.length > 0 ? (
        <View style={styles.tagRow}>
          {tagPills.map((t) => (
            <View key={t} style={styles.tagPill}>
              <Text style={styles.tagPillText}>{t}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {place.address ? (
        <Text style={styles.address}>{place.address}</Text>
      ) : null}

      {notesShown ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>午餐筆記</Text>
          <Text style={styles.notes}>{notesShown}</Text>
          {notesLong ? (
            <Pressable
              onPress={() => setNotesExpanded((v) => !v)}
              hitSlop={8}
            >
              <Text style={styles.notesToggle}>
                {notesExpanded ? '收起' : '睇多啲'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {place.isOpenNow === true && (
        <Text style={styles.open}>而家營業中</Text>
      )}

      {total > 1 ? (
        <Pressable style={styles.cardMaps} onPress={() => void openMaps()}>
          <Text style={styles.cardMapsText}>開 Google Maps</Text>
        </Pressable>
      ) : null}

      <View style={styles.cardActions}>
        <Pressable
          style={[styles.cardSkip, busy && styles.disabled]}
          disabled={busy}
          onPress={() => onSkipToday(place)}
        >
          <Text style={styles.cardSkipText}>今日剔走</Text>
        </Pressable>
        <Pressable
          style={[styles.cardBan, busy && styles.disabled]}
          disabled={busy}
          onPress={() => onBlacklist(place)}
        >
          <Text style={styles.cardBanText}>永久唔想再見到</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ResultScreen() {
  const router = useRouter();
  const {
    lastPick,
    lastPicks,
    rejectLast,
    confirmGone,
    spin,
    skipPlaceToday,
    blacklistPlace,
  } = useLunchSession();
  const [busy, setBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [displayed, setDisplayed] = useState<Place[]>([]);

  useEffect(() => {
    const fromSession =
      lastPicks.length > 0 ? lastPicks : lastPick ? [lastPick] : [];
    setDisplayed(fromSession);
  }, [lastPicks, lastPick]);

  const picks = displayed;
  const multi = picks.length > 1;
  const primary = picks[0] ?? null;

  if (!primary) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>未有結果，返去再抽。</Text>
        <Pressable style={styles.fallbackBtn} onPress={() => router.replace('/')}>
          <Text style={styles.fallbackBtnText}>返主頁</Text>
        </Pressable>
      </View>
    );
  }

  const openMapsPrimary = async () => {
    await Linking.openURL(mapsUrlForPlace(primary));
  };

  const onGone = async () => {
    setBusy(true);
    await confirmGone();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setBusy(false);
    router.replace('/');
  };

  const onReject = async () => {
    setBusy(true);
    await rejectLast();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = await spin();
    setBusy(false);
    if (next) {
      router.replace('/wheel');
    } else {
      router.replace('/');
    }
  };

  const onShare = async () => {
    setShareBusy(true);
    try {
      await shareLunchResult(picks);
    } finally {
      setShareBusy(false);
    }
  };

  const onSkipToday = async (place: Place) => {
    setBusy(true);
    try {
      await skipPlaceToday(place.placeId);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const next = picks.filter((p) => p.placeId !== place.placeId);
      setDisplayed(next);
      if (next.length === 0) {
        router.replace('/');
      }
    } finally {
      setBusy(false);
    }
  };

  const onBlacklist = async (place: Place) => {
    setBusy(true);
    try {
      await blacklistPlace(place);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const next = picks.filter((p) => p.placeId !== place.placeId);
      setDisplayed(next);
      if (next.length === 0) {
        router.replace('/');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {multi ? (
          <Text style={styles.multiTitle}>抽中 {picks.length} 間</Text>
        ) : null}
        {multi ? (
          <Text style={styles.reelNote}>
            轉盤已同時停晒全部結果；下面係詳細資料
          </Text>
        ) : null}

        {picks.map((p, i) => (
          <PlaceResultCard
            key={`${p.placeId}-${i}`}
            place={p}
            index={i}
            total={picks.length}
            compact={multi}
            alt={multi && i % 2 === 1}
            busy={busy}
            onSkipToday={(place) => void onSkipToday(place)}
            onBlacklist={(place) => void onBlacklist(place)}
          />
        ))}

        <View style={styles.actions}>
          <Pressable
            style={[styles.primary, shadows.elevated, busy && styles.disabled]}
            disabled={busy}
            onPress={onGone}
          >
            {busy ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <Text style={styles.primaryText}>
                {multi ? '去食（全部標記）' : '去食'}
              </Text>
            )}
          </Pressable>

          {!multi ? (
            <Pressable
              style={[styles.maps, (busy || shareBusy) && styles.disabled]}
              disabled={busy || shareBusy}
              onPress={() => void openMapsPrimary()}
            >
              <Text style={styles.mapsText}>開 Google Maps</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={[styles.share, (busy || shareBusy) && styles.disabled]}
            disabled={busy || shareBusy}
            onPress={() => void onShare()}
          >
            {shareBusy ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.shareText}>
                {multi ? '分享全部' : '分享'}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={[styles.reject, busy && styles.disabled]}
            disabled={busy}
            onPress={() => void onReject()}
          >
            <Text style={styles.rejectText}>
              {multi ? '唔鍾意再抽（全部）' : '唔鍾意再抽'}
            </Text>
          </Pressable>

          <Text style={styles.hint}>
            {multi
              ? '「去食」會將今次全部結果今日排除；「唔鍾意」會降低全部之後機率再抽。'
              : '「唔鍾意」會降低呢間之後抽中機率；今日已唔鍾意嘅唔會再入池。'}
          </Text>
          <Text style={styles.hint}>
            今日剔走嘅店當日之後抽獎唔會再入池，過零點（香港）自動失效。永久唔想再見到要喺主頁黑名單先還原。
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl + spacing.lg,
    alignItems: 'center',
    gap: spacing.md + 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  multiTitle: {
    ...typography.title,
    fontSize: 22,
    color: colors.primaryDark,
    alignSelf: 'stretch',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  reelNote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  resultCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultCardCompact: {
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  resultCardMulti: {
    borderWidth: 1.5,
    borderColor: colors.primaryMuted,
  },
  resultCardAlt: {
    backgroundColor: colors.surface,
  },
  cardIndexRow: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: spacing.xs,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
  },
  cardIndex: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  emoji: { fontSize: 48 },
  name: {
    ...typography.title,
    fontSize: 24,
    lineHeight: 30,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  nameCompact: {
    fontSize: 20,
    lineHeight: 26,
  },
  walkMain: {
    marginTop: spacing.md,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
  },
  distSub: {
    marginTop: 2,
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  pill: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  pillText: {
    fontSize: 13,
    lineHeight: 16,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.sm + 2,
    gap: spacing.chipGap,
  },
  tagPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagPillText: {
    fontSize: 12,
    lineHeight: 15,
    color: colors.textMuted,
    fontWeight: '600',
  },
  address: {
    marginTop: spacing.md,
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
  },
  notesBox: {
    marginTop: spacing.md,
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs + 2,
  },
  notesLabel: {
    ...typography.helper,
    fontWeight: '700',
    color: colors.textMuted,
  },
  notes: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text,
    textAlign: 'left',
  },
  notesToggle: {
    marginTop: spacing.xs,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  open: {
    marginTop: spacing.sm + 2,
    color: colors.success,
    fontWeight: '700',
    fontSize: 13,
  },
  cardMaps: {
    marginTop: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.secondary,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  cardMapsText: {
    color: colors.secondary,
    fontWeight: '700',
    fontSize: 14,
  },
  cardActions: {
    marginTop: spacing.md,
    width: '100%',
    gap: spacing.sm,
  },
  cardSkip: {
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.accentWarm,
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
  },
  cardSkipText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 14,
  },
  cardBan: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  cardBanText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 13,
  },
  actions: {
    width: '100%',
    marginTop: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.lg,
    width: '100%',
    alignItems: 'center',
  },
  primaryText: {
    color: colors.textOnPrimary,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  maps: {
    backgroundColor: 'transparent',
    paddingVertical: 13,
    borderRadius: radius.lg,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.secondary,
  },
  mapsText: {
    color: colors.secondary,
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 20,
  },
  share: {
    backgroundColor: 'transparent',
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  shareText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 15,
    lineHeight: 20,
  },
  reject: {
    marginTop: spacing.xs,
    paddingVertical: 8,
    width: '100%',
    alignItems: 'center',
  },
  rejectText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 18,
  },
  hint: {
    marginTop: spacing.sm,
    ...typography.caption,
    color: colors.textSubtle,
    textAlign: 'center',
  },
  fallbackBtn: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  fallbackBtnText: { color: colors.textOnPrimary, fontWeight: '700' },
  muted: { color: colors.textMuted },
  disabled: { opacity: 0.5 },
});
