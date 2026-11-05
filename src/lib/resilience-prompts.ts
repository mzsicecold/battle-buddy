// Prompts for the Resilience tab, matched to the phase of the transition the person is in.
//
// Phases 1 to 5 use the prompts printed in the workbook, The Last Year in Uniform, word for word and
// with the workbook's own numbers, so the app and the book point at the same questions. The wording
// comes from the workbook's draft files, and all 41 were checked word for word against the Word copy
// snapshot of 2026-11-03. If the workbook text changes, change it here too. Two sentences are the app's
// own small adaptations of workbook cautions ("skip" for "mark", "this one" for "these"), because the app
// shows one prompt at a time; they are the ones to show a clinician. Phase 0 (more than a year out, or
// no date entered) has no workbook phase yet, so it keeps the general prompts the app shipped with.
//
// Imports nothing from React Native so it can be unit-tested directly.

import { parseDay, type PhaseInfo } from './transition-timeline.ts';

export type PhaseId = PhaseInfo['id'];

export interface ResiliencePrompt {
  text: string;
  /** Number within its workbook phase. Absent for the general prompts. */
  n?: number;
  /** A caution the workbook prints beside the prompt, shown under it. */
  note?: string;
}

export const WORKBOOK_TITLE = 'The Last Year in Uniform';

/** Shown under every prompt. Follows the workbook's own line before each set of prompts. */
export const PROMPT_SAFETY_NOTE =
  'Answer only what is useful. If a prompt stirs up more than you can process today, skip it and come back with support.';

const GENERAL: readonly ResiliencePrompt[] = [
  { text: "What's one thing this week that went better than you expected?" },
  { text: "If your battle buddy could see one thing you're proud of right now, what would it be?" },
  { text: "What's weighing on you that you haven't said out loud yet?" },
  { text: 'Name one person who has had your back lately. Have you told them?' },
  { text: "What does 'mission accomplished' look like for you outside of work?" },
  { text: 'What is a rule you hold yourself to that might be worth loosening?' },
  { text: "If today was a training day, what's the one lesson you'd carry forward?" },
  { text: 'What are you looking forward to in the next 30 days?' },
  { text: 'What is something you needed to hear this week — and can you say it to yourself?' },
  { text: 'Where do you feel most like yourself these days?' },
];

const numbered = (texts: string[], notes: Record<number, string> = {}): ResiliencePrompt[] =>
  texts.map((text, i) => ({ text, n: i + 1, ...(notes[i + 1] ? { note: notes[i + 1] } : {}) }));

export const PHASE_PROMPTS: Record<PhaseId, readonly ResiliencePrompt[]> = {
  0: GENERAL,

  // Phase 1: Name It
  1: numbered([
    'What parts of service gave you structure, identity, pride, or belonging?',
    'Which parts will you miss, and which are you relieved to be leaving?',
    'Where are you judging yourself for not yet having a clear plan for what comes next?',
    'What would you say to someone who served beside you and was going through the same thing?',
    'Who were you before you joined, and which parts of that person still matter?',
    'When you hold yourself back or push too hard, what are you usually trying to avoid feeling?',
    'Which inner voice sounds like an old evaluator, supervisor, instructor, or commander?',
    'What does that voice demand of you, and what does it fear would happen without those demands?',
    'What would a wiser inner leader say instead?',
  ]),

  // Phase 2: Build the Frame
  2: numbered([
    'What parts of military structure helped you perform well?',
    'What civilian routines could recreate the useful parts without recreating the pressure?',
    'Where do you treat open time as proof that you are drifting?',
    'What would a realistic weekly rhythm look like for this season of your life?',
    'What strengths did service sharpen that civilian life still needs?',
    'Where do you confuse being needed with being worthy?',
    'What roles do you want to grow into now?',
    'What do you want people to know about you that your rank never told them?',
  ]),

  // Phase 3: Let It Land
  3: numbered(
    [
      'What losses have you minimized because other people might not understand them?',
      'What do you miss, or expect to miss, that surprises you?',
      'What emotion is easiest for you to show, and which one stays hidden?',
      'What would it look like to grieve without losing momentum?',
      'When do you feel most on guard in off-duty or civilian settings?',
      'What does your body do before your mind realizes you are stressed?',
      'Where do you confuse calm with losing your edge?',
      'What would "safe enough" feel like this week?',
    ],
    {
      6: 'If paying attention to your body feels worse, not better, skip this one. Look around the room instead, or talk to someone.',
    }
  ),

  // Phase 4: Step Forward
  4: numbered([
    'What do you want that you have been talking yourself out of?',
    'Which goals are truly yours, and which are attempts to prove you are still useful?',
    "What would you pursue if you didn't need to justify it as practical?",
    'How can desire and discipline work together?',
    'Where do you tell yourself no one will understand before you give them a chance?',
    'What kind of support do you actually want this season?',
    'Who has earned access to more honest information about you?',
    "What is one small ask that wouldn't compromise your dignity?",
  ]),

  // Phase 5: Settle In
  5: numbered([
    'Where do you turn discipline into punishment?',
    'What habit would matter even at a smaller scale?',
    'What does your all-or-nothing pattern cost you?',
    'How can you define a minimum version of progress?',
    'Where are you waiting to feel fully ready before taking a next step?',
    'What area of civilian life makes you feel like a beginner?',
    'What would a low-risk experiment teach you?',
    'Which skill from service helps you adapt quickly?',
  ]),
};

