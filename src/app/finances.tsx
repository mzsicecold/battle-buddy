import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/bb/card';
import { Field } from '@/components/bb/field';
import { ScreenHeader } from '@/components/bb/screen-header';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useVault } from '@/context/vault-context';
import { useTheme } from '@/hooks/use-theme';
import { Finances } from '@/lib/app-data';

function num(v: string): number {
  const n = parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
}
function fmtMoney(n: number): string {
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function FinancesScreen() {
  const { data, updateData } = useVault();
  const theme = useTheme();
  if (!data) return null;
  const f = data.finances;

  const setF = (key: keyof Finances) => (v: string) =>
    updateData((d) => ({ ...d, finances: { ...d.finances, [key]: v } }));

  const gross = num(f.base) + num(f.bah) + num(f.bas) + num(f.special);
  const deductions = num(f.sgli) + num(f.fedtax) + num(f.statetax) + num(f.tspded) + num(f.otherded);
  const netPay = gross - deductions;
  const tspTotal = num(f.tspTrad) + num(f.tspRoth);

  const funds: { key: keyof Finances; label: string; color: string }[] = [
    { key: 'fundC', label: 'C', color: theme.accent },
    { key: 'fundS', label: 'S', color: theme.teal },
    { key: 'fundI', label: 'I', color: theme.success },
    { key: 'fundF', label: 'F', color: theme.textFaint },
    { key: 'fundG', label: 'G', color: theme.border },
    { key: 'fundL', label: 'L', color: theme.crisis },
  ];
  const fundSum = funds.reduce((sum, fund) => sum + num(f[fund.key]), 0);

  return (
    <SafeAreaView edges={['top']} style={styles.flex}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + Spacing.four }]}>
        <ScreenHeader
          eyebrow="02 · PAY & INVESTMENTS"
          title="Finances"
          description="Track your LES at a glance, watch your TSP allocation, and keep your own notes on strategy."
        />

        <Card title="LES Snapshot">
          <View style={styles.fieldRow}>
            <Field label="Base Pay" keyboardType="decimal-pad" value={f.base} onChangeText={setF('base')} />
            <Field label="BAH" keyboardType="decimal-pad" value={f.bah} onChangeText={setF('bah')} />
          </View>
          <View style={styles.fieldRow}>
            <Field label="BAS" keyboardType="decimal-pad" value={f.bas} onChangeText={setF('bas')} />
            <Field label="Special / Incentive Pay" keyboardType="decimal-pad" value={f.special} onChangeText={setF('special')} />
          </View>
          <View style={styles.fieldRow}>
            <Field label="SGLI" keyboardType="decimal-pad" value={f.sgli} onChangeText={setF('sgli')} />
            <Field label="Federal Tax" keyboardType="decimal-pad" value={f.fedtax} onChangeText={setF('fedtax')} />
          </View>
          <View style={styles.fieldRow}>
            <Field label="State Tax" keyboardType="decimal-pad" value={f.statetax} onChangeText={setF('statetax')} />
            <Field label="TSP Contribution" keyboardType="decimal-pad" value={f.tspded} onChangeText={setF('tspded')} />
          </View>
          <View style={styles.fieldRow}>
            <Field label="Other Deductions" keyboardType="decimal-pad" value={f.otherded} onChangeText={setF('otherded')} />
          </View>
          <ThemedText type="small" themeColor="textFaint" style={styles.disclaimer}>
            Estimated net pay: <ThemedText type="smallBold">{fmtMoney(netPay)}</ThemedText> — figures you
            enter here, for your own tracking only. Always confirm against your official LES in myPay.
          </ThemedText>
        </Card>

        <Card title="TSP Balance & Allocation">
          <View style={styles.fieldRow}>
            <Field label="Traditional Balance" keyboardType="decimal-pad" value={f.tspTrad} onChangeText={setF('tspTrad')} />
            <Field label="Roth Balance" keyboardType="decimal-pad" value={f.tspRoth} onChangeText={setF('tspRoth')} />
          </View>
          <View style={styles.fieldRow}>
            <Field label="Contribution Rate (%)" keyboardType="decimal-pad" value={f.tspRate} onChangeText={setF('tspRate')} />
            <Field label="C Fund %" keyboardType="decimal-pad" value={f.fundC} onChangeText={setF('fundC')} />
          </View>
          <View style={styles.fieldRow}>
            <Field label="S Fund %" keyboardType="decimal-pad" value={f.fundS} onChangeText={setF('fundS')} />
            <Field label="I Fund %" keyboardType="decimal-pad" value={f.fundI} onChangeText={setF('fundI')} />
          </View>
          <View style={styles.fieldRow}>
            <Field label="F Fund %" keyboardType="decimal-pad" value={f.fundF} onChangeText={setF('fundF')} />
            <Field label="G Fund %" keyboardType="decimal-pad" value={f.fundG} onChangeText={setF('fundG')} />
          </View>
          <View style={styles.fieldRow}>
            <Field label="L Fund (Lifecycle) %" keyboardType="decimal-pad" value={f.fundL} onChangeText={setF('fundL')} />
          </View>

          <View style={[styles.allocBar, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
            {fundSum > 0 &&
              funds.map((fund) => {
                const pct = num(f[fund.key]) / fundSum;
                if (pct <= 0) return null;
                return (
                  <View
                    key={fund.key}
                    style={{ width: `${pct * 100}%`, backgroundColor: fund.color, height: '100%' }}
                  />
                );
              })}
          </View>
          <View style={styles.legend}>
            {funds.map((fund) => (
              <View key={fund.key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: fund.color }]} />
                <ThemedText type="small" themeColor="textSecondary">
                  {fund.label} Fund — {num(f[fund.key])}%
                </ThemedText>
              </View>
            ))}
          </View>
          <ThemedText type="small" themeColor="textFaint" style={styles.disclaimer}>
            Total TSP balance: <ThemedText type="smallBold">{fmtMoney(tspTotal)}</ThemedText>
          </ThemedText>
        </Card>

        <Card title="Investment Strategy Notes">
          <Field
            label="Notes"
            multiline
            numberOfLines={4}
            value={f.invNotes}
            onChangeText={setF('invNotes')}
            style={styles.notesInput}
          />
          <ThemedText type="small" themeColor="textFaint" style={styles.disclaimer}>
            This app doesn&apos;t give personalized investment advice. Military OneSource offers free,
            no-cost financial counseling — a good place to pressure-test any strategy.
          </ThemedText>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.one },
  fieldRow: { flexDirection: 'row', gap: Spacing.two },
  disclaimer: { marginTop: Spacing.one, lineHeight: 17 },
  allocBar: {
    flexDirection: 'row',
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: Spacing.two,
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.two },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 2 },
  notesInput: { minHeight: 90, textAlignVertical: 'top' },
});
