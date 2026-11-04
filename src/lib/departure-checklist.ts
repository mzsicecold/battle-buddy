// The Departure checklist. Items that have a deadline say which milestone in transition-timeline.ts
// they follow, so their wording and due dates come from that file and cannot drift from the
// "Where you are" card. Like that file, this one imports nothing from React Native.

import { describeDays, formatDay, milestonesFor, parseDay, RULES } from './transition-timeline.ts';

export interface ChecklistItem {
  /**
   * Key under which a checkmark is saved in the vault (AppData.checklist). The original 13 items keep
   * their old index keys (c0..c12) so existing vaults still show the right boxes ticked. Never renumber
   * or reuse a key: give a new item a new key.
   */
  key: string;
  label: string;
  /** Milestones from transition-timeline.ts whose dates are shown under this item. */
  milestoneIds?: readonly string[];
}

export const CHECKLIST_ITEMS: readonly ChecklistItem[] = [
  {
    key: 'c0',
    label: `Attend Transition Assistance Program (TAP) — start no later than ${RULES.tapDaysBefore} days before separation`,
    milestoneIds: ['tap'],
  },
  {
    key: 'skillbridge',
    label: `Ask your command about SkillBridge, if you are eligible — earliest start is ${RULES.skillbridgeDaysBefore} days before separation and it needs command approval`,
    milestoneIds: ['skillbridge-open'],
  },
  {
    key: 'c1',
    label: `Schedule Separation Health Assessment (SHA) and dental exam — no later than ${RULES.shaDaysBefore} days before separation`,
    milestoneIds: ['sha-dental'],
  },
  { key: 'c2', label: 'Compile complete medical & dental records for your BDD claim' },
  {
    key: 'c3',
    label: `File BDD claim (${RULES.bddOpenDaysBefore}–${RULES.bddCloseDaysBefore} days before separation)`,
    milestoneIds: ['bdd-open', 'bdd-close'],
  },
  { key: 'c4', label: 'Review your DD 214 for accuracy' },
  { key: 'c5', label: 'Update SGLI / life insurance beneficiaries' },
  {
    key: 'vgli',
    label: `Decide on life insurance after you leave — convert SGLI to an individual policy within ${RULES.sgliDaysAfter} days, or apply for VGLI with no health questions within ${RULES.vgliNoHealthDaysAfter} days`,
    milestoneIds: ['sgli-convert', 'vgli-nohealth'],
  },
  { key: 'c6', label: 'Schedule household goods move (if applicable)' },
  { key: 'c7', label: 'Out-process finance — final pay & travel voucher' },
  { key: 'c8', label: 'Confirm TRICARE / VA health coverage transition' },
  {
    key: 'tamp',
    label: `Find out if you qualify for TAMP (${RULES.tampDaysAfter} days of transitional TRICARE, certain separations only). If not, plan to buy CHCBP within ${RULES.chcbpApplyDays} days of losing TRICARE`,
    milestoneIds: ['tamp-end'],
  },
  { key: 'c9', label: 'Update address & family info in DEERS' },
  { key: 'c10', label: 'Request transcripts / JST for education benefits' },
  {
    key: 'c11',
    label: 'Review GI Bill transfer or usage plan (transfers must be requested while you are still serving)',
    milestoneIds: ['gi-bill'],
  },
  { key: 'c12', label: 'Attend final out-processing appointment' },
];

export interface ChecklistEntry extends ChecklistItem {
  /** One line per linked milestone, e.g. "BDD claim window closes: 01 APR 2027 · in 148 days". Empty without a valid ETS. */
  notes: string[];
}

/** The checklist with each item's dates worked out from the ETS / EAS date. Notes are empty if the date is blank or invalid. */
export function checklistFor(etsInput: string, today: number): ChecklistEntry[] {
  const ets = parseDay(etsInput);
  const milestones = ets === null ? [] : milestonesFor(ets);
  return CHECKLIST_ITEMS.map((item) => ({
    ...item,
    notes: (item.milestoneIds ?? []).flatMap((id) => {
      const m = milestones.find((x) => x.id === id);
      return m ? [`${m.label}: ${formatDay(m.day)} · ${describeDays(m.day - today)}`] : [];
    }),
  }));
}

/** How many of the items are ticked. Keys left over from items that no longer exist are ignored. */
export function countDone(checked: Record<string, boolean>): number {
  return CHECKLIST_ITEMS.filter((item) => checked[item.key]).length;
}
