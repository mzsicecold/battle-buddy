import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CHECKLIST_ITEMS, checklistFor, countDone } from '../src/lib/departure-checklist.ts';
import { formatDay, milestonesFor, parseDay, RULES } from '../src/lib/transition-timeline.ts';

const day = (s: string): number => {
  const n = parseDay(s);
  assert.notEqual(n, null, `bad test date ${s}`);
  return n as number;
};

const entry = (key: string, ets: string, today: string) => {
  const found = checklistFor(ets, day(today)).find((e) => e.key === key);
  assert.ok(found, `missing item ${key}`);
  return found;
};

describe('checklist keys', () => {
  it('keeps the original 13 items on their saved keys', () => {
    // Saved vaults tick boxes by these keys. If one of these moves to a different item, a user's
    // checkmark lands on the wrong row, so each key is pinned to the words it has always had.
    const expected: Record<string, RegExp> = {
      c0: /^Attend Transition Assistance Program/,
      c1: /^Schedule Separation Health Assessment/,
      c2: /^Compile complete medical/,
      c3: /^File BDD claim/,
      c4: /^Review your DD 214/,
      c5: /^Update SGLI \/ life insurance beneficiaries/,
      c6: /^Schedule household goods move/,
      c7: /^Out-process finance/,
      c8: /^Confirm TRICARE/,
      c9: /^Update address & family info in DEERS/,
      c10: /^Request transcripts/,
      c11: /^Review GI Bill transfer/,
      c12: /^Attend final out-processing/,
    };
    for (const [key, pattern] of Object.entries(expected)) {
      const item = CHECKLIST_ITEMS.find((i) => i.key === key);
      assert.ok(item, `missing ${key}`);
      assert.match(item.label, pattern, key);
    }
  });

  it('has unique keys', () => {
    assert.equal(new Set(CHECKLIST_ITEMS.map((i) => i.key)).size, CHECKLIST_ITEMS.length);
  });

  it('adds SkillBridge, VGLI and TAMP under their own keys', () => {
    for (const key of ['skillbridge', 'vgli', 'tamp']) {
      assert.ok(CHECKLIST_ITEMS.some((i) => i.key === key), key);
    }
    assert.equal(CHECKLIST_ITEMS.length, 16);
  });

  it('points every linked milestone at a milestone that exists', () => {
    const ids = new Set(milestonesFor(day('2027-06-30')).map((m) => m.id));
    for (const item of CHECKLIST_ITEMS) {
      for (const id of item.milestoneIds ?? []) assert.ok(ids.has(id), `${item.key} -> ${id}`);
    }
  });
});

describe('wording comes from the timeline rules', () => {
  it('quotes the day counts in RULES', () => {
    assert.ok(entry('c0', '', '2027-01-01').label.includes(`${RULES.tapDaysBefore} days`));
    assert.ok(entry('c1', '', '2027-01-01').label.includes(`${RULES.shaDaysBefore} days`));
    assert.ok(entry('c3', '', '2027-01-01').label.includes(`${RULES.bddOpenDaysBefore}–${RULES.bddCloseDaysBefore}`));
    assert.ok(entry('skillbridge', '', '2027-01-01').label.includes(`${RULES.skillbridgeDaysBefore} days`));
    assert.ok(entry('vgli', '', '2027-01-01').label.includes(`${RULES.vgliNoHealthDaysAfter} days`));
    assert.ok(entry('tamp', '', '2027-01-01').label.includes(`${RULES.tampDaysAfter} days`));
  });
});

describe('checklistFor dates (ETS 2027-06-30)', () => {
  const ets = '2027-06-30';

  it('shows each linked deadline with the date and days left', () => {
    assert.deepEqual(entry('c0', ets, '2026-05-01').notes, ['Start TAP counseling by: 30 JUN 2026 · in 60 days']);
    assert.deepEqual(entry('skillbridge', ets, '2026-12-01').notes, ['SkillBridge earliest start: 01 JAN 2027 · in 31 days']);
    assert.deepEqual(entry('c11', ets, '2027-06-30').notes, ['Last day to request a GI Bill transfer: 30 JUN 2027 · today']);
  });

  it('shows both ends of the BDD window', () => {
    const notes = entry('c3', ets, '2027-02-01').notes;
    assert.equal(notes.length, 2);
    assert.ok(notes[0].includes('01 JAN 2027') && notes[0].includes('31 days ago'));
    assert.ok(notes[1].includes('01 APR 2027') && notes[1].includes('in 59 days'));
  });

  it('counts the after-separation items forward from the date', () => {
    assert.ok(entry('tamp', ets, '2027-07-15').notes[0].includes(formatDay(day(ets) + RULES.tampDaysAfter)));
    const vgli = entry('vgli', ets, '2027-07-15').notes;
    assert.equal(vgli.length, 2);
    assert.ok(vgli[0].includes('28 OCT 2027'));
    assert.ok(vgli[1].includes('25 FEB 2028'));
  });

  it('matches the milestone dates the phase card uses', () => {
    const list = milestonesFor(day(ets));
    for (const item of CHECKLIST_ITEMS) {
      const notes = entry(item.key, ets, '2027-01-01').notes;
      for (const id of item.milestoneIds ?? []) {
        const m = list.find((x) => x.id === id);
        assert.ok(m);
        assert.ok(notes.some((n) => n.includes(formatDay(m.day))), `${item.key} shows ${id}`);
      }
    }
  });

  it('has no notes for items without a deadline', () => {
    assert.deepEqual(entry('c4', ets, '2027-01-01').notes, []);
    assert.deepEqual(entry('c12', ets, '2027-01-01').notes, []);
  });

  it('has no notes at all when the date is blank or invalid', () => {
    for (const bad of ['', '2027-02-30', 'soon']) {
      for (const e of checklistFor(bad, day('2027-01-01'))) assert.deepEqual(e.notes, [], `${bad} / ${e.key}`);
    }
  });
});

describe('countDone', () => {
  it('counts ticked items, ignoring unknown keys and false values', () => {
    assert.equal(countDone({}), 0);
    assert.equal(countDone({ c0: true, c1: false, vgli: true }), 2);
    assert.equal(countDone({ c99: true }), 0);
  });

  it('can reach the full count', () => {
    const all = Object.fromEntries(CHECKLIST_ITEMS.map((i) => [i.key, true]));
    assert.equal(countDone(all), CHECKLIST_ITEMS.length);
  });
});
