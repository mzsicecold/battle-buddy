import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BBButton } from '@/components/bb/bb-button';
import { Card } from '@/components/bb/card';
import { ChipSelect } from '@/components/bb/chip-select';
import { Field } from '@/components/bb/field';
import { EmptyNote, ListRow } from '@/components/bb/list-row';
import { Resource, ResourceCard } from '@/components/bb/resource-card';
import { ScreenHeader } from '@/components/bb/screen-header';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useVault } from '@/context/vault-context';
import { useTheme } from '@/hooks/use-theme';
import { JournalEntry, uid } from '@/lib/app-data';

const PROMPTS = [
  "What's one thing this week that went better than you expected?",
  "If your battle buddy could see one thing you're proud of right now, what would it be?",
  "What's weighing on you that you haven't said out loud yet?",
  'Name one person who has had your back lately. Have you told them?',
  "What does 'mission accomplished' look like for you outside of work?",
  'What is a rule you hold yourself to that might be worth loosening?',
  "If today was a training day, what's the one lesson you'd carry forward?",
  'What are you looking forward to in the next 30 days?',
  'What is something you needed to hear this week — and can you say it to yourself?',
  'Where do you feel most like yourself these days?',
];

const MOODS = ['Steady', 'Tired', 'Wired', 'Low', 'Good'] as const;

const MENTAL_HEALTH_RESOURCES: Resource[] = [
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
  const { journal, promptIndex } = data;
  const prompt = PROMPTS[promptIndex % PROMPTS.length];

  const shufflePrompt = () => {
    updateData((d) => ({ ...d, promptIndex: (d.promptIndex + 1) % PROMPTS.length }));
  };

  const addJournalEntry = () => {
    if (!draft.trim()) return;
    const entry: JournalEntry = {
      id: uid(),
      date: new Date().toISOString().slice(0, 10),
      mood,
      text: draft.trim(),
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

        <Card title="Today's Prompt">
          <ThemedText
            style={[styles.promptBox, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
            {prompt}
          </ThemedText>
          <BBButton label="Try another prompt" onPress={shufflePrompt} />
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

          {journal.length === 0 ? (
            <EmptyNote text="No entries yet — your first one starts the log." />
          ) : (
            [...journal]
              .reverse()
              .map((j) => (
                <ListRow
                  key={j.id}
                  eyebrow={`${j.date} · ${j.mood}`}
                  title={j.text}
                  onRemove={() =>
                    updateData((d) => ({ ...d, journal: d.journal.filter((x) => x.id !== j.id) }))
                  }
                />
              ))
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
});
