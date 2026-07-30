import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { LockScreen } from '@/components/lock-screen';
import { useVault, VaultProvider } from '@/context/vault-context';
import { useTheme } from '@/hooks/use-theme';

SplashScreen.preventAutoHideAsync();

function Gate() {
  const { status } = useVault();
  const theme = useTheme();

  useEffect(() => {
    if (status !== 'checking') {
      SplashScreen.hideAsync();
    }
  }, [status]);

  if (status === 'checking') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (status === 'no-vault' || status === 'locked') {
    return <LockScreen />;
  }

  return <AppTabs />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <VaultProvider>
        <Gate />
      </VaultProvider>
    </ThemeProvider>
  );
}
