import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Place } from '../types/place';
import { colors, radius, shadows, spacing } from '../constants/theme';
import { formatWalkMinutes } from '../utils/format';

const ITEM_HEIGHT = 64;
const VISIBLE_ROWS = 5;
const REEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
/** How many times to repeat the place list for a long scroll distance */
const REPEAT = 10;
const SPIN_MS = 4200;

interface Props {
  places: Place[];
  /** Primary winner (first pick). Used when winnerIds omitted. */
  winnerId: string;
  /** All winners in order (1–3). When length>1, reel lands with them stacked. */
  winnerIds?: string[];
  spinning: boolean;
  onSpinEnd?: () => void;
}

async function hapticStart() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // web / unsupported
  }
}

async function hapticLand() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // web / unsupported
  }
}

function resolveWinners(
  places: Place[],
  winnerId: string,
  winnerIds?: string[],
): Place[] {
  const ids =
    winnerIds && winnerIds.length > 0
      ? winnerIds
      : winnerId
        ? [winnerId]
        : [];
  const byId = new Map(places.map((p) => [p.placeId, p]));
  const out: Place[] = [];
  for (const id of ids) {
    const p = byId.get(id);
    if (p && !out.some((x) => x.placeId === p.placeId)) out.push(p);
  }
  if (out.length === 0 && winnerId) {
    const p = byId.get(winnerId);
    if (p) out.push(p);
  }
  return out.slice(0, 3);
}

/**
 * Cycle starts with winners consecutively, then the rest of the pool.
 * Landing so index 0 of a late cycle sits at highlightTop shows all N stacked.
 */
function buildCycle(places: Place[], winners: Place[]): Place[] {
  const winIds = new Set(winners.map((w) => w.placeId));
  const others = places.filter((p) => !winIds.has(p.placeId));
  const cycle = [...winners, ...others];
  while (cycle.length < 8 && places.length > 0) {
    cycle.push(places[cycle.length % places.length]!);
  }
  return cycle.length > 0 ? cycle : winners;
}

export function NameReel({
  places,
  winnerId,
  winnerIds,
  spinning,
  onSpinEnd,
}: Props) {
  const translateY = useRef(new Animated.Value(0)).current;
  const finishedRef = useRef(onSpinEnd);
  finishedRef.current = onSpinEnd;

  const winners = useMemo(
    () => resolveWinners(places, winnerId, winnerIds),
    [places, winnerId, winnerIds],
  );
  const winCount = Math.max(winners.length, 1);
  const multi = winCount > 1;

  /** Highlight block vertically centered in the 5-row viewport */
  const highlightTop =
    Math.floor((VISIBLE_ROWS - winCount) / 2) * ITEM_HEIGHT;
  const highlightHeight = winCount * ITEM_HEIGHT;

  const cycle = useMemo(
    () => buildCycle(places, winners),
    [places, winners],
  );
  const cycleLen = Math.max(cycle.length, 1);

  const strip = useMemo(() => {
    if (cycle.length === 0) return [] as Place[];
    const out: Place[] = [];
    for (let r = 0; r < REPEAT; r++) {
      for (const p of cycle) out.push(p);
    }
    return out;
  }, [cycle]);

  useEffect(() => {
    if (!spinning || cycle.length === 0 || winners.length === 0) return;

    const targetCycle = REPEAT - 2;
    const targetIndex = targetCycle * cycleLen; // first winner of consecutive block
    const finalY = highlightTop - targetIndex * ITEM_HEIGHT;

    translateY.setValue(0);
    void hapticStart();

    Animated.timing(translateY, {
      toValue: finalY,
      duration: SPIN_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        void hapticLand().then(() => {
          finishedRef.current?.();
        });
      }
    });
  }, [
    spinning,
    cycleLen,
    cycle.length,
    winners.length,
    highlightTop,
    translateY,
  ]);

  // Softer fades when multi so stacked winners stay readable
  const fadeH = multi ? ITEM_HEIGHT * 0.55 : ITEM_HEIGHT * 1.15;

  return (
    <View style={[styles.wrap, shadows.card]}>
      {multi ? (
        <Text style={styles.multiBanner}>抽中 {winCount} 間</Text>
      ) : null}
      <View style={[styles.chrome, shadows.elevated]}>
        <View style={[styles.viewport, { height: REEL_HEIGHT }]}>
          <Animated.View style={{ transform: [{ translateY }] }}>
            {strip.map((p, i) => {
              const cuisine = (p.cuisine ?? []).find((c) => !!c?.trim());
              const inCycle = i % cycleLen;
              const winRank = winners.findIndex((w) => w.placeId === p.placeId);
              // Rank badge only on the consecutive winner block slots (not random duplicates)
              const showRank = multi && winRank >= 0 && inCycle < winCount;

              return (
                <View
                  key={`${p.placeId}-${i}`}
                  style={[styles.item, { height: ITEM_HEIGHT }]}
                >
                  {showRank ? (
                    <Text style={styles.rankBadge}>第 {winRank + 1} 間</Text>
                  ) : null}
                  <Text
                    style={[styles.name, showRank && styles.nameWinner]}
                    numberOfLines={showRank ? 1 : 2}
                    ellipsizeMode="tail"
                  >
                    {p.name}
                  </Text>
                  {cuisine ? (
                    <Text style={styles.cuisine} numberOfLines={1}>
                      {cuisine}
                      {Number.isFinite(p.distanceMeters) &&
                      p.distanceMeters >= 0 &&
                      formatWalkMinutes(p.distanceMeters)
                        ? ` · ${formatWalkMinutes(p.distanceMeters)}`
                        : ''}
                    </Text>
                  ) : Number.isFinite(p.distanceMeters) &&
                    p.distanceMeters >= 0 &&
                    formatWalkMinutes(p.distanceMeters) ? (
                    <Text style={styles.cuisine} numberOfLines={1}>
                      {formatWalkMinutes(p.distanceMeters)}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </Animated.View>

          <View
            style={[styles.fadeTop, { height: fadeH }]}
            pointerEvents="none"
          />
          <View
            style={[styles.fadeBottom, { height: fadeH }]}
            pointerEvents="none"
          />
          <View
            style={[
              styles.centerFrame,
              {
                top: highlightTop,
                height: highlightHeight,
              },
              multi && styles.centerFrameMulti,
            ]}
            pointerEvents="none"
          />
          {multi
            ? Array.from({ length: winCount - 1 }, (_, k) => (
                <View
                  key={`div-${k}`}
                  style={[
                    styles.slotDivider,
                    {
                      top: highlightTop + (k + 1) * ITEM_HEIGHT - 0.5,
                    },
                  ]}
                  pointerEvents="none"
                />
              ))
            : null}
        </View>
      </View>
      {multi ? (
        <Text style={styles.multiFoot}>
          轉盤一次停晒 {winCount} 間 · 結果頁有詳情
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm + 4,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    maxWidth: 360,
    gap: spacing.sm,
  },
  multiBanner: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  multiFoot: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
  },
  chrome: {
    width: '100%',
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primaryMuted,
    overflow: 'hidden',
  },
  viewport: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  item: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  rankBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 20,
  },
  nameWinner: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  cuisine: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
  },
  centerFrame: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 2.5,
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
  },
  centerFrameMulti: {
    borderWidth: 3,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
  },
  slotDivider: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    height: 1,
    backgroundColor: 'rgba(255, 107, 53, 0.35)',
  },
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 253, 251, 0.72)',
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 253, 251, 0.72)',
  },
});
