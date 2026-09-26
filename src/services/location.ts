import * as Location from 'expo-location';
import { resolveDistrict } from '../constants/districts';
import type { UserCoords } from '../types/place';

export type LocationResult =
  | { ok: true; coords: UserCoords }
  | { ok: false; reason: 'denied' | 'unavailable' | 'error'; message: string };

export async function requestWhenInUseLocation(): Promise<LocationResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return {
        ok: false,
        reason: 'denied',
        message: '你未授權位置。可以手動輸入地區（例如「銅鑼灣」）。',
      };
    }
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      ok: true,
      coords: {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        isFallback: false,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: 'error', message: msg };
  }
}

export function coordsFromDistrict(district: string): LocationResult {
  const hit = resolveDistrict(district);
  if (!hit) {
    return {
      ok: false,
      reason: 'unavailable',
      message: `搵唔到「${district}」。試吓：銅鑼灣、旺角、觀塘…`,
    };
  }
  return { ok: true, coords: hit };
}
