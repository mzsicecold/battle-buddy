import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BBButton } from '@/components/bb/bb-button';
import { Card } from '@/components/bb/card';
import { ChipSelect } from '@/components/bb/chip-select';
import { Field } from '@/components/bb/field';
import { EmptyNote, ListRow } from '@/components/bb/list-row';
import { Pill } from '@/components/bb/pill';
import { Resource, ResourceCard } from '@/components/bb/resource-card';
import { ScreenHeader } from '@/components/bb/screen-header';
import { ThemedText } from '@/components/themed-text';
import { VETERANS_CRISIS_LINE } from '@/constants/crisis-resources';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useVault } from '@/context/vault-context';
import { useTheme } from '@/hooks/use-theme';
import { JournalEntry, uid } from '@/lib/app-data';
import {
  MOODS,
  PROMPT_SAFETY_NOTE,
  localIsoDate,
  moodSummary,
  phaseTag,
  promptAt,
  promptSource,
  promptsForPhase,
} from '@/lib/resilience-prompts';
import { getTransition, todayDay } from '@/lib/transition-timeline';

const MENTAL_HEALTH_RESOURCES: Resource[] = [
  VETERANS_CRISIS_LINE,
  {
    name: 'Military OneSource Non-Medical Counseling',
    detail: 'Free, confidential, up to 12 sessions per issue — in person, phone, or video',
    actions: [{ label: 'Call', url: 'tel:18003429647' }],
  },
  {
    name: 'Vet Centers (Readjustment Counseling)',
    detail: 'Community-based counseling for combat vets, service members, and families · 877-927-8387 (24/7)',
    actions: [{ label: 'Call', url: 'tel:18779278387' }],
  },
];

export default function ResilienceScreen() {
  const { data, updateData } = useVault();
  const theme = useTheme();
  const [draft, setDraft] = useState('');
  const [mood, setMood] = useState<string>(MOODS[0]);

  if (!data) return null;
  const { journal, promptIndex, profile } = data;

  // The prompts follow the phase the person is in, from the ETS / EAS date on the Service tab.
  const transition = getTransition(profile.ets, todayDay());
  const phase = transition?.phase ?? null;
  const phaseId = phase?.id ?? null;
  const prompt = promptAt(phaseId, promptIndex);
  const source = promptSource(phaseId, prompt);
  const pillLabel = phase ? (phase.id === 0 ? phase.name : `Phase ${phase.id} · ${phase.name}`) : null;
  const moods = moodSummary(journal, localIsoDate());

  const nextPrompt = () => {
    const poolSize = promptsForPhase(phaseId).length;
    updateData((d) => ({ ...d, promptIndex: (d.promptIndex + 1) % poolSize }));
  };

  const addJournalEntry = () => {
    if (!draft.trim()) return;
    const entry: JournalEntry = {
      id: uid(),
      date: localIsoDate(),
      mood,
      text: draft.trim(),
      // Phase 0 has no workbook phase, so only phases 1 to 5 are recorded.
      ...(phaseId !== null && phaseId >= 1 ? { phase: phaseId } : {}),
    };
    updateData((d) => ({ ...d, journal: [...d.journal, entry] }));
    setDraft('');
  };

  return (
    <SafeAreaView edges={['top']} style={styles.flex}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + Spacing.four }]}>
        <ScreenHeader
          eyebrow="04 · REFLECTION"
          title="Resilience"
          description="A private space to think out loud. Nothing here leaves your device."
        />

        <Card title="Today's Prompt" hint={phase?.window}>
          {pillLabel ? <Pill label={pillLabel} tone="teal" /> : null}
          {phase ? (
            <ThemedText type="small" themeColor="textSecondary">
              {phase.question}
            </ThemedText>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Add your ETS / EAS date on the Service tab to get prompts for the phase you are in. These are general
              prompts for now.
            </ThemedText>
          )}
          <ThemedText
            style={[styles.promptBox, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
            {prompt.text}
          </ThemedText>
          {prompt.note ? (
            <ThemedText type="small" themeColor="textSecondary">
              {prompt.note}
            </ThemedText>
          ) : null}
          {source ? (
            <ThemedText type="small" themeColor="textSecondary">
              {source}. The workbook goes deeper.
            </ThemedText>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary">
            {PROMPT_SAFETY_NOTE}
          </ThemedText>
          <BBButton label="Try another prompt" onPress={nextPrompt} />
        </Card>

        <Card title="Journal">
          <Field
            label="New entry"
            placeholder="Write whatever's on your mind..."
            multiline
            numberOfLines={4}
            value={draft}
            onChangeText={setDraft}
            style={styles.journalInput}
          />
          <ChipSelect label="Mood" value={mood} options={MOODS} onChange={setMood} />
          <BBButton label="Save entry" variant="accent" onPress={addJournalEntry} />

          {moods.length > 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.moodSummary}>
              Last 30 days: {moods.map((m) => `${m.mood} ${m.count}`).join(' · ')}
            </ThemedText>
          ) : null}

          {journal.length === 0 ? (
            <EmptyNote text="No entries yet — your first one starts the log." />
          ) : (
            [...journal]
              .reverse()
              .map((j) => {
                const tag = phaseTag(j.phase);
                return (
                  <ListRow
                    key={j.id}
                    eyebrow={`${j.date} · ${j.mood}${tag ? ` · ${tag}` : ''}`}
                    title={j.text}
                    onRemove={() =>
                      updateData((d) => ({ ...d, journal: d.journal.filter((x) => x.id !== j.id) }))
                    }
                  />
                );
              })
          )}
        </Card>

        <Card title="Mental Health Resources">
          {MENTAL_HEALTH_RESOURCES.map((r) => (
            <ResourceCard key={r.name} resource={r} />
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.one },
  promptBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    fontSize: 15,
    fontStyle: 'italic',
    marginBottom: Spacing.two,
  },
  journalInput: { minHeight: 90, textAlignVertical: 'top' },
  moodSummary: { marginTop: Spacing.one },
});
