import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useVault } from '@/context/vault-context';

interface ScreenHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function ScreenHeader({ eyebrow, title, description }: ScreenHeaderProps) {
  const { lock } = useVault();
  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <ThemedText type="code" themeColor="accent">
          {eyebrow}
        </ThemedText>
        <Pressable onPress={lock} hitSlop={10} accessibilityRole="button" accessibilityLabel="Lock Battle Buddy">
          <ThemedText type="smallBold" themeColor="teal">
            Lock
          </ThemedText>
        </Pressable>
      </View>
      <ThemedText type="subtitle">{title}</ThemedText>
      <ThemedText themeColor="textSecondary">{description}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 6, marginBottom: Spacing.three },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
