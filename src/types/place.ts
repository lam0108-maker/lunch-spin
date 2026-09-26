export type PlaceId = string;

export interface Place {
  placeId: PlaceId;
  name: string;
  /** metres from user / search centre */
  distanceMeters: number;
  /** 0–4 Google / seed price level; null if unknown */
  priceLevel: number | null;
  /** Human-readable lunch price range from seed, e.g. "$50–80" */
  priceLunchHkd?: string;
  /** 1–5 */
  rating: number | null;
  ratingCount?: number | null;
  isOpenNow: boolean | null;
  address?: string;
  lat?: number;
  lng?: number;
  /** Cuisine labels from curated seed */
  cuisine?: string[];
  /** Extra tags from curated seed */
  tags?: string[];
  /** Short lunch note from curated seed */
  lunchNotes?: string;
}

/** Search radius in metres (slider: 100–2000) */
export type RadiusMeters = number;

export interface UserCoords {
  latitude: number;
  longitude: number;
  /** true if from district fallback map */
  isFallback?: boolean;
  label?: string;
}

export interface RejectRecord {
  placeId: PlaceId;
  count: number;
  /** ISO date YYYY-MM-DD of last reject */
  lastRejectDate?: string;
}

export interface SessionState {
  /** placeIds rejected today in this session — excluded from pool */
  todayRejects: PlaceId[];
  /** placeIds user chose「去食」today — not drawn again today */
  todayGone: PlaceId[];
}
