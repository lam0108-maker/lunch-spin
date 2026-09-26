import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LunchSessionProvider } from '../src/hooks/useLunchSession';
import { colors, typography } from '../src/constants/theme';

export default function RootLayout() {
  return (
    <LunchSessionProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerTitleStyle: {
            fontWeight: typography.title.fontWeight,
            color: colors.text,
            fontSize: 17,
          },
          headerShadowVisible: false,
          headerBackTitle: '',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: '抽Lunch' }} />
        <Stack.Screen name="pick-location" options={{ title: '地圖揀位' }} />
        <Stack.Screen name="wheel" options={{ title: '抽緊' }} />
        <Stack.Screen name="result" options={{ title: '今日Lunch' }} />
      </Stack>
    </LunchSessionProvider>
  );
}
