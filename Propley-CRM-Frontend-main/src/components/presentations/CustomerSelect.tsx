'use client';

import { useSyncExternalStore } from 'react';
import { UniversalSelect } from '@/components/UniversalSelect';
import { readCustomers, subscribeCustomers } from '@/lib/customers-store';

interface CustomerSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const EMPTY_ARRAY: any[] = [];

export function CustomerSelect({
  value,
  onChange,
  placeholder = 'Select or search customer',
}: CustomerSelectProps) {
  const customers = useSyncExternalStore(
    subscribeCustomers,
    readCustomers,
    () => EMPTY_ARRAY
  );

  const options = customers.map((c) => ({
    id: c.id,
    name: c.name,
    subtitle: `${c.email} · ${c.city}`,
  }));

  return (
    <UniversalSelect
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      searchPlaceholder="Search by name, email, or city..."
      emptyMessage="No customer found."
    />
  );
}
