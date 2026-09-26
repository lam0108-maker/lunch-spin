import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  MapPinPicker,
  type MapCenter,
} from '../src/components/MapPinPicker';
import { colors } from '../src/constants/theme';
import { useLunchSession } from '../src/hooks/useLunchSession';
import { getGoogleMapsApiKey } from '../src/services/googleMapsKey';
import { HK_DEFAULT_CENTER } from '../src/services/mapPickerHtml';

function parseParamNumber(v: string | string[] | undefined): number | null {
  const s = Array.isArray(v) ? v[0] : v;
  if (s == null || s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export default function PickLocationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lat?: string; lng?: string }>();
  const { coords, setCoords } = useLunchSession();
  const hasMapsKey = Boolean(getGoogleMapsApiKey());

  const initial = useMemo(() => {
    const paramLat = parseParamNumber(params.lat);
    const paramLng = parseParamNumber(params.lng);
    if (paramLat != null && paramLng != null) {
      return { lat: paramLat, lng: paramLng, zoom: 15 };
    }
    if (coords) {
      return {
        lat: coords.latitude,
        lng: coords.longitude,
        zoom: 15,
      };
    }
    return {
      lat: HK_DEFAULT_CENTER.lat,
      lng: HK_DEFAULT_CENTER.lng,
      zoom: HK_DEFAULT_CENTER.zoom,
    };
  }, [coords, params.lat, params.lng]);

  const [center, setCenter] = useState<MapCenter>({
    lat: initial.lat,
    lng: initial.lng,
    zoom: initial.zoom,
  });

  const onCenterChange = useCallback((c: MapCenter) => {
    setCenter(c);
  }, []);

  const confirm = () => {
    setCoords({
      latitude: center.lat,
      longitude: center.lng,
      isFallback: false,
      label: '地圖揀位',
    });
    router.back();
  };

  return (
    <View style={styles.root}>
      {!hasMapsKey ? (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>未設定 Google Maps API key</Text>
          <Text style={styles.bannerBody}>
            喺 .env 設 EXPO_PUBLIC_GOOGLE_MAPS_API_KEY（或重用
            EXPO_PUBLIC_GOOGLE_PLACES_API_KEY），並喺 Cloud Console 啟用 Maps
            JavaScript API。詳見 SETUP.md。
          </Text>
        </View>
      ) : null}

      <MapPinPicker initial={initial} onCenterChange={onCenterChange} />

      <View style={styles.sheet}>
        <Text style={styles.hint}>拖動地圖，針尖位置即係搜尋中心</Text>
        <Text style={styles.coords}>
          {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
        </Text>
        <Pressable
          style={[styles.primaryBtn, !hasMapsKey && styles.primaryBtnDisabled]}
          onPress={confirm}
          disabled={!hasMapsKey}
        >
          <Text style={styles.primaryBtnText}>用呢個位置</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
          <Text style={styles.secondaryBtnText}>返地區列表</Text>
        </Pressable>
        <Text style={styles.attr}>地圖資料 © Google</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  banner: {
    backgroundColor: '#FFF3CD',
    borderBottomWidth: 1,
    borderBottomColor: '#E6D59A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#5C4A00',
  },
  bannerBody: {
    fontSize: 12,
    color: '#6B5A1E',
    lineHeight: 18,
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 10,
    borderTopWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  coords: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnDisabled: {
    opacity: 0.45,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  secondaryBtn: {
    backgroundColor: colors.background,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: {
    color: colors.secondary,
    fontWeight: '700',
    fontSize: 15,
  },
  attr: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
});
