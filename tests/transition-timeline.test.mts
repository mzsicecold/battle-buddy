import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  describeDays,
  formatDay,
  getTransition,
  milestonesFor,
  parseDay,
  phaseForDaysOut,
  PHASES,
  TIMELINE_LAST_VERIFIED,
  todayDay,
} from '../src/lib/transition-timeline.ts';

const day = (s: string): number => {
  const n = parseDay(s);
  assert.notEqual(n, null, `bad test date ${s}`);
  return n as number;
};

const byId = (ets: string, id: string) => {
  const m = milestonesFor(day(ets)).find((x) => x.id === id);
  assert.ok(m, `missing milestone ${id}`);
  return m;
};

describe('parseDay', () => {
  it('accepts real dates, including a leap day', () => {
    assert.notEqual(parseDay('2027-06-30'), null);
    assert.notEqual(parseDay('2028-02-29'), null);
    assert.notEqual(parseDay(' 2027-06-30 '), null);
  });

  it('rejects impossible and badly formatted dates', () => {
    for (const bad of ['', '2027-02-30', '2027-02-29', '2027-13-01', '2027-00-10', '2027-6-30', '30/06/2027', '2027-06-3', 'soon']) {
      assert.equal(parseDay(bad), null, bad);
    }
  });

  it('round-trips through formatDay', () => {
    assert.equal(formatDay(day('2027-06-30')), '30 JUN 2027');
    assert.equal(formatDay(day('2028-02-29')), '29 FEB 2028');
  });
});

describe('phaseForDaysOut', () => {
  it('puts each boundary in the phase the workbook names', () => {
    const cases: [number, number][] = [
      [800, 0], [366, 0], [365, 1], [271, 1], [270, 2], [181, 2],
      [180, 3], [91, 3], [90, 4], [1, 4], [0, 4], [-1, 5], [-500, 5],
    ];
    for (const [out, id] of cases) assert.equal(phaseForDaysOut(out).id, id, `${out} days out`);
  });

  it('has one entry per phase id', () => {
    assert.deepEqual(PHASES.map((p) => p.id), [0, 1, 2, 3, 4, 5]);
  });
});

describe('milestonesFor (2027-06-30)', () => {
  it('counts the before-separation rules back from the date', () => {
    assert.equal(formatDay(byId('2027-06-30', 'tap').day), '30 JUN 2026');
    assert.equal(formatDay(byId('2027-06-30', 'skillbridge-open').day), '01 JAN 2027');
    assert.equal(formatDay(byId('2027-06-30', 'bdd-open').day), '01 JAN 2027');
    assert.equal(formatDay(byId('2027-06-30', 'bdd-close').day), '01 APR 2027');
    assert.equal(formatDay(byId('2027-06-30', 'sha-dental').day), '01 APR 2027');
    assert.equal(formatDay(byId('2027-06-30', 'gi-bill').day), '30 JUN 2027');
  });

  it('counts the after-separation clocks forward from the date', () => {
    assert.equal(formatDay(byId('2027-06-30', 'sgli-end').day), '28 OCT 2027');
    assert.equal(formatDay(byId('2027-06-30', 'sgli-convert').day), '28 OCT 2027');
    assert.equal(formatDay(byId('2027-06-30', 'tamp-end').day), '27 DEC 2027');
    assert.equal(formatDay(byId('2027-06-30', 'vgli-nohealth').day), '25 FEB 2028');
    assert.equal(formatDay(byId('2027-06-30', 'va-claim').day), '30 JUN 2028');
    assert.equal(formatDay(byId('2027-06-30', 'vgli-last').day), '28 OCT 2028');
  });

  it('is sorted and has unique ids', () => {
    const list = milestonesFor(day('2027-06-30'));
    for (let i = 1; i < list.length; i++) assert.ok(list[i].day >= list[i - 1].day);
    assert.equal(new Set(list.map((m) => m.id)).size, list.length);
  });

  it('rolls a Feb 29 separation date back to Feb 28 for the one-year deadline', () => {
    assert.equal(formatDay(byId('2028-02-29', 'va-claim').day), '28 FEB 2029');
  });
});

