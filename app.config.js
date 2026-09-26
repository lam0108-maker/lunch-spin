export default ({ config }) => ({
  ...config,
  name: '抽Lunch',
  slug: 'lunch-spin',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'lunchspin',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#FF6B35',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.lunchspin.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        '需要你嘅位置，先可以搵附近有午餐供應嘅餐廳。',
      CFBundleAllowMixedLocalizations: true,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FF6B35',
    },
    package: 'com.lunchspin.app',
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
  },
  plugins: [
    'expo-router',
    'expo-asset',
    'expo-font',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          '需要你嘅位置，先可以搵附近有午餐供應嘅餐廳。',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    baseUrl: '/lunch-spin',
  },
  web: {
    output: 'static',
  },
  extra: {
    eas: {
      projectId: '00000000-0000-0000-0000-000000000000',
    },
    googlePlacesApiKey:
      process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '',
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  },
});
