'use client';

import type { IconType } from 'react-icons';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormFieldLabelProps {
  icon: IconType;
  children: React.ReactNode;
  className?: string;
}

export function FormFieldLabel({ icon: Icon, children, className }: FormFieldLabelProps) {
  return (
    <Label className={cn('label-premium flex items-center gap-2 text-zinc-600', className)}>
      <Icon size={14} className="shrink-0 text-gold" />
      {children}
    </Label>
  );
}