/** The prompts for a phase. `null` (no valid ETS date entered) gets the general prompts. */
export function promptsForPhase(phaseId: PhaseId | null): readonly ResiliencePrompt[] {
  return PHASE_PROMPTS[phaseId ?? 0];
}

/** The prompt at a position, wrapping around, so any stored index (including a stale one) is safe. */
export function promptAt(phaseId: PhaseId | null, index: number): ResiliencePrompt {
  const pool = promptsForPhase(phaseId);
  const i = Number.isFinite(index) ? Math.trunc(index) : 0;
  return pool[((i % pool.length) + pool.length) % pool.length];
}

/**
 * "The Last Year in Uniform · Phase 2 · prompt 6", or null for the general prompts. The spaces inside
 * "Phase 2" and "prompt 6" are non-breaking, so a narrow screen never leaves a lone number at the start
 * of a line.
 */
export function promptSource(phaseId: PhaseId | null, prompt: ResiliencePrompt): string | null {
  if (phaseId === null || phaseId === 0 || prompt.n === undefined) return null;
  return `${WORKBOOK_TITLE} · Phase ${phaseId} · prompt ${prompt.n}`;
}

/** Label for a journal entry's phase tag, or '' when it has none (older entries, or no date entered). */
export function phaseTag(phase: number | undefined): string {
  return phase !== undefined && Number.isInteger(phase) && phase >= 1 && phase <= 5 ? `Phase ${phase}` : '';
}

// ---- Mood trend ------------------------------------------------------------------------------

export const MOODS = ['Steady', 'Tired', 'Wired', 'Low', 'Good'] as const;

/** Today's date on this device as YYYY-MM-DD. (toISOString would give tomorrow's date on an evening in the US.) */
export function localIsoDate(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export interface MoodCount {
  mood: string;
  count: number;
}

/**
 * How many entries had each mood in the last `days` days (today included). Moods with no entries are left out,
 * known moods come first in their usual order, and any other label (from a future version) follows.
 * Entries with an unreadable date are ignored.
 */
export function moodSummary(
  entries: readonly { date: string; mood: string }[],
  todayIso: string,
  days = 30
): MoodCount[] {
  const today = parseDay(todayIso);
  if (today === null) return [];
  const counts = new Map<string, number>();
  for (const e of entries) {
    const day = parseDay(e.date);
    if (day === null || day > today || day <= today - days) continue;
    counts.set(e.mood, (counts.get(e.mood) ?? 0) + 1);
  }
  const known = MOODS.filter((m) => counts.has(m)).map((m) => ({ mood: m as string, count: counts.get(m)! }));
  const other = [...counts.keys()]
    .filter((m) => !(MOODS as readonly string[]).includes(m))
    .sort()
    .map((m) => ({ mood: m, count: counts.get(m)! }));
  return [...known, ...other];
}
