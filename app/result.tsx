import { useMemo, useState } from 'react';
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
import {
  formatDistance,
  formatPlacePrice,
  formatRating,
  formatWalkMinutes,
  truncateNotes,
} from '../src/utils/format';
import { shareLunchResult } from '../src/utils/shareResult';

const NOTES_PREVIEW = 80;

export default function ResultScreen() {
  const router = useRouter();
  const { lastPick, rejectLast, confirmGone, spin } = useLunchSession();
  const [busy, setBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);

  const priceLabel = lastPick ? formatPlacePrice(lastPick) : '';
  const ratingLabel = lastPick
    ? formatRating(lastPick.rating, lastPick.ratingCount)
    : '';
  const walkLabel = lastPick
    ? formatWalkMinutes(lastPick.distanceMeters)
    : '';
  const tagPills = useMemo(() => {
    if (!lastPick) return [] as string[];
    const out: string[] = [];
    for (const c of lastPick.cuisine ?? []) {
      if (c && !out.includes(c)) out.push(c);
    }
    for (const t of lastPick.tags ?? []) {
      if (t && !out.includes(t)) out.push(t);
    }
    return out.slice(0, 8);
  }, [lastPick]);

  if (!lastPick) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>未有結果，返去再抽。</Text>
        <Pressable style={styles.fallbackBtn} onPress={() => router.replace('/')}>
          <Text style={styles.fallbackBtnText}>返主頁</Text>
        </Pressable>
      </View>
    );
  }

  const notesFull = (lastPick.lunchNotes ?? '').trim();
  const notesLong = notesFull.length > NOTES_PREVIEW;
  const notesShown =
    notesFull &&
    (notesExpanded || !notesLong
      ? notesFull
      : truncateNotes(notesFull, NOTES_PREVIEW));

  const openMaps = async () => {
    const url = mapsUrlForPlace(lastPick);
    await Linking.openURL(url);
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
      await shareLunchResult(lastPick);
    } finally {
      setShareBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.resultCard, shadows.card]}>
          <Text style={styles.emoji}>🍽️</Text>
          <Text style={styles.name}>{lastPick.name}</Text>

          {walkLabel ? (
            <Text style={styles.walkMain}>{walkLabel}</Text>
          ) : null}
          <Text style={styles.distSub}>
            （{formatDistance(lastPick.distanceMeters)}）
          </Text>

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

          {lastPick.address ? (
            <Text style={styles.address}>{lastPick.address}</Text>
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

          {lastPick.isOpenNow === true && (
            <Text style={styles.open}>而家營業中</Text>
          )}
        </View>

        <View style={styles.actions}>
          {/* 主：去食 */}
          <Pressable
            style={[styles.primary, shadows.elevated, busy && styles.disabled]}
            disabled={busy}
            onPress={onGone}
          >
            {busy ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <Text style={styles.primaryText}>去食</Text>
            )}
          </Pressable>

          {/* 次：Maps outline */}
          <Pressable
            style={[styles.maps, (busy || shareBusy) && styles.disabled]}
            disabled={busy || shareBusy}
            onPress={() => void openMaps()}
          >
            <Text style={styles.mapsText}>開 Google Maps</Text>
          </Pressable>

          {/* Ghost／text：分享 */}
          <Pressable
            style={[styles.share, (busy || shareBusy) && styles.disabled]}
            disabled={busy || shareBusy}
            onPress={() => void onShare()}
          >
            {shareBusy ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.shareText}>分享</Text>
            )}
          </Pressable>

          <Pressable
            style={[styles.reject, busy && styles.disabled]}
            disabled={busy}
            onPress={() => void onReject()}
          >
            <Text style={styles.rejectText}>唔鍾意再抽</Text>
          </Pressable>

          <Text style={styles.hint}>
            「唔鍾意」會降低呢間之後抽中機率；今日已唔鍾意嘅唔會再入池。
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
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
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
  emoji: { fontSize: 48 },
  name: {
    ...typography.title,
    fontSize: 24,
    lineHeight: 30,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.sm,
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
  actions: {
    width: '100%',
    marginTop: spacing.lg,
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
