import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Pill({ label, tone }: { label: string; tone: ThemeColor }) {
  const theme = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: theme[tone] + '29' }]}>
      <ThemedText type="small" themeColor={tone} style={styles.text}>
        {label.toUpperCase()}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
