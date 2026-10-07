import type { Place, RadiusMeters, UserCoords } from '../../types/place';
import {
  sanitizeLunchNotes,
  userFacingTags,
} from '../../utils/displayLabels';
import kbSeedData from '../../data/kowloon-bay-restaurants.json';
import ktSeedData from '../../data/kwun-tong-restaurants.json';
import lymSeedData from '../../data/lei-yue-mun-restaurants.json';
import ltSeedData from '../../data/lam-tin-restaurants.json';
import smpSeedData from '../../data/sau-mau-ping-restaurants.json';
import ytSeedData from '../../data/yau-tong-restaurants.json';
import ntkSeedData from '../../data/ngau-tau-kok-restaurants.json';
import tkoSeedData from '../../data/tseung-kwan-o-restaurants.json';
import tstSeedData from '../../data/tsim-sha-tsui-restaurants.json';
import jordanSeedData from '../../data/jordan-restaurants.json';
import yauMaTeiSeedData from '../../data/yau-ma-tei-restaurants.json';
import mkSeedData from '../../data/mong-kok-restaurants.json';
import caSeedData from '../../data/central-admiralty-restaurants.json';
import wcSeedData from '../../data/wan-chai-restaurants.json';

interface SeedRestaurant {
  id: string;
  name_zh?: string;
  name_en?: string;
  lat: number;
  lng: number;
  area?: string;
  address?: string;
  price_level?: number | null;
  price_lunch_hkd?: string | null;
  cuisine?: string[];
  tags?: string[];
  lunch_notes?: string | null;
  google_rating?: number | null;
  google_review_count?: number | null;
}

interface SeedFile {
  restaurants?: SeedRestaurant[];
}

interface DistrictSeed {
  /** substring match against coords.label */
  label: string;
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  seed: SeedFile;
}

