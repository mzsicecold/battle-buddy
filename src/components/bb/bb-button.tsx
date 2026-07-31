import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface BBButtonProps extends PressableProps {
  label: string;
  variant?: 'accent' | 'default';
}

export function BBButton({ label, variant = 'default', style, disabled, ...rest }: BBButtonProps) {
  const theme = useTheme();
  const isAccent = variant === 'accent';
  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: isAccent ? theme.accent : theme.surfaceRaised,
          borderColor: isAccent ? theme.accent : theme.border,
          opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
        },
        typeof style === 'function' ? undefined : style,
      ]}
      {...rest}>
      <ThemedText type="smallBold" themeColor={isAccent ? 'accentInk' : 'text'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignSelf: 'flex-start',
  },
});
