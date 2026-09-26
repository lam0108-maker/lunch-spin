import Constants from 'expo-constants';
import type { Place, RadiusMeters, UserCoords } from '../../types/place';
import { searchNearbyGoogle } from './googlePlaces';
import {
  getLocalSeedNearbyPlaces,
  hasLocalSeedDistrict,
} from './localSeedPlaces';
import { getMockNearbyPlaces } from './mockPlaces';
import { searchNearbyOsm } from './osmPlaces';
import { readPlacesCache, writePlacesCache } from './placesCache';

export type PlacesProvider = 'osm' | 'google' | 'mock' | 'local';

export function getGooglePlacesApiKey(): string {
  const fromEnv = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';
  const fromExtra =
    (Constants.expoConfig?.extra?.googlePlacesApiKey as string | undefined) ??
    '';
  return (fromEnv || fromExtra || '').trim();
}

/** 預設 osm；可設 EXPO_PUBLIC_PLACES_PROVIDER=google 先用返 Places */
export function getPlacesProvider(): PlacesProvider {
  const raw = (process.env.EXPO_PUBLIC_PLACES_PROVIDER ?? 'osm')
    .trim()
    .toLowerCase();
  if (raw === 'google') return 'google';
  if (raw === 'mock') return 'mock';
  return 'osm';
}

/** 本地種子庫（將軍澳／九龍東／尖沙咀／佐敦／油麻地…）：未設或非 0 即開 */
export function isLocalSeedEnabled(): boolean {
  const raw = (process.env.EXPO_PUBLIC_LOCAL_SEED ?? '1').trim();
  return raw !== '0';
}

export function isMockPlacesMode(): boolean {
  return getPlacesProvider() === 'mock';
}

/**
 * 附近餐廳：有種子區優先本地庫；否則預設 OpenStreetMap；可選 Google；失敗再 mock。
 */
export async function fetchNearbyRestaurants(
  coords: UserCoords,
  radius: RadiusMeters,
): Promise<{
  places: Place[];
  mock: boolean;
  fromCache: boolean;
  provider: PlacesProvider;
}> {
  const provider = getPlacesProvider();

  if (provider === 'mock') {
    return {
      places: getMockNearbyPlaces(coords, radius),
      mock: true,
      fromCache: false,
      provider: 'mock',
    };
  }

  // 種子區（將軍澳／九龍東／尖沙咀／佐敦／油麻地…）：優先 curated seed（唔寫入 osm/google cache）
  if (isLocalSeedEnabled() && hasLocalSeedDistrict(coords)) {
    const local = getLocalSeedNearbyPlaces(coords, radius);
    if (local.length > 0) {
      return {
        places: local,
        mock: false,
        fromCache: false,
        provider: 'local',
      };
    }
  }

  const cacheCoords = {
    ...coords,
    // 分開 osm / google cache
    label: `${coords.label ?? ''}|${provider}`,
  };
  const cached = await readPlacesCache(cacheCoords, radius);
  if (cached && cached.length > 0) {
    return {
      places: cached,
      mock: false,
      fromCache: true,
      provider,
    };
  }

  try {
    if (provider === 'osm') {
      const places = await searchNearbyOsm(coords, radius);
      if (places.length > 0) {
        await writePlacesCache(cacheCoords, radius, places);
        return {
          places,
          mock: false,
          fromCache: false,
          provider: 'osm',
        };
      }
    }

    if (provider === 'google' || provider === 'osm') {
      // osm 零結果時，若有 Google key 先後備（可關）
      const key = getGooglePlacesApiKey();
      const allowGoogleFallback =
        provider === 'google' ||
        (process.env.EXPO_PUBLIC_OSM_GOOGLE_FALLBACK ?? '0') === '1';
      if (key && (provider === 'google' || allowGoogleFallback)) {
        const places = await searchNearbyGoogle(key, coords, radius);
        await writePlacesCache(
          { ...coords, label: `${coords.label ?? ''}|google` },
          radius,
          places,
        );
        return {
          places,
          mock: false,
          fromCache: false,
          provider: 'google',
        };
      }
    }
  } catch (e) {
    // fall through to mock
    console.warn('[places] fetch failed', e);
  }

  return {
    places: getMockNearbyPlaces(coords, radius),
    mock: true,
    fromCache: false,
    provider: 'mock',
  };
}

/** Only real Google place ids (ChIJ…) may be passed as destination_place_id. */
function isGooglePlaceId(placeId: string): boolean {
  return placeId.startsWith('ChIJ');
}

/**
 * Google Maps 路線：由用戶位置 → 餐廳（步行）。
 * 唔使 Places API key。
 */
export function mapsUrlForPlace(
  place: Place,
  origin?: UserCoords | null,
): string {
  const params = new URLSearchParams();
  params.set('api', '1');
  params.set('travelmode', 'walking');

  if (origin) {
    params.set('origin', `${origin.latitude},${origin.longitude}`);
  }

  if (place.lat != null && place.lng != null) {
    params.set('destination', `${place.lat},${place.lng}`);
  } else if (place.address) {
    params.set('destination', place.address);
  } else {
    params.set('destination', place.name);
  }

  // 只有 Google place_id（ChIJ…）先加；seed / OSM / mock id 唔好傳
  if (place.placeId && isGooglePlaceId(place.placeId)) {
    params.set('destination_place_id', place.placeId);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
