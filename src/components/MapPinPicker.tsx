import { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { getGoogleMapsApiKey } from '../services/googleMapsKey';
import {
  buildMapPickerHtml,
  HK_DEFAULT_CENTER,
  type MapPickerInitial,
} from '../services/mapPickerHtml';

export type MapCenter = { lat: number; lng: number; zoom?: number };

type Props = {
  initial?: MapPickerInitial;
  onCenterChange: (center: MapCenter) => void;
};

function parseCenterMessage(raw: unknown): MapCenter | null {
  try {
    const data =
      typeof raw === 'string'
        ? (JSON.parse(raw) as {
            type?: string;
            lat?: number;
            lng?: number;
            zoom?: number;
          })
        : (raw as {
            type?: string;
            lat?: number;
            lng?: number;
            zoom?: number;
          });
    if (
      data &&
      data.type === 'center' &&
      typeof data.lat === 'number' &&
      typeof data.lng === 'number' &&
      Number.isFinite(data.lat) &&
      Number.isFinite(data.lng)
    ) {
      return {
        lat: data.lat,
        lng: data.lng,
        zoom: typeof data.zoom === 'number' ? data.zoom : undefined,
      };
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Native: Google Maps via react-native-webview; fixed center pin overlay.
 * Never calls Location APIs.
 */
export function MapPinPicker({ initial, onCenterChange }: Props) {
  const apiKey = getGoogleMapsApiKey();
  const html = useMemo(
    () =>
      buildMapPickerHtml({
        lat: initial?.lat ?? HK_DEFAULT_CENTER.lat,
        lng: initial?.lng ?? HK_DEFAULT_CENTER.lng,
        zoom: initial?.zoom ?? HK_DEFAULT_CENTER.zoom,
        apiKey,
      }),
    [initial?.lat, initial?.lng, initial?.zoom, apiKey],
  );

  const onCenterChangeRef = useRef(onCenterChange);
  onCenterChangeRef.current = onCenterChange;

  const onWebViewMessage = useCallback((event: WebViewMessageEvent) => {
    const center = parseCenterMessage(event.nativeEvent.data);
    if (center) onCenterChangeRef.current(center);
  }, []);

  return (
    <View style={styles.wrap}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        onMessage={onWebViewMessage}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        mixedContentMode="compatibility"
      />
      <View pointerEvents="none" style={styles.pinOverlay}>
        <Text style={styles.pinEmoji}>📍</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#e8eef2',
    overflow: 'hidden',
  },
  map: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  pinOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 28,
  },
  pinEmoji: {
    fontSize: 36,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
