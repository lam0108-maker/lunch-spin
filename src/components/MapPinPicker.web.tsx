import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
 * Web: Google Maps via iframe srcDoc; fixed center pin overlay.
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

  const handlePayload = useCallback((raw: unknown) => {
    const center = parseCenterMessage(raw);
    if (center) onCenterChangeRef.current(center);
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      handlePayload(event.data);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [handlePayload]);

  return (
    <View style={styles.wrap}>
      {/* iframe is valid on react-native-web; allow-popups for Google Maps */}
      <iframe
        title="地圖揀位"
        srcDoc={html}
        style={{
          border: 'none',
          width: '100%',
          height: '100%',
          display: 'block',
        }}
        sandbox="allow-scripts allow-same-origin allow-popups"
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
