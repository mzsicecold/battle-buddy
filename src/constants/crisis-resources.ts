import type { Resource } from '@/components/bb/resource-card';

/** One copy of the crisis line, shared by the Help and Resilience tabs so the number can never differ between them. */
export const VETERANS_CRISIS_LINE: Resource = {
  name: 'Veterans / Military Crisis Line',
  detail: 'Dial 988, then press 1 · Text 838255 · Confidential chat at VeteransCrisisLine.net',
  actions: [
    { label: 'Call 988', url: 'tel:988' },
    { label: 'Text', url: 'sms:838255' },
  ],
  crisis: true,
};
