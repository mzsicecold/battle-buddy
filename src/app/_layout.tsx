import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { LockScreen } from '@/components/lock-screen';
import { PrivacyCover } from '@/components/privacy-cover';
import { useVault, VaultProvider } from '@/context/vault-context';
import { useAppState } from '@/hooks/use-app-state';
import { useTheme } from '@/hooks/use-theme';

SplashScreen.preventAutoHideAsync();

function Gate() {
  const { status } = useVault();
  const theme = useTheme();
  const appState = useAppState();

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

  // Only the unlocked app shows user data, so only it needs a cover. (System sheets such as the file
  // picker also make the app 'inactive'; the cover is simply hidden behind them.)
  return (
    <>
      <AppTabs />
      {appState !== 'active' ? <PrivacyCover /> : null}
    </>
  );
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
