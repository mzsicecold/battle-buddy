import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BBButton } from '@/components/bb/bb-button';
import { Card } from '@/components/bb/card';
import { ChipSelect } from '@/components/bb/chip-select';
import { Field } from '@/components/bb/field';
import { EmptyNote, ListRow } from '@/components/bb/list-row';
import { PhaseCard } from '@/components/bb/phase-card';
import { ScreenHeader } from '@/components/bb/screen-header';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useVault } from '@/context/vault-context';
import { AwardEntry, BulletCategory, BulletEntry, DateEntry, uid } from '@/lib/app-data';

const BRANCHES = ['Army', 'Navy', 'Air Force', 'Marine Corps', 'Space Force', 'Coast Guard'] as const;
const COMPONENTS = ['Active Duty', 'Reserve', 'National Guard'] as const;
const BULLET_CATEGORIES: readonly BulletCategory[] = ['Leadership', 'Training', 'Community', 'Mission Impact'];

const PUBS: Record<string, [string, string][]> = {
  Army: [
    ['AR 600-8-19', 'Enlisted Promotions & Demotions'],
    ['AR 623-3', 'Evaluation Reporting System (regulation)'],
    ['DA PAM 623-3', 'Evaluation Reporting System (guidance)'],
    ['AR 670-1', 'Wear & Appearance of Uniforms'],
    ['AR 600-8-22', 'Military Awards'],
  ],
  Navy: [
    ['BUPERSINST 1610.10', 'Navy Performance Evaluation System (EVALMAN)'],
    ['MILPERSMAN 1610', 'Performance & Conduct'],
    ['NAVPERS 15665', 'Uniform Regulations'],
    ['SECNAVINST 1650.1', 'Navy & Marine Corps Awards Manual'],
  ],
  'Air Force': [
    ['AFI 36-2406', 'Officer & Enlisted Evaluation Systems'],
    ['DAFI 36-2903', 'Dress & Personal Appearance'],
    ['DAFI 36-2803', 'Military Decorations & Awards Program'],
    ['DAFMAN 36-2806', 'Military Awards: Criteria & Procedures'],
  ],
  'Marine Corps': [
    ['MCO 1610.7', 'Performance Evaluation System'],
    ['MCO 1020.34', 'Marine Corps Uniform Regulations'],
    ['MCO 1650.19', 'Decorations, Medals & Awards Procedures'],
  ],
  'Space Force': [
    ['SPFI 36-2401', 'Guardian Evaluations Systems'],
    ['SPFI 36-2903', 'Dress & Appearance'],
    ['DAFI 36-2803', 'Military Decorations & Awards (applies to USSF)'],
    ['DAFMAN 36-2806', 'Military Awards: Criteria & Procedures'],
  ],
  'Coast Guard': [
    ['COMDTINST M1000.2', 'Enlistments, Evaluations & Advancements'],
    ['COMDTINST M1000.3', 'Officer Accessions, Evaluations & Promotions'],
    ['COMDTINST M1650.25', 'Medals & Awards Manual'],
    ['COMDTINST M1020.6', 'Uniform Regulations'],
  ],
};

