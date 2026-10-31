import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BBButton } from '@/components/bb/bb-button';
import { Card } from '@/components/bb/card';
import { ChecklistRow } from '@/components/bb/checklist-row';
import { ChipSelect } from '@/components/bb/chip-select';
import { Field } from '@/components/bb/field';
import { EmptyNote } from '@/components/bb/list-row';
import { Pill } from '@/components/bb/pill';
import { ScreenHeader } from '@/components/bb/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemeColor, BottomTabInset, Spacing } from '@/constants/theme';
import { useVault } from '@/context/vault-context';
import { useTheme } from '@/hooks/use-theme';
import { BddEntry, BddStatus, uid } from '@/lib/app-data';

const CHECKLIST_ITEMS = [
  'Attend Transition Assistance Program (TAP) class',
  'Schedule Separation Health Assessment (SHA)',
  'Compile complete medical & dental records for your BDD claim',
  'File BDD claim (180–90 days before separation)',
  'Request DD214 review appointment',
  'Update SGLI / life insurance beneficiaries',
  'Schedule household goods move (if applicable)',
  'Out-process finance — final pay & travel voucher',
  'Confirm TRICARE / VA health coverage transition',
  'Update address & family info in DEERS',
  'Request transcripts / JST for education benefits',
  'Review GI Bill transfer or usage plan',
  'Attend final out-processing appointment',
];

const BDD_STATUSES: readonly BddStatus[] = ['Scheduled', 'Completed', 'Awaiting Report'];

function statusTone(status: BddStatus): ThemeColor {
  if (status === 'Completed') return 'success';
  if (status === 'Scheduled') return 'teal';
  return 'accentStrong';
}

function fmtDate(d: string): string {
  if (!d) return '—';
  const parts = d.split('-');
  if (parts.length !== 3) return d;
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${parts[2]} ${months[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
}

export default function DepartureScreen() {
  const { data, updateData } = useVault();
  const theme = useTheme();
  const [bddDate, setBddDate] = useState('');
  const [bddSpecialty, setBddSpecialty] = useState('');
  const [bddStatus, setBddStatus] = useState<BddStatus>('Scheduled');

  if (!data) return null;
  const { checklist, bdd } = data;
  const doneCount = CHECKLIST_ITEMS.filter((_, i) => checklist[`c${i}`]).length;

  const toggleItem = (i: number) => {
    const key = `c${i}`;
    updateData((d) => ({ ...d, checklist: { ...d.checklist, [key]: !d.checklist[key] } }));
  };

  const addBdd = () => {
    if (!bddDate || !bddSpecialty.trim()) return;
    const entry: BddEntry = {
      id: uid(),
      date: bddDate,
      specialty: bddSpecialty.trim(),
      status: bddStatus,
      notes: '',
    };
    updateData((d) => ({ ...d, bdd: [...d.bdd, entry] }));
    setBddDate('');
    setBddSpecialty('');
    setBddStatus('Scheduled');
  };

  const sortedBdd = [...bdd].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <SafeAreaView edges={['top']} style={styles.flex}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + Spacing.four }]}>
        <ScreenHeader
          eyebrow="05 · TRANSITION"
          title="Departure"
          description="Checklist for separation or retirement, and a place to track your BDD appointments and how each one went."
        />

        <Card title="Separation / Retirement Checklist" hint={`${doneCount} / ${CHECKLIST_ITEMS.length} complete`}>
          {CHECKLIST_ITEMS.map((item, i) => (
            <ChecklistRow key={item} label={item} checked={!!checklist[`c${i}`]} onToggle={() => toggleItem(i)} />
          ))}
        </Card>

        <Card title="BDD Claim Tracker" hint="Benefits Delivery at Discharge">
          {sortedBdd.length === 0 ? (
            <EmptyNote text="No appointments logged yet." />
          ) : (
            sortedBdd.map((b) => (
              <View key={b.id} style={[styles.bddRow, { borderTopColor: theme.borderSoft }]}>
                <View style={styles.bddHeader}>
                  <ThemedText type="code" themeColor="teal">
                    {fmtDate(b.date)}
                  </ThemedText>
                  <Pill label={b.status} tone={statusTone(b.status)} />
                  <Pressable
                    hitSlop={8}
                    style={styles.bddRemove}
                    onPress={() => updateData((d) => ({ ...d, bdd: d.bdd.filter((x) => x.id !== b.id) }))}>
                    <ThemedText type="small" themeColor="textFaint">
                      ✕
                    </ThemedText>
                  </Pressable>
                </View>
                <ThemedText type="smallBold">{b.specialty}</ThemedText>
                <Field
                  label="Notes"
                  placeholder="Notes on how it went..."
                  multiline
                  numberOfLines={2}
                  value={b.notes}
                  onChangeText={(v) =>
                    updateData((d) => ({
                      ...d,
                      bdd: d.bdd.map((x) => (x.id === b.id ? { ...x, notes: v } : x)),
                    }))
                  }
                  style={styles.bddNotesInput}
                />
              </View>
            ))
          )}

          <View style={styles.addRow}>
            <Field label="Date" placeholder="YYYY-MM-DD" value={bddDate} onChangeText={setBddDate} />
            <Field
              label="Clinic / specialty"
              placeholder="e.g. Audiology, Mental Health"
              value={bddSpecialty}
              onChangeText={setBddSpecialty}
            />
          </View>
          <ChipSelect label="Status" value={bddStatus} options={BDD_STATUSES} onChange={(v) => setBddStatus(v as BddStatus)} />
          <BBButton label="Add appointment" variant="accent" onPress={addBdd} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.one },
  addRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  bddRow: { borderTopWidth: 1, paddingVertical: Spacing.two, gap: 6 },
  bddHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  bddRemove: { marginLeft: 'auto' },
  bddNotesInput: { minHeight: 60, textAlignVertical: 'top' },
});
