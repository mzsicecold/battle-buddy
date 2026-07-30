import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ListRowProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  onRemove?: () => void;
}

export function ListRow({ eyebrow, title, subtitle, onRemove }: ListRowProps) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { borderTopColor: theme.borderSoft }]}>
      <View style={styles.main}>
        {eyebrow ? (
          <ThemedText type="code" themeColor="teal">
            {eyebrow}
          </ThemedText>
        ) : null}
        <ThemedText type="small" style={styles.title}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={8} style={styles.removeBtn}>
          <ThemedText type="small" themeColor="textFaint">
            ✕
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyNote({ text }: { text: string }) {
  return (
    <ThemedText type="small" themeColor="textFaint">
      {text}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
  },
  main: { flex: 1, gap: 2 },
  title: { fontWeight: '600' },
  removeBtn: { padding: 4 },
});
