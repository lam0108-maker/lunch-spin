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
const CENTER_TOP = Math.floor(VISIBLE_ROWS / 2) * ITEM_HEIGHT;

interface Props {
  places: Place[];
  winnerId: string;
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

export function NameReel({
  places,
  winnerId,
  spinning,
  onSpinEnd,
}: Props) {
  const translateY = useRef(new Animated.Value(0)).current;
  const finishedRef = useRef(onSpinEnd);
  finishedRef.current = onSpinEnd;

  const n = Math.max(places.length, 1);

  const winnerIndex = useMemo(() => {
    const i = places.findIndex((p) => p.placeId === winnerId);
    return i >= 0 ? i : 0;
  }, [places, winnerId]);

  const strip = useMemo(() => {
    if (places.length === 0) return [] as Place[];
    const out: Place[] = [];
    for (let r = 0; r < REPEAT; r++) {
      for (const p of places) {
        out.push(p);
      }
    }
    return out;
  }, [places]);

  /** Offset so the centered row sits in the middle of the viewport */
  const centerOffset = CENTER_TOP;

  useEffect(() => {
    if (!spinning || places.length === 0) return;

    // Land on a late copy of the winner so the scroll feels long
    const targetCycle = REPEAT - 2;
    const targetIndex = targetCycle * n + winnerIndex;
    const finalY = centerOffset - targetIndex * ITEM_HEIGHT;

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
  }, [spinning, winnerIndex, n, places.length, translateY, centerOffset]);

  return (
    <View style={[styles.wrap, shadows.card]}>
      <View style={[styles.chrome, shadows.elevated]}>
        <View style={[styles.viewport, { height: REEL_HEIGHT }]}>
          <Animated.View style={{ transform: [{ translateY }] }}>
            {strip.map((p, i) => {
              const cuisine = (p.cuisine ?? []).find((c) => !!c?.trim());
              return (
                <View
                  key={`${p.placeId}-${i}`}
                  style={[styles.item, { height: ITEM_HEIGHT }]}
                >
                  <Text
                    style={styles.name}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {p.name}
                  </Text>
                  {cuisine ? (
                    <Text style={styles.cuisine} numberOfLines={1}>
                      {cuisine}
                      {p.distanceMeters != null
                        ? ` · ${formatWalkMinutes(p.distanceMeters)}`
                        : ''}
                    </Text>
                  ) : p.distanceMeters != null ? (
                    <Text style={styles.cuisine} numberOfLines={1}>
                      {formatWalkMinutes(p.distanceMeters)}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </Animated.View>

          <View style={styles.fadeTop} pointerEvents="none" />
          <View style={styles.fadeBottom} pointerEvents="none" />
          <View style={styles.centerFrame} pointerEvents="none" />
        </View>
      </View>
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
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 20,
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
    top: CENTER_TOP,
    height: ITEM_HEIGHT,
    borderRadius: radius.md,
    borderWidth: 2.5,
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
  },
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 1.15,
    backgroundColor: 'rgba(255, 253, 251, 0.72)',
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 1.15,
    backgroundColor: 'rgba(255, 253, 251, 0.72)',
  },
});
