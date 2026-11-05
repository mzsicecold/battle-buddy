/**
 * Tests for src/lib/resilience-prompts.ts: which prompt the Resilience tab shows for each phase, the
 * journal's phase tag, and the 30-day mood summary.
 *
 * The prompt wording itself was checked against the workbook's Word copy by hand (all 41 workbook prompts
 * matched word for word on 2026-11-03). These tests cannot read that file, so they pin the structure the
 * app depends on: how many prompts each phase has, their workbook numbers, and the first and last of each,
 * so an accidental edit, reorder or deletion is noticed and has to be a deliberate change.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MOODS,
  PHASE_PROMPTS,
  PROMPT_SAFETY_NOTE,
  localIsoDate,
  moodSummary,
  phaseTag,
  promptAt,
  promptSource,
  promptsForPhase,
  type PhaseId,
} from '../src/lib/resilience-prompts.ts';

const PHASES: PhaseId[] = [1, 2, 3, 4, 5];

describe('the prompt pools', () => {
  it('has the workbook\'s number of prompts for each phase, numbered 1 to N in order', () => {
    const expected: Record<number, number> = { 1: 9, 2: 8, 3: 8, 4: 8, 5: 8 };
    for (const phase of PHASES) {
      const pool = PHASE_PROMPTS[phase];
      assert.equal(pool.length, expected[phase], `phase ${phase}`);
      assert.deepEqual(pool.map((p) => p.n), pool.map((_, i) => i + 1), `phase ${phase} numbering`);
    }
  });

  it('pins the first and last prompt of each phase to the workbook', () => {
    const ends: Record<number, [string, string]> = {
      1: [
        'What parts of service gave you structure, identity, pride, or belonging?',
        'What would a wiser inner leader say instead?',
      ],
      2: [
        'What parts of military structure helped you perform well?',
        'What do you want people to know about you that your rank never told them?',
      ],
      3: [
        'What losses have you minimized because other people might not understand them?',
        'What would "safe enough" feel like this week?',
      ],
      4: [
        'What do you want that you have been talking yourself out of?',
        "What is one small ask that wouldn't compromise your dignity?",
      ],
      5: [
        'Where do you turn discipline into punishment?',
        'Which skill from service helps you adapt quickly?',
      ],
    };
    for (const phase of PHASES) {
      const pool = PHASE_PROMPTS[phase];
      assert.equal(pool[0].text, ends[phase][0], `phase ${phase} first`);
      assert.equal(pool[pool.length - 1].text, ends[phase][1], `phase ${phase} last`);
    }
  });

  it('has only real, trimmed, unique questions, so no prompt is shown twice or empty', () => {
    const all = Object.values(PHASE_PROMPTS).flatMap((pool) => pool.map((p) => p.text));
    assert.equal(new Set(all).size, all.length, 'a prompt appears in two places');
    for (const text of all) {
      assert.equal(text, text.trim());
      assert.ok(text.length > 10);
      assert.ok(text.endsWith('?'), `not a question: ${text}`);
    }
  });

  it('keeps the general prompts for phase 0 and for no date', () => {
    assert.equal(PHASE_PROMPTS[0].length, 10);
    assert.equal(promptsForPhase(null), PHASE_PROMPTS[0]);
    assert.ok(PHASE_PROMPTS[0].every((p) => p.n === undefined));
  });

  it('carries the body-awareness caution on that one Phase 3 prompt and nowhere else', () => {
    const withNotes = Object.entries(PHASE_PROMPTS).flatMap(([phase, pool]) =>
      pool.filter((p) => p.note).map((p) => `${phase}:${p.n}`)
    );
    assert.deepEqual(withNotes, ['3:6']);
    const body = PHASE_PROMPTS[3][5];
    assert.match(body.text, /body/);
    assert.match(body.note!, /skip this one/);
  });

  it('shows the same safety line under every prompt, following the workbook', () => {
    assert.match(PROMPT_SAFETY_NOTE, /^Answer only what is useful\./);
    assert.match(PROMPT_SAFETY_NOTE, /support\.$/);
  });
});

describe('promptAt', () => {
  it('returns the prompt at the position and wraps around the pool', () => {
    const pool = PHASE_PROMPTS[2];
    assert.equal(promptAt(2, 0), pool[0]);
    assert.equal(promptAt(2, 7), pool[7]);
    assert.equal(promptAt(2, 8), pool[0]);
    assert.equal(promptAt(2, 8 * 50 + 3), pool[3]);
  });

  it('copes with a stored index that is negative, fractional, or not a number', () => {
    const pool = PHASE_PROMPTS[1];
    assert.equal(promptAt(1, -1), pool[8]);
    assert.equal(promptAt(1, 2.9), pool[2]);
    assert.equal(promptAt(1, Number.NaN), pool[0]);
    assert.equal(promptAt(1, Number.POSITIVE_INFINITY), pool[0]);
  });

  it('uses the general prompts when there is no phase', () => {
    assert.equal(promptAt(null, 3), PHASE_PROMPTS[0][3]);
  });

  it('stays valid when the phase changes under a stored index bigger than the new pool', () => {
    for (const phase of [0, ...PHASES] as PhaseId[]) assert.ok(promptAt(phase, 9).text.length > 0);
  });
});

describe('promptSource', () => {
  it('names the workbook, phase and prompt number', () => {
    // The spaces inside "Phase 2" and "prompt 6" are non-breaking (\u00A0) so a number is never left alone on a line.
    assert.equal(promptSource(2, PHASE_PROMPTS[2][5]), 'The Last Year in Uniform · Phase\u00A02 · prompt\u00A06');
    assert.equal(promptSource(5, PHASE_PROMPTS[5][7]), 'The Last Year in Uniform · Phase\u00A05 · prompt\u00A08');
  });

  it('says nothing for the general prompts, which are not from the workbook', () => {
    assert.equal(promptSource(0, PHASE_PROMPTS[0][0]), null);
    assert.equal(promptSource(null, PHASE_PROMPTS[0][0]), null);
  });
});

describe('phaseTag', () => {
  it('labels phases 1 to 5', () => {
    assert.deepEqual([1, 2, 3, 4, 5].map(phaseTag), ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Phase 5']);
  });

  it('is empty for older entries and for anything that is not a workbook phase', () => {
    for (const v of [undefined, 0, 6, -1, 2.5, Number.NaN]) assert.equal(phaseTag(v), '', String(v));
  });
});

describe('localIsoDate', () => {
  it('uses the device\'s calendar date, not UTC, so an evening entry is not dated tomorrow', () => {
    assert.equal(localIsoDate(new Date(2027, 5, 30, 23, 59)), '2027-06-30');
    assert.equal(localIsoDate(new Date(2027, 5, 30, 0, 1)), '2027-06-30');
    assert.equal(localIsoDate(new Date(2027, 0, 5, 12, 0)), '2027-01-05');
  });
});

describe('moodSummary', () => {
  const today = '2027-06-30';
  const e = (date: string, mood: string) => ({ date, mood });

  it('counts the last 30 days, today included, and leaves older entries out', () => {
    const out = moodSummary(
      [e('2027-06-30', 'Steady'), e('2027-06-01', 'Steady'), e('2027-05-31', 'Steady'), e('2027-05-01', 'Low')],
      today
    );
    assert.deepEqual(out, [{ mood: 'Steady', count: 2 }]);
  });

  it('lists moods in the usual order, skips ones with no entries, and counts repeats', () => {
    const out = moodSummary(
      [e('2027-06-29', 'Good'), e('2027-06-28', 'Low'), e('2027-06-27', 'Steady'), e('2027-06-26', 'Low'), e('2027-06-25', 'Steady'), e('2027-06-24', 'Steady')],
      today
    );
    assert.deepEqual(out, [
      { mood: 'Steady', count: 3 },
      { mood: 'Low', count: 2 },
      { mood: 'Good', count: 1 },
    ]);
    assert.deepEqual(out.map((m) => m.mood), MOODS.filter((m) => ['Steady', 'Low', 'Good'].includes(m)));
  });

  it('ignores entries dated in the future or with an unreadable date', () => {
    const out = moodSummary(
      [e('2027-07-01', 'Good'), e('not a date', 'Low'), e('2027-02-30', 'Tired'), e('2027-06-30', 'Wired')],
      today
    );
    assert.deepEqual(out, [{ mood: 'Wired', count: 1 }]);
  });

  it('keeps a mood it does not know, after the known ones', () => {
    const out = moodSummary([e('2027-06-30', 'Hopeful'), e('2027-06-30', 'Good')], today);
    assert.deepEqual(out, [
      { mood: 'Good', count: 1 },
      { mood: 'Hopeful', count: 1 },
    ]);
  });

  it('returns nothing for no entries or an unreadable today', () => {
    assert.deepEqual(moodSummary([], today), []);
    assert.deepEqual(moodSummary([e('2027-06-30', 'Good')], 'nope'), []);
  });

  it('honours a different window', () => {
    const out = moodSummary([e('2027-06-30', 'Good'), e('2027-06-24', 'Good'), e('2027-06-23', 'Good')], today, 7);
    assert.deepEqual(out, [{ mood: 'Good', count: 2 }]);
  });
});