/** Overpass / seed README bboxes */
const DISTRICT_SEEDS: DistrictSeed[] = [
  {
    label: '將軍澳',
    bbox: {
      minLat: 22.295,
      maxLat: 22.335,
      minLng: 114.245,
      maxLng: 114.275,
    },
    seed: tkoSeedData as SeedFile,
  },
  {
    // 牛頭角站／下邨／淘大／樂華／坪石一帶；同觀塘、九龍灣有邊界重疊（nearby 已改合併全庫，唔再靠單區 resolve）
    label: '牛頭角',
    bbox: {
      minLat: 22.312,
      maxLat: 22.335,
      minLng: 114.208,
      maxLng: 114.225,
    },
    seed: ntkSeedData as SeedFile,
  },
  {
    // apm／裕民坊／鱷魚恤一帶（README）；唔收淘大
    label: '觀塘',
    bbox: {
      minLat: 22.305,
      maxLat: 22.32,
      minLng: 114.213,
      maxLng: 114.235,
    },
    seed: ktSeedData as SeedFile,
  },
  {
    // MegaBox／德福／麗晶／宏開道（README）；唔收淘大、觀塘 apm
    label: '九龍灣',
    bbox: {
      minLat: 22.318,
      maxLat: 22.335,
      minLng: 114.205,
      maxLng: 114.220,
    },
    seed: kbSeedData as SeedFile,
  },
  {
    // 滙景／啟田／德田／廣田／麗港城（v1.1）；唔收觀塘 apm、九龍灣、淘大
    // minLat／minLng 略擴以涵蓋本批實際座標（麗港城 lng≈114.228）
    label: '藍田',
    bbox: {
      minLat: 22.302,
      maxLat: 22.315,
      minLng: 114.226,
      maxLng: 114.245,
    },
    seed: ltSeedData as SeedFile,
  },
  {
    // 大本型／鯉魚門廣場（README）；唔收藍田滙景、觀塘 apm、鯉魚門海鮮街
    label: '油塘',
    bbox: {
      minLat: 22.295,
      maxLat: 22.310,
      minLng: 114.230,
      maxLng: 114.245,
    },
    seed: ytSeedData as SeedFile,
  },
  {
    // 秀茂坪／寶達／安達／安泰商場（README）；唔收藍田、觀塘 apm、油塘
    label: '秀茂坪',
    bbox: {
      minLat: 22.315,
      maxLat: 22.330,
      minLng: 114.230,
      maxLng: 114.250,
    },
    seed: smpSeedData as SeedFile,
  },
  {
    // 海鮮街／海傍道／三家村（README）；唔收鯉魚門廣場連鎖（已在油塘）
    label: '鯉魚門',
    bbox: {
      minLat: 22.284,
      maxLat: 22.295,
      minLng: 114.235,
      maxLng: 114.245,
    },
    seed: lymSeedData as SeedFile,
  },
  {
    // 海港城／美麗華／The ONE／K11 MUSEA／中港城等商場午市（phase-3 README）
    label: '尖沙咀',
    bbox: {
      minLat: 22.293,
      maxLat: 22.303,
      minLng: 114.166,
      maxLng: 114.180,
    },
    seed: tstSeedData as SeedFile,
  },
  {
    // 佐敦站／佐敦道／白加士街／逸東酒店等午市（phase-3 README）
    label: '佐敦',
    bbox: {
      minLat: 22.302,
      maxLat: 22.309,
      minLng: 114.166,
      maxLng: 114.173,
    },
    seed: jordanSeedData as SeedFile,
  },
  {
    // 油麻地站／彌敦道／窩打老道／廟街南等午市（phase-3 README）
    label: '油麻地',
    bbox: {
      minLat: 22.304,
      maxLat: 22.316,
      minLng: 114.167,
      maxLng: 114.173,
    },
    seed: yauMaTeiSeedData as SeedFile,
  },
  {
    // 旺角／太子一帶（含太子）；同油麻地北緣可輕微重疊
    label: '旺角',
    bbox: {
      minLat: 22.315,
      maxLat: 22.328,
      minLng: 114.165,
      maxLng: 114.176,
    },
    seed: mkSeedData as SeedFile,
  },
  {
    // 中環／金鐘 CBD 午市（v1.0）；含交易廣場／IFC／太古廣場一帶
    label: '中環／金鐘',
    bbox: {
      minLat: 22.277,
      maxLat: 22.286,
      minLng: 114.152,
      maxLng: 114.172,
    },
    seed: caSeedData as SeedFile,
  },
  {
    // 灣仔／會展／軒尼詩／駱克／莊士敦（v1.0）；bbox 22.274–22.283 / 114.168–114.180
    label: '灣仔',
    bbox: {
      minLat: 22.274,
      maxLat: 22.283,
      minLng: 114.168,
      maxLng: 114.180,
    },
    seed: wcSeedData as SeedFile,
  },
];

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

function inBbox(
  lat: number,
  lng: number,
  bbox: DistrictSeed['bbox'],
): boolean {
  return (
    lat >= bbox.minLat &&
    lat <= bbox.maxLat &&
    lng >= bbox.minLng &&
    lng <= bbox.maxLng
  );
}

function districtCenter(d: DistrictSeed): { lat: number; lng: number } {
  return {
    lat: (d.bbox.minLat + d.bbox.maxLat) / 2,
    lng: (d.bbox.minLng + d.bbox.maxLng) / 2,
  };
}

/**
 * Resolve district for label/bbox helpers (chips / isIn*).
 * Nearby fetch no longer uses this — see getLocalSeedNearbyPlaces merged pool.
 */
function resolveDistrictSeed(coords: UserCoords): DistrictSeed | null {
  const label = coords.label ?? '';
  // 地圖揀位等無地區 label：唔好用「包含」誤中；只認明確地區名
  const byLabel = DISTRICT_SEEDS.find((d) => label.includes(d.label));
  if (byLabel) return byLabel;

  const hits = DISTRICT_SEEDS.filter((d) =>
    inBbox(coords.latitude, coords.longitude, d.bbox),
  );
  if (hits.length === 0) return null;
  if (hits.length === 1) return hits[0]!;

  const origin = { lat: coords.latitude, lng: coords.longitude };
  return hits
    .map((d) => ({
      d,
      dist: haversineMeters(origin, districtCenter(d)),
    }))
    .sort((a, b) => a.dist - b.dist)[0]!.d;
}

/** @deprecated use hasLocalSeedDistrict — kept for call-site clarity */
export function isInTseungKwanO(coords: UserCoords): boolean {
  const d = resolveDistrictSeed(coords);
  return d?.label === '將軍澳';
}

