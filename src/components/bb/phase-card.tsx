import { useMemo } from 'react';
import { View } from 'react-native';

import { Card } from '@/components/bb/card';
import { EmptyNote, ListRow } from '@/components/bb/list-row';
import { Pill } from '@/components/bb/pill';
import { ThemedText } from '@/components/themed-text';
import {
  describeDays,
  formatDay,
  getTransition,
  TIMELINE_LAST_VERIFIED,
  todayDay,
} from '@/lib/transition-timeline';

const NEXT_COUNT = 4;

export function PhaseCard({ ets }: { ets: string }) {
  const today = todayDay();
  const transition = useMemo(() => getTransition(ets, today), [ets, today]);

  if (!ets.trim()) {
    return (
      <Card title="Where you are">
        <EmptyNote text="Add your ETS / EAS date in your profile below to see where you are in your transition and the dates that matter." />
      </Card>
    );
  }
  if (!transition) {
    return (
      <Card title="Where you are">
        <EmptyNote text="Enter your ETS / EAS date as YYYY-MM-DD (for example 2027-06-30) to see your timeline." />
      </Card>
    );
  }

  const { phase, daysOut, upcoming, passedNotes, ets: etsDay } = transition;
  const pillLabel = phase.id === 0 ? phase.name : `Phase ${phase.id} · ${phase.name}`;
  const status =
    daysOut > 0
      ? `${daysOut} ${daysOut === 1 ? 'day' : 'days'} until ${formatDay(etsDay)}`
      : daysOut === 0
        ? `Your date is today (${formatDay(etsDay)})`
        : `${-daysOut} ${daysOut === -1 ? 'day' : 'days'} since ${formatDay(etsDay)}`;

  return (
    <Card title="Where you are" hint={phase.window}>
      <Pill label={pillLabel} tone="teal" />
      <ThemedText type="small">{status}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {phase.question}
      </ThemedText>

      {passedNotes.map((note) => (
        <ThemedText key={note} type="small" themeColor="accentStrong">
          {note}
        </ThemedText>
      ))}

      <View>
        <ThemedText type="smallBold" style={{ marginTop: 4 }}>
          NEXT DATES
        </ThemedText>
        {upcoming.length === 0 ? (
          <EmptyNote text="No dates ahead. You are past the windows tracked here." />
        ) : (
          upcoming.slice(0, NEXT_COUNT).map((m) => (
            <ListRow
              key={m.id}
              eyebrow={`${formatDay(m.day)} · ${describeDays(m.day - transition.today)}`}
              title={m.label}
              subtitle={m.detail}
            />
          ))
        )}
      </View>

      <ThemedText type="small" themeColor="textFaint">
        Counted from your date using DoD, VA, and TRICARE guidance last checked {TIMELINE_LAST_VERIFIED}. Rules differ by
        service, separation type, and installation. Confirm yours with your transition office or a Veterans Service Officer.
      </ThemedText>
    </Card>
  );
}
