// Transition timeline: the one place the app keeps its separation deadlines.
//
// Every number below is a DoD, VA, or TRICARE minimum or window taken from
// official pages and last checked on TIMELINE_LAST_VERIFIED. Services and
// installations can add rules, retirees and Guard/Reserve members can differ,
// and the rules change, so the UI always says "confirm with your transition
// office". Re-check this file before each release.
//
// Dates are handled as whole days since the Unix epoch (UTC) so that daylight
// saving time never shifts a deadline by a day. This file imports nothing from
// React Native so it can be unit-tested directly.

export const TIMELINE_LAST_VERIFIED = '2026-11-01';

const DAY_MS = 86_400_000;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** Strict YYYY-MM-DD → day number, or null for anything else (including 2027-02-30). */
export function parseDay(input: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const ms = Date.UTC(y, mo - 1, d);
  const check = new Date(ms);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  return ms / DAY_MS;
}

/** Today's calendar date on this device, as a day number. */
export function todayDay(now: Date = new Date()): number {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY_MS;
}

export function formatDay(day: number): string {
  const d = new Date(day * DAY_MS);
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// A Feb 29 date plus a year lands on Feb 28, not Mar 1: for a deadline, the earlier day is the safe one.
function addYears(day: number, years: number): number {
  const d = new Date(day * DAY_MS);
  const month = d.getUTCMonth();
  const candidate = new Date(Date.UTC(d.getUTCFullYear() + years, month, d.getUTCDate()));
  if (candidate.getUTCMonth() !== month) {
    return Date.UTC(d.getUTCFullYear() + years, month + 1, 0) / DAY_MS;
  }
  return candidate.getTime() / DAY_MS;
}

export interface PhaseInfo {
  /** 0 = more than a year out (before Phase 1). */
  id: 0 | 1 | 2 | 3 | 4 | 5;
  name: string;
  window: string;
  question: string;
}

export const PHASES: readonly PhaseInfo[] = [
  {
    id: 0,
    name: 'Getting Started',
    window: 'More than 12 months out',
    question: 'Nothing is urgent yet. Confirm your date and start a folder for your documents.',
  },
  {
    id: 1,
    name: 'Name It',
    window: '12 to 9 months out',
    question: 'What is changing, and what do you want to honor about it?',
  },
  {
    id: 2,
    name: 'Build the Frame',
    window: '9 to 6 months out',
    question: 'What structure can you choose for yourself, and who are you beyond the role?',
  },
  {
    id: 3,
    name: 'Let It Land',
    window: '6 to 3 months out',
    question: 'What needs room, and what would safe enough feel like?',
  },
  {
    id: 4,
    name: 'Step Forward',
    window: '3 months out to your last day',
    question: 'What are you allowed to want, and what will your first 90 days need?',
  },
  {
    id: 5,
    name: 'Settle In',
    window: 'Your first 90 days after',
    question: 'How do you repair instead of quit, and what will you carry forward?',
  },
];

/** Phase for a given number of days until separation (negative once separated). */
export function phaseForDaysOut(daysOut: number): PhaseInfo {
  if (daysOut > 365) return PHASES[0];
  if (daysOut > 270) return PHASES[1];
  if (daysOut > 180) return PHASES[2];
  if (daysOut > 90) return PHASES[3];
  if (daysOut >= 0) return PHASES[4];
  return PHASES[5];
}

export interface Milestone {
  id: string;
  label: string;
  detail: string;
  day: number;
  /** Shown only while the date is still ahead and separation hasn't happened. */
  passedNote?: string;
}

export function milestonesFor(ets: number): Milestone[] {
  const list: Milestone[] = [
    {
      id: 'tap',
      label: 'Start TAP counseling by',
      detail: 'Must begin no later than 365 days before separation. Retirees can usually start up to 2 years out.',
      day: ets - 365,
      passedNote: 'TAP start date has passed. Ask your transition office to start as soon as possible.',
    },
    {
      id: 'skillbridge-open',
      label: 'SkillBridge earliest start',
      detail: 'No earlier than 180 days before separation, and it needs command approval. Not available to everyone.',
      day: ets - 180,
    },
    {
      id: 'bdd-open',
      label: 'BDD claim window opens',
      detail: 'File 180 to 90 days before separation. Needs a known separation date, your service treatment records, and the SHA Part A.',
      day: ets - 180,
    },
    {
      id: 'bdd-close',
      label: 'BDD claim window closes',
      detail: 'With fewer than 90 days left BDD is closed. You can still file a standard claim after separation.',
      day: ets - 90,
      passedNote: 'BDD is closed. A standard claim is still possible after separation. A Veterans Service Officer can help.',
    },
    {
      id: 'sha-dental',
      label: 'Final health assessment and dental exam scheduled by',
      detail: 'Must be scheduled no later than 90 days before separation.',
      day: ets - 90,
      passedNote: 'If this date has passed, ask your transition office what is still possible.',
    },
    {
      id: 'gi-bill',
      label: 'Last day to request a GI Bill transfer',
      detail: 'Post-9/11 GI Bill benefits can be transferred to dependents only while you are still serving.',
      day: ets,
    },
    {
      id: 'sgli-end',
      label: 'Free SGLI coverage ends',
      detail: 'SGLI continues free for 120 days after you leave. Totally disabled members can apply to extend it up to 2 years.',
      day: ets + 120,
    },
    {
      id: 'sgli-convert',
      label: 'Convert SGLI to an individual policy by',
      detail: 'Within 120 days of separation, with no proof of health needed.',
      day: ets + 120,
    },
    {
      id: 'tamp-end',
      label: 'TAMP coverage ends (if you qualify)',
      detail: '180 days of transitional TRICARE, for certain separations only. Check DEERS or milConnect. Then CHCBP must be bought within 60 days of losing TRICARE or TAMP.',
      day: ets + 180,
    },
    {
      id: 'vgli-nohealth',
      label: 'VGLI with no health questions by',
      detail: 'Apply within 240 days of separation to skip the health questions.',
      day: ets + 240,
    },
    {
      id: 'va-claim',
      label: 'File a VA claim within a year of separation by',
      detail: 'A claim received within 1 year can be effective as early as the day after you left. An intent to file holds your date for 1 year.',
      day: addYears(ets, 1),
    },
    {
      id: 'vgli-last',
      label: 'Last day to apply for VGLI (proof of health required)',
      detail: 'From day 121 to 1 year and 120 days after separation you must show proof of good health. After that, applications are not accepted.',
      day: addYears(ets, 1) + 120,
    },
  ];
  return list.sort((a, b) => a.day - b.day);
}

export interface Transition {
  ets: number;
  today: number;
  /** Days until separation; negative once separated. */
  daysOut: number;
  phase: PhaseInfo;
  /** Milestones that are today or later, soonest first. */
  upcoming: Milestone[];
  /** Pre-separation notes for dates that already passed (empty after separation). */
  passedNotes: string[];
}

export function getTransition(etsInput: string, today: number): Transition | null {
  const ets = parseDay(etsInput);
  if (ets === null) return null;
  const daysOut = ets - today;
  const all = milestonesFor(ets);
  const upcoming = all.filter((m) => m.day >= today);
  const passedNotes =
    daysOut >= 0
      ? all.filter((m) => m.day < today && m.passedNote).map((m) => m.passedNote as string)
      : [];
  return { ets, today, daysOut, phase: phaseForDaysOut(daysOut), upcoming, passedNotes };
}

/** "143 days to go", "Today", "12 days ago". */
export function describeDays(n: number): string {
  if (n === 0) return 'today';
  const abs = Math.abs(n);
  const unit = abs === 1 ? 'day' : 'days';
  return n > 0 ? `in ${abs} ${unit}` : `${abs} ${unit} ago`;
}
