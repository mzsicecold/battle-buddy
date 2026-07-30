import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ComingNext } from '@/components/bb/coming-next';
import { ScreenHeader } from '@/components/bb/screen-header';
import { BottomTabInset, Spacing } from '@/constants/theme';

export default function DocumentsScreen() {
  return (
    <SafeAreaView edges={['top']} style={styles.flex}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + Spacing.four }]}>
        <ScreenHeader
          eyebrow="06 · REPOSITORY"
          title="Documents"
          description="Travel receipts, signed extension contracts, BDD paperwork — encrypted and stored right alongside everything else here."
        />
        <ComingNext
          items={[
            'Upload .pdf / .jpeg / .docx via the native file & photo pickers',
            'Files stored on-device (not embedded as base64 like the web prototype)',
            'Category tagging, notes, and per-file encryption at rest',
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
