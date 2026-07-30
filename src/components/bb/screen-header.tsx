import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

interface ScreenHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function ScreenHeader({ eyebrow, title, description }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <ThemedText type="code" themeColor="accent">
        {eyebrow}
      </ThemedText>
      <ThemedText type="subtitle">{title}</ThemedText>
      <ThemedText themeColor="textSecondary">{description}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 6, marginBottom: Spacing.three },
});
