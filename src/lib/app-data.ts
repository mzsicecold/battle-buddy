/** Shape of the decrypted vault contents — the six-pillar app data. */

export interface Profile {
  name: string;
  branch: string;
  component: string;
  rank: string;
  unit: string;
  ets: string;
}

export interface DateEntry {
  id: string;
  date: string;
  label: string;
}

export interface AwardEntry {
  id: string;
  name: string;
  date: string;
  orders: string;
}

export type BulletCategory = 'Leadership' | 'Training' | 'Community' | 'Mission Impact';

export interface BulletEntry {
  id: string;
  category: BulletCategory;
  text: string;
}

export interface Finances {
  base: string;
  bah: string;
  bas: string;
  special: string;
  sgli: string;
  fedtax: string;
  statetax: string;
  tspded: string;
  otherded: string;
  tspTrad: string;
  tspRoth: string;
  tspRate: string;
  fundC: string;
  fundS: string;
  fundI: string;
  fundF: string;
  fundG: string;
  fundL: string;
  invNotes: string;
}

export interface SaprContacts {
  sarcName: string;
  sarcPhone: string;
  vaName: string;
  vaPhone: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  mood: string;
  text: string;
}

export type BddStatus = 'Scheduled' | 'Completed' | 'Awaiting Report';

export interface BddEntry {
  id: string;
  date: string;
  specialty: string;
  status: BddStatus;
  notes: string;
}

export type DocumentCategory = 'Service' | 'Finance' | 'Medical / BDD' | 'Other';

export interface DocumentEntry {
  id: string;
  name: string;
  category: DocumentCategory;
  note: string;
  mime: string;
  size: number;
  fileUri: string;
  /** True when the file on disk is AES-GCM encrypted under the vault key. Absent on files added before encryption existed. */
  encrypted?: boolean;
  addedDate: string;
}

export interface AppData {
  profile: Profile;
  dates: DateEntry[];
  awards: AwardEntry[];
  bullets: BulletEntry[];
  finances: Finances;
  sapr: SaprContacts;
  journal: JournalEntry[];
  promptIndex: number;
  checklist: Record<string, boolean>;
  bdd: BddEntry[];
  documents: DocumentEntry[];
}

export function defaultAppData(): AppData {
  return {
    profile: { name: '', branch: '', component: '', rank: '', unit: '', ets: '' },
    dates: [],
    awards: [],
    bullets: [],
    finances: {
      base: '', bah: '', bas: '', special: '', sgli: '', fedtax: '', statetax: '',
      tspded: '', otherded: '', tspTrad: '', tspRoth: '', tspRate: '',
      fundC: '', fundS: '', fundI: '', fundF: '', fundG: '', fundL: '', invNotes: '',
    },
    sapr: { sarcName: '', sarcPhone: '', vaName: '', vaPhone: '' },
    journal: [],
    promptIndex: 0,
    checklist: {},
    bdd: [],
    documents: [],
  };
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
