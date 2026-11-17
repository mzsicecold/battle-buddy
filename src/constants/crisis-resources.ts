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

/** Not a crisis line: coaching that connects people to mental health care during and after separation. Added on a clinician's advice, 2026-11. */
export const IN_TRANSITION: Resource = {
  name: 'inTransition (Military Health System)',
  detail:
    'Free, confidential coaching that connects you to mental health care as you leave service and after · Open to all service members, veterans, and retirees · 800-424-7877',
  actions: [{ label: 'Call', url: 'tel:8004247877' }],
};
