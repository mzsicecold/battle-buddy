import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

/**
 * Opaque full-screen cover shown while the app is not active, so iOS captures this instead of the
 * user's data for the app-switcher snapshot. It is a plain View rather than a Modal because it must
 * render synchronously: a Modal presents asynchronously and can miss the snapshot.
 */
export function PrivacyCover() {
  const theme = useTheme();
  return (
    <View
      style={[StyleSheet.absoluteFill, styles.cover, { backgroundColor: theme.background }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View style={[styles.mark, { borderColor: theme.accent }]}>
        <ThemedText type="code" themeColor="accent">
          BB-6
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { alignItems: 'center', justifyContent: 'center' },
  mark: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
});
