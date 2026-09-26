import Constants from 'expo-constants';

/**
 * Google Maps JavaScript API key for the map location picker.
 * Prefer EXPO_PUBLIC_GOOGLE_MAPS_API_KEY; fall back to Places key
 * (same Cloud key is fine if Maps JavaScript API is enabled on it).
 */
export function getGoogleMapsApiKey(): string {
  const fromMapsEnv = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  const fromPlacesEnv = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';
  const fromExtraMaps =
    (Constants.expoConfig?.extra?.googleMapsApiKey as string | undefined) ??
    '';
  const fromExtraPlaces =
    (Constants.expoConfig?.extra?.googlePlacesApiKey as string | undefined) ??
    '';
  return (
    fromMapsEnv ||
    fromExtraMaps ||
    fromPlacesEnv ||
    fromExtraPlaces ||
    ''
  ).trim();
}
