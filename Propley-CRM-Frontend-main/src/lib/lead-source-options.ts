import type { SelectOption } from '@/components/UniversalSelect';

export const LEAD_SOURCE_OPTIONS: SelectOption[] = [
  { id: 'referral', name: 'Referral / client recommendation' },
  { id: 'website', name: 'Website' },
  { id: 'walk-in', name: 'Walk-in' },
  { id: 'broker', name: 'Broker partner' },
  { id: 'exhibition', name: 'Exhibition / event' },
  { id: 'social', name: 'Social media' },
  { id: 'google', name: 'Google Search', brand: 'google' },
  { id: 'facebook', name: 'Facebook', brand: 'facebook' },
  { id: 'instagram', name: 'Instagram', brand: 'instagram' },
  { id: 'linkedin', name: 'LinkedIn', brand: 'linkedin' },
  { id: 'direct', name: 'Direct / other' },
];

/** Resolve stored id or legacy display label to a readable name */
export function getLeadSourceLabel(value?: string): string {
  if (!value?.trim()) return '';
  const norm = value.trim().toLowerCase();
  const byId = LEAD_SOURCE_OPTIONS.find((o) => o.id === norm || o.id === value);
  if (byId) return byId.name;
  const byName = LEAD_SOURCE_OPTIONS.find(
    (o) => o.name.toLowerCase() === norm || o.name.toLowerCase().includes(norm)
  );
  if (byName) return byName.name;
  return value.trim();
}

/** Map spoken or legacy label to option id for storage */
export function resolveLeadSourceId(input?: string): string | undefined {
  if (!input?.trim()) return undefined;
  const norm = input.trim().toLowerCase();
  const byId = LEAD_SOURCE_OPTIONS.find((o) => o.id === norm);
  if (byId) return byId.id;
  const byName = LEAD_SOURCE_OPTIONS.find(
    (o) =>
      o.name.toLowerCase() === norm ||
      o.name.toLowerCase().includes(norm) ||
      norm.includes(o.name.toLowerCase())
  );
  return byName?.id;
}

export function getLeadSourceBrand(value?: string): SelectOption['brand'] | undefined {
  if (!value?.trim()) return undefined;
  const norm = value.trim().toLowerCase();
  const match = LEAD_SOURCE_OPTIONS.find(
    (o) => o.id === norm || o.id === value || o.name.toLowerCase() === norm
  );
  return match?.brand;
}
