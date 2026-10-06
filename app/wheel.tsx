import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NameReel } from '../src/components/NameReel';
import {
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from '../src/constants/theme';
import { useLunchSession } from '../src/hooks/useLunchSession';

const RESULT_DELAY_MS = 360;
const RESULT_DELAY_MULTI_MS = 1400;

export default function WheelScreen() {
  const router = useRouter();
  const { places, spin, lastPick, lastPicks, wheelPlaces, error, isMock } =
    useLunchSession();
  const [spinning, setSpinning] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(true);

  const startSpin = useCallback(async () => {
    setBusy(true);
    const chosen = await spin();
    setBusy(false);
    if (!chosen) return;
    setReady(true);
    setSpinning(true);
  }, [spin]);

  useEffect(() => {
    if (places.length === 0) {
      router.replace('/');
      return;
    }
    void startSpin();
  }, []); // 入嚟即抽一次

  const onSpinEnd = () => {
    setSpinning(false);
    const delay =
      lastPicks.length > 1 ? RESULT_DELAY_MULTI_MS : RESULT_DELAY_MS;
    setTimeout(() => {
      router.push('/result');
    }, delay);
  };

  if (places.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const multi = lastPicks.length > 1;
  const winnerIds = lastPicks.map((p) => p.placeId);

  const statusCopy =
    busy && !ready
      ? '準備餐廳中…'
      : spinning
        ? multi
          ? `名單掃緊…（抽 ${lastPicks.length} 間）`
          : '名單掃緊…'
        : multi
          ? `停咗 · ${lastPicks.length} 間一齊顯示`
          : null;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container}>
        <Text style={styles.title}>
          {multi ? `抽緊 ${lastPicks.length} 間…` : '抽緊…'}
        </Text>
        {statusCopy ? (
          <Text style={styles.status}>{statusCopy}</Text>
        ) : null}
        {isMock && (
          <Text style={styles.mock}>模擬資料 · 示範名單</Text>
        )}
        {busy && !ready && (
          <ActivityIndicator
            color={colors.primary}
            style={{ marginTop: spacing.lg }}
          />
        )}
        {ready && lastPick && wheelPlaces.length > 0 && (
          <NameReel
            places={wheelPlaces}
            winnerId={lastPick.placeId}
            winnerIds={winnerIds.length > 0 ? winnerIds : undefined}
            spinning={spinning}
            onSpinEnd={onSpinEnd}
          />
        )}
        {error && <Text style={styles.error}>{error}</Text>}
        {!spinning && ready && (
          <Pressable
            style={[styles.btn, shadows.card]}
            onPress={() => void startSpin()}
          >
            <Text style={styles.btnText}>再抽一次</Text>
          </Pressable>
        )}
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
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  title: {
    ...typography.title,
    color: colors.text,
    marginTop: spacing.sm,
  },
  status: {
    marginTop: spacing.xs,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  mock: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontSize: 12,
  },
  error: {
    color: colors.danger,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  btn: {
    marginTop: spacing.lg,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  btnText: { color: colors.textOnPrimary, fontWeight: '700' },
});