export function isInNgauTauKok(coords: UserCoords): boolean {
  const d = resolveDistrictSeed(coords);
  return d?.label === '牛頭角';
}

export function isInKwunTong(coords: UserCoords): boolean {
  const d = resolveDistrictSeed(coords);
  return d?.label === '觀塘';
}

export function isInKowloonBay(coords: UserCoords): boolean {
  const d = resolveDistrictSeed(coords);
  return d?.label === '九龍灣';
}

export function isInLamTin(coords: UserCoords): boolean {
  const d = resolveDistrictSeed(coords);
  return d?.label === '藍田';
}

export function isInYauTong(coords: UserCoords): boolean {
  const d = resolveDistrictSeed(coords);
  return d?.label === '油塘';
}

export function isInSauMauPing(coords: UserCoords): boolean {
  const d = resolveDistrictSeed(coords);
  return d?.label === '秀茂坪';
}

export function isInLeiYueMun(coords: UserCoords): boolean {
  const d = resolveDistrictSeed(coords);
  return d?.label === '鯉魚門';
}

export function isInTsimShaTsui(coords: UserCoords): boolean {
  const d = resolveDistrictSeed(coords);
  return d?.label === '尖沙咀';
}

export function isInJordan(coords: UserCoords): boolean {
  const d = resolveDistrictSeed(coords);
  return d?.label === '佐敦';
}

export function isInYauMaTei(coords: UserCoords): boolean {
  const d = resolveDistrictSeed(coords);
  return d?.label === '油麻地';
}

export function isInMongKok(coords: UserCoords): boolean {
  const d = resolveDistrictSeed(coords);
  return d?.label === '旺角';
}

export function isInCentralAdmiralty(coords: UserCoords): boolean {
  const d = resolveDistrictSeed(coords);
  return d?.label === '中環／金鐘';
}

/** True if coords match any curated local-seed district (label or bbox). Nearby fetch no longer gates on this. */
export function hasLocalSeedDistrict(coords: UserCoords): boolean {
  return resolveDistrictSeed(coords) != null;
}

/**
 * Merge ALL curated district seeds into one pool, filter by haversine ≤ radius,
 * dedupe by restaurant id. Does not pick a single district.
 */
export function getLocalSeedNearbyPlaces(
  coords: UserCoords,
  radius: RadiusMeters,
): Place[] {
  const origin = { lat: coords.latitude, lng: coords.longitude };
  const byId = new Map<string, Place>();

  for (const district of DISTRICT_SEEDS) {
    const list = district.seed.restaurants ?? [];
    for (const r of list) {
      if (typeof r.lat !== 'number' || typeof r.lng !== 'number') continue;
      const id = (r.id ?? '').trim();
      if (!id) continue;
      const dist = Math.round(
        haversineMeters(origin, { lat: r.lat, lng: r.lng }),
      );
      if (dist > radius) continue;
      const existing = byId.get(id);
      if (existing && existing.distanceMeters <= dist) continue;
      const cuisine = (r.cuisine ?? []).map((c) => c.trim()).filter(Boolean);
      const tags = userFacingTags(r.tags);
      const lunchNotes = sanitizeLunchNotes(r.lunch_notes) || undefined;
      const priceLunchHkd = (r.price_lunch_hkd ?? '').trim() || undefined;
      const googleRating =
        typeof r.google_rating === 'number' && !Number.isNaN(r.google_rating)
          ? r.google_rating
          : null;
      const googleReviewCount =
        typeof r.google_review_count === 'number' &&
        !Number.isNaN(r.google_review_count)
          ? r.google_review_count
          : null;
      byId.set(id, {
        placeId: id,
        name: (r.name_zh || r.name_en || id).trim(),
        distanceMeters: dist,
        priceLevel: r.price_level ?? null,
        priceLunchHkd,
        rating: googleRating,
        ratingCount: googleReviewCount,
        isOpenNow: null,
        address: r.address || r.area || undefined,
        lat: r.lat,
        lng: r.lng,
        cuisine: cuisine.length ? cuisine : undefined,
        tags: tags.length ? tags : undefined,
        lunchNotes,
      });
    }
  }

  return [...byId.values()].sort(
    (a, b) => a.distanceMeters - b.distanceMeters,
  );
}
