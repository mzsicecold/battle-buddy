import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ComingNext } from '@/components/bb/coming-next';
import { ScreenHeader } from '@/components/bb/screen-header';
import { BottomTabInset, Spacing } from '@/constants/theme';

export default function ResilienceScreen() {
  return (
    <SafeAreaView edges={['top']} style={styles.flex}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + Spacing.four }]}>
        <ScreenHeader
          eyebrow="04 · REFLECTION"
          title="Resilience"
          description="A private space to think out loud. Nothing here leaves your device."
        />
        <ComingNext
          items={[
            'Rotating reflection prompts',
            'Journal with mood tags',
            'Mental health resources (non-crisis)',
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
