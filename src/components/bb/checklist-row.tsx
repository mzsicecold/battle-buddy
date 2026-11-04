import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ChecklistRowProps {
  label: string;
  /** Dates or other detail shown in smaller text under the label. */
  notes?: string[];
  checked: boolean;
  onToggle: () => void;
}

export function ChecklistRow({ label, notes, checked, onToggle }: ChecklistRowProps) {
  const theme = useTheme();
  return (
    <Pressable onPress={onToggle} style={[styles.row, { borderTopColor: theme.borderSoft }]}>
      <View
        style={[
          styles.box,
          {
            borderColor: checked ? theme.accent : theme.border,
            backgroundColor: checked ? theme.accent : 'transparent',
          },
        ]}>
        {checked ? (
          <ThemedText type="small" themeColor="accentInk" style={styles.check}>
            ✓
          </ThemedText>
        ) : null}
      </View>
      <View style={styles.text}>
        <ThemedText
          type="small"
          themeColor={checked ? 'textFaint' : 'text'}
          style={checked ? styles.doneLabel : undefined}>
          {label}
        </ThemedText>
        {notes?.map((note) => (
          <ThemedText key={note} type="small" themeColor="textSecondary">
            {note}
          </ThemedText>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  check: { fontSize: 12, lineHeight: 14 },
  doneLabel: { textDecorationLine: 'line-through' },
});
