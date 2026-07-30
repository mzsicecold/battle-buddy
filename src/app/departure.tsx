import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ComingNext } from '@/components/bb/coming-next';
import { ScreenHeader } from '@/components/bb/screen-header';
import { BottomTabInset, Spacing } from '@/constants/theme';

export default function DepartureScreen() {
  return (
    <SafeAreaView edges={['top']} style={styles.flex}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + Spacing.four }]}>
        <ScreenHeader
          eyebrow="05 · TRANSITION"
          title="Departure"
          description="Checklist for separation or retirement, and a place to track your BDD appointments and how each one went."
        />
        <ComingNext
          items={[
            'Separation / retirement checklist with progress tracking',
            'BDD appointment tracker with per-visit notes',
          ]}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.one },
});
