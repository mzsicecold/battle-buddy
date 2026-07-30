import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ChipSelectProps {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}

export function ChipSelect({ label, value, options, onChange }: ChipSelectProps) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {options.map((option) => {
            const selected = option === value;
            return (
              <Pressable
                key={option}
                onPress={() => onChange(option)}
                style={[
                  styles.chip,
                  {
                    borderColor: selected ? theme.accent : theme.border,
                    backgroundColor: selected ? theme.surfaceRaised : theme.background,
                  },
                ]}>
                <ThemedText type="small" themeColor={selected ? 'accentStrong' : 'textSecondary'}>
                  {option}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  row: { flexDirection: 'row', gap: Spacing.one },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: 7,
  },
});
