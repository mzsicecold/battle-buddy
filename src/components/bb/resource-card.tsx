import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface Resource {
  name: string;
  detail: string;
  actions: { label: string; url: string }[];
  crisis?: boolean;
}

export function ResourceCard({ resource }: { resource: Resource }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.resourceCard,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          borderLeftColor: resource.crisis ? theme.crisis : theme.teal,
        },
      ]}>
      <View style={styles.resourceMain}>
        <ThemedText type="smallBold">{resource.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {resource.detail}
        </ThemedText>
      </View>
      <View style={styles.resourceActions}>
        {resource.actions.map((action) => (
          <Pressable
            key={action.label}
            onPress={() => Linking.openURL(action.url)}
            style={[styles.actionBtn, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
            <ThemedText type="smallBold">{action.label}</ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.one,
  },
  resourceMain: { flex: 1, gap: 3 },
  resourceActions: { flexDirection: 'row', gap: Spacing.one },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
  },
});
