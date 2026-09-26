import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Place, RadiusMeters, UserCoords } from '../../types/place';

const TTL_MS = 6 * 60 * 60 * 1000; // OSM：6 小時快取，減少打公共 Overpass

function cacheKey(coords: UserCoords, radius: RadiusMeters): string {
  const lat = coords.latitude.toFixed(3);
  const lng = coords.longitude.toFixed(3);
  const r = Math.round(radius / 50) * 50;
  const tag = coords.label ?? '';
  return `places_cache_v2:${tag}:${lat}:${lng}:${r}`;
}

interface CachePayload {
  savedAt: number;
  places: Place[];
}

export async function readPlacesCache(
  coords: UserCoords,
  radius: RadiusMeters,
): Promise<Place[] | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(coords, radius));
    if (!raw) return null;
    const data = JSON.parse(raw) as CachePayload;
    if (!data?.savedAt || !Array.isArray(data.places)) return null;
    if (Date.now() - data.savedAt > TTL_MS) return null;
    return data.places;
  } catch {
    return null;
  }
}

export async function writePlacesCache(
  coords: UserCoords,
  radius: RadiusMeters,
  places: Place[],
): Promise<void> {
  try {
    const payload: CachePayload = { savedAt: Date.now(), places };
    await AsyncStorage.setItem(
      cacheKey(coords, radius),
      JSON.stringify(payload),
    );
  } catch {
    // ignore
  }
}