export default function ServiceScreen() {
  const { data, updateData } = useVault();
  const [dateInput, setDateInput] = useState('');
  const [dateLabel, setDateLabel] = useState('');
  const [awardName, setAwardName] = useState('');
  const [awardDate, setAwardDate] = useState('');
  const [awardOrders, setAwardOrders] = useState('');
  const [bulletCategory, setBulletCategory] = useState<BulletCategory>('Leadership');
  const [bulletText, setBulletText] = useState('');

  if (!data) return null;
  const { profile, dates, awards, bullets } = data;

  const addDate = () => {
    if (!dateInput || !dateLabel.trim()) return;
    const entry: DateEntry = { id: uid(), date: dateInput, label: dateLabel.trim() };
    updateData((d) => ({ ...d, dates: [...d.dates, entry] }));
    setDateInput('');
    setDateLabel('');
  };

  const addAward = () => {
    if (!awardName.trim()) return;
    const entry: AwardEntry = { id: uid(), name: awardName.trim(), date: awardDate, orders: awardOrders.trim() };
    updateData((d) => ({ ...d, awards: [...d.awards, entry] }));
    setAwardName('');
    setAwardDate('');
    setAwardOrders('');
  };

  const addBullet = () => {
    if (!bulletText.trim()) return;
    const entry: BulletEntry = { id: uid(), category: bulletCategory, text: bulletText.trim() };
    updateData((d) => ({ ...d, bullets: [...d.bullets, entry] }));
    setBulletText('');
  };

  const pubs = PUBS[profile.branch] ?? null;

  return (
    <SafeAreaView edges={['top']} style={styles.flex}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + Spacing.four }]}>
        <ScreenHeader
          eyebrow="01 · SERVICE RECORD"
          title="Service"
          description="Your profile, branch references, key dates, decorations, and a bullet bank for your next eval."
        />

        <PhaseCard ets={profile.ets} />

        <Card title="Profile">
          <Field
            label="Name"
            placeholder="Last, First"
            value={profile.name}
            onChangeText={(v) => updateData((d) => ({ ...d, profile: { ...d.profile, name: v } }))}
          />
          <ChipSelect
            label="Branch"
            value={profile.branch}
            options={BRANCHES}
            onChange={(v) => updateData((d) => ({ ...d, profile: { ...d.profile, branch: v } }))}
          />
          <ChipSelect
            label="Component"
            value={profile.component}
            options={COMPONENTS}
            onChange={(v) => updateData((d) => ({ ...d, profile: { ...d.profile, component: v } }))}
          />
          <View style={styles.fieldRow}>
            <Field
              label="Rank / Rate"
              placeholder="e.g. SSG, PO2, Capt"
              value={profile.rank}
              onChangeText={(v) => updateData((d) => ({ ...d, profile: { ...d.profile, rank: v } }))}
            />
            <Field
              label="Unit"
              placeholder="Unit / duty station"
              value={profile.unit}
              onChangeText={(v) => updateData((d) => ({ ...d, profile: { ...d.profile, unit: v } }))}
            />
          </View>
          <Field
            label="ETS / EAS Date"
            placeholder="YYYY-MM-DD"
            value={profile.ets}
            onChangeText={(v) => updateData((d) => ({ ...d, profile: { ...d.profile, ets: v } }))}
          />
        </Card>

        <Card title="Branch Publications" hint="quick reference — verify current version">
          {pubs ? (
            pubs.map(([code, label]) => (
              <View key={code} style={styles.pubRow}>
                <ThemedText type="code" themeColor="accent" style={styles.pubCode}>
                  {code}
                </ThemedText>
                <ThemedText type="small" style={styles.pubLabel}>
                  {label}
                </ThemedText>
              </View>
            ))
          ) : (
            <EmptyNote text="Select your branch above to see relevant publications." />
          )}
        </Card>

        <Card title="Important Dates">
          {dates.length === 0 ? (
            <EmptyNote text="No dates tracked yet." />
          ) : (
            [...dates]
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((d) => (
                <ListRow
                  key={d.id}
                  eyebrow={d.date}
                  title={d.label}
                  onRemove={() =>
                    updateData((data) => ({ ...data, dates: data.dates.filter((x) => x.id !== d.id) }))
                  }
                />
              ))
          )}
          <View style={styles.addRow}>
            <Field label="Date" placeholder="YYYY-MM-DD" value={dateInput} onChangeText={setDateInput} />
            <Field label="Label" placeholder="Promotion board, PCS date..." value={dateLabel} onChangeText={setDateLabel} />
          </View>
          <BBButton label="Add date" variant="accent" onPress={addDate} />
        </Card>

        <Card title="Awards & Decorations">
          {awards.length === 0 ? (
            <EmptyNote text="No awards logged yet." />
          ) : (
            [...awards]
              .reverse()
              .map((a) => (
                <ListRow
                  key={a.id}
                  eyebrow={a.date}
                  title={a.name}
                  subtitle={a.orders ? `Orders # ${a.orders}` : undefined}
                  onRemove={() =>
                    updateData((data) => ({ ...data, awards: data.awards.filter((x) => x.id !== a.id) }))
                  }
                />
              ))
          )}
          <View style={styles.addRow}>
            <Field label="Award name" value={awardName} onChangeText={setAwardName} />
            <Field label="Date" placeholder="YYYY-MM-DD" value={awardDate} onChangeText={setAwardDate} />
            <Field label="Orders #" value={awardOrders} onChangeText={setAwardOrders} />
          </View>
          <BBButton label="Add award" variant="accent" onPress={addAward} />
        </Card>

        <Card title="Bullet Bank" hint="for your next EPR / OPR / NCOER / FITREP">
          {bullets.length === 0 ? (
            <EmptyNote text="No bullets saved yet." />
          ) : (
            [...bullets]
              .reverse()
              .map((b) => (
                <ListRow
                  key={b.id}
                  eyebrow={b.category}
                  title={b.text}
                  onRemove={() =>
                    updateData((data) => ({ ...data, bullets: data.bullets.filter((x) => x.id !== b.id) }))
                  }
                />
              ))
          )}
          <ChipSelect label="Category" value={bulletCategory} options={BULLET_CATEGORIES} onChange={(v) => setBulletCategory(v as BulletCategory)} />
          <Field
            label="Bullet"
            placeholder="e.g. Led 12-Soldier team through NTC rotation, zero safety incidents"
            value={bulletText}
            onChangeText={setBulletText}
          />
          <BBButton label="Add bullet" variant="accent" onPress={addBullet} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.one },
  fieldRow: { flexDirection: 'row', gap: Spacing.two },
  addRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  pubRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  pubCode: { minWidth: 130 },
  pubLabel: { flex: 1 },
});
