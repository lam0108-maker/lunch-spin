import type { Place, RadiusMeters, UserCoords } from '../../types/place';

/**
 * Places API (New) — Nearby Search（慳用量版）
 * - 單次最多 20；逐步加批次，湊夠 MIN_POOL 即停
 * - 唔再一開始平行打晒所有 type（慳錢）
 */

const NEARBY_URL = 'https://places.googleapis.com/v1/places:searchNearby';

/** 盡量留喺 Pro 級欄位；rating／營業會令 SKU 升 Enterprise，較貴 */
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.priceLevel',
].join(',');

/** 由闊到窄，逐步加；夠數就停 */
const TYPE_BATCHES: string[][] = [
  ['restaurant'],
  ['meal_takeaway', 'cafe'],
  ['bakery', 'sandwich_shop', 'pizza_restaurant'],
  ['chinese_restaurant', 'japanese_restaurant', 'korean_restaurant'],
];

export const MIN_POOL = 40;
const POOL_CAP = 60;

const PRICE_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function offsetCoords(
  coords: UserCoords,
  northM: number,
  eastM: number,
): UserCoords {
  const dLat = northM / 111320;
  const dLng =
    eastM / (111320 * Math.cos((coords.latitude * Math.PI) / 180) || 1);
  return {
    latitude: coords.latitude + dLat,
    longitude: coords.longitude + dLng,
    isFallback: coords.isFallback,
    label: coords.label,
  };
}

interface NearbyResponse {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    priceLevel?: string;
  }>;
}

function mapPlaces(
  data: NearbyResponse,
  origin: { lat: number; lng: number },
): Place[] {
  return (data.places ?? [])
    .map((p) => {
      const lat = p.location?.latitude;
      const lng = p.location?.longitude;
      const dist =
        lat != null && lng != null
          ? haversineMeters(origin, { lat, lng })
          : 0;
      return {
        placeId: p.id ?? '',
        name: p.displayName?.text ?? '未命名餐廳',
        distanceMeters: Math.round(dist),
        priceLevel: p.priceLevel ? (PRICE_MAP[p.priceLevel] ?? null) : null,
        rating: null,
        ratingCount: null,
        isOpenNow: null,
        address: p.formattedAddress,
        lat,
        lng,
      } satisfies Place;
    })
    .filter((p) => p.placeId);
}

async function searchOneBatch(
  apiKey: string,
  searchCenter: UserCoords,
  radius: RadiusMeters,
  includedTypes: string[],
  userOrigin: { lat: number; lng: number },
): Promise<Place[]> {
  const body = {
    includedTypes,
    maxResultCount: 20,
    rankPreference: 'DISTANCE',
    locationRestriction: {
      circle: {
        center: {
          latitude: searchCenter.latitude,
          longitude: searchCenter.longitude,
        },
        radius,
      },
    },
    languageCode: 'zh-HK',
  };

  const res = await fetch(NEARBY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Places API 錯誤 ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as NearbyResponse;
  return mapPlaces(data, userOrigin).filter(
    (p) => p.distanceMeters <= radius + 5,
  );
}

function mergeInto(byId: Map<string, Place>, list: Place[]) {
  for (const p of list) {
    const prev = byId.get(p.placeId);
    if (!prev || p.distanceMeters < prev.distanceMeters) {
      byId.set(p.placeId, p);
    }
  }
}

function sortPool(places: Place[]): Place[] {
  return places.sort((a, b) => a.distanceMeters - b.distanceMeters);
}

export async function searchNearbyGoogle(
  apiKey: string,
  coords: UserCoords,
  radius: RadiusMeters,
): Promise<Place[]> {
  const userOrigin = { lat: coords.latitude, lng: coords.longitude };
  const byId = new Map<string, Place>();
  let firstError: Error | null = null;
  let apiCalls = 0;

  for (const types of TYPE_BATCHES) {
    if (byId.size >= MIN_POOL) break;
    try {
      apiCalls += 1;
      const list = await searchOneBatch(
        apiKey,
        coords,
        radius,
        types,
        userOrigin,
      );
      mergeInto(byId, list);
    } catch (e) {
      if (!firstError) {
        firstError = e instanceof Error ? e : new Error(String(e));
      }
    }
  }

  // 仍少於 40：最多再打 2 次偏移（唔打齊 4 次）
  if (byId.size < MIN_POOL) {
    const step = Math.min(Math.max(radius * 0.4, 80), radius * 0.5);
    const offsets = [
      offsetCoords(coords, step, 0),
      offsetCoords(coords, 0, step),
    ];
    for (const c of offsets) {
      if (byId.size >= MIN_POOL) break;
      try {
        apiCalls += 1;
        const list = await searchOneBatch(
          apiKey,
          c,
          radius,
          ['restaurant'],
          userOrigin,
        );
        mergeInto(byId, list);
      } catch (e) {
        if (!firstError) {
          firstError = e instanceof Error ? e : new Error(String(e));
        }
      }
    }
  }

  if (byId.size === 0 && firstError) {
    throw firstError;
  }

  // eslint-disable-next-line no-console
  console.log(`[places] apiCalls=${apiCalls} pool=${byId.size}`);

  return sortPool(Array.from(byId.values())).slice(0, POOL_CAP);
}