describe('getTransition', () => {
  const ets = '2027-06-30';

  it('returns null for an empty or invalid date', () => {
    assert.equal(getTransition('', day('2027-01-01')), null);
    assert.equal(getTransition('2027-02-30', day('2027-01-01')), null);
  });

  it('finds the phase from the days left', () => {
    assert.equal(getTransition(ets, day('2026-05-01'))?.phase.id, 0);
    assert.equal(getTransition(ets, day('2026-09-01'))?.phase.id, 1);
    assert.equal(getTransition(ets, day('2026-12-01'))?.phase.id, 2);
    assert.equal(getTransition(ets, day('2027-02-01'))?.phase.id, 3);
    assert.equal(getTransition(ets, day('2027-05-01'))?.phase.id, 4);
    assert.equal(getTransition(ets, day('2027-06-30'))?.phase.id, 4);
    assert.equal(getTransition(ets, day('2027-07-01'))?.phase.id, 5);
    assert.equal(getTransition(ets, day('2028-12-01'))?.phase.id, 5);
  });

  it('reports daysOut, positive before the date and negative after', () => {
    assert.equal(getTransition(ets, day('2027-06-20'))?.daysOut, 10);
    assert.equal(getTransition(ets, day('2027-07-10'))?.daysOut, -10);
  });

  it('counts a milestone that falls on today as upcoming', () => {
    const t = getTransition(ets, day('2027-04-01'));
    assert.ok(t?.upcoming.some((m) => m.id === 'bdd-close'));
    assert.ok(t?.upcoming.some((m) => m.id === 'sha-dental'));
  });

  it('drops past milestones from upcoming', () => {
    const t = getTransition(ets, day('2027-05-01'));
    assert.ok(t);
    assert.ok(!t.upcoming.some((m) => m.id === 'tap' || m.id === 'bdd-open'));
    assert.ok(t.upcoming.every((m) => m.day >= t.today));
  });

  it('notes missed windows only before separation', () => {
    const late = getTransition(ets, day('2027-05-01'));
    assert.equal(late?.passedNotes.length, 3);
    assert.ok(late?.passedNotes.some((n) => n.includes('BDD is closed')));
    assert.ok(late?.passedNotes.some((n) => n.includes('TAP')));

    const early = getTransition(ets, day('2026-05-01'));
    assert.deepEqual(early?.passedNotes, []);

    const after = getTransition(ets, day('2027-08-01'));
    assert.deepEqual(after?.passedNotes, []);
    assert.ok(after?.upcoming.some((m) => m.id === 'sgli-end'));
    assert.ok(!after?.upcoming.some((m) => m.id === 'gi-bill'));
  });

  it('runs out of upcoming dates once every window has closed', () => {
    assert.deepEqual(getTransition(ets, day('2029-01-01'))?.upcoming, []);
  });
});

describe('helpers', () => {
  it('describeDays handles today, future, past, and singular', () => {
    assert.equal(describeDays(0), 'today');
    assert.equal(describeDays(1), 'in 1 day');
    assert.equal(describeDays(12), 'in 12 days');
    assert.equal(describeDays(-1), '1 day ago');
    assert.equal(describeDays(-30), '30 days ago');
  });

  it('todayDay uses the local calendar date', () => {
    assert.equal(todayDay(new Date(2027, 5, 30, 23, 59)), day('2027-06-30'));
    assert.equal(todayDay(new Date(2027, 5, 30, 0, 1)), day('2027-06-30'));
  });

  it('records when the rules were last checked', () => {
    assert.match(TIMELINE_LAST_VERIFIED, /^\d{4}-\d{2}-\d{2}$/);
    assert.notEqual(parseDay(TIMELINE_LAST_VERIFIED), null);
  });
});
