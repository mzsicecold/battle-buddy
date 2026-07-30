import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ComingNext } from '@/components/bb/coming-next';
import { ScreenHeader } from '@/components/bb/screen-header';
import { BottomTabInset, Spacing } from '@/constants/theme';

export default function FinancesScreen() {
  return (
    <SafeAreaView edges={['top']} style={styles.flex}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + Spacing.four }]}>
        <ScreenHeader
          eyebrow="02 · PAY & INVESTMENTS"
          title="Finances"
          description="Track your LES at a glance, watch your TSP allocation, and keep your own notes on strategy."
        />
        <ComingNext
          items={[
            'LES snapshot with computed net pay',
            'TSP balance + C/S/I/F/G/L fund allocation bar',
            'Investment strategy notes (educational only, no personalized advice)',
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
