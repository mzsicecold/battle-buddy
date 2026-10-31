import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/bb/card';
import { Field } from '@/components/bb/field';
import { Resource, ResourceCard } from '@/components/bb/resource-card';
import { ScreenHeader } from '@/components/bb/screen-header';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useVault } from '@/context/vault-context';

const CRISIS_RESOURCES: Resource[] = [
  {
    name: 'Veterans / Military Crisis Line',
    detail: 'Dial 988, then press 1 · Text 838255 · Confidential chat at VeteransCrisisLine.net',
    actions: [
      { label: 'Call 988', url: 'tel:988' },
      { label: 'Text', url: 'sms:838255' },
    ],
    crisis: true,
  },
  {
    name: 'DoD Safe Helpline (SAPR)',
    detail: 'Sexual assault support — confidential, 24/7 · Text your base or ZIP to 55-247 to find local responders',
    actions: [
      { label: 'Call', url: 'tel:8779955247' },
      { label: 'Text', url: 'sms:55247' },
    ],
    crisis: true,
  },
];

const SUPPORT_RESOURCES: Resource[] = [
  {
    name: 'Military OneSource',
    detail: 'Free counseling, financial coaching, and referrals for service members and families',
    actions: [{ label: 'Call', url: 'tel:18003429647' }],
  },
  {
    name: 'TRICARE Nurse Advice Line',
    detail: '24/7 nurse guidance on symptoms, care options, and whether to seek urgent care · press option 1',
    actions: [{ label: 'Call', url: 'tel:18008742273' }],
  },
];

export default function HelpScreen() {
  const { data, updateData } = useVault();
  if (!data) return null;
  const { sapr } = data;

  return (
    <SafeAreaView edges={['top']} style={styles.flex}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + Spacing.four }]}>
        <ScreenHeader
          eyebrow="03 · CRISIS & SUPPORT"
          title="Help"
          description="If you or someone you know is in crisis, these lines are staffed 24/7. You don't need to be in uniform to use them."
        />

        <Card title="In Crisis Right Now">
          {CRISIS_RESOURCES.map((r) => (
            <ResourceCard key={r.name} resource={r} />
          ))}
        </Card>

        <Card title="Ongoing Support">
          {SUPPORT_RESOURCES.map((r) => (
            <ResourceCard key={r.name} resource={r} />
          ))}
        </Card>

        <Card title="Your Unit SAPR Points of Contact" hint="fill in with your local installation's info">
          <View style={styles.fieldRow}>
            <Field
              label="SARC Name"
              value={sapr.sarcName}
              onChangeText={(v) => updateData((d) => ({ ...d, sapr: { ...d.sapr, sarcName: v } }))}
            />
            <Field
              label="SARC Phone"
              keyboardType="phone-pad"
              value={sapr.sarcPhone}
              onChangeText={(v) => updateData((d) => ({ ...d, sapr: { ...d.sapr, sarcPhone: v } }))}
            />
          </View>
          <View style={styles.fieldRow}>
            <Field
              label="Victim Advocate Name"
              value={sapr.vaName}
              onChangeText={(v) => updateData((d) => ({ ...d, sapr: { ...d.sapr, vaName: v } }))}
            />
            <Field
              label="Victim Advocate Phone"
              keyboardType="phone-pad"
              value={sapr.vaPhone}
              onChangeText={(v) => updateData((d) => ({ ...d, sapr: { ...d.sapr, vaPhone: v } }))}
            />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.one },
  fieldRow: { flexDirection: 'row', gap: Spacing.two },
});
