'use client';

import { useRef, useState } from 'react';
import type { IconType } from 'react-icons';
import {
  RiArticleLine,
  RiChatQuoteLine,
  RiCursorLine,
  RiHandHeartLine,
  RiMailLine,
  RiCalendarEventLine,
} from 'react-icons/ri';
import { Label } from '@/components/ui/label';
import {
  type EmailTemplateFields,
  type EmailTemplateVariant,
  insertAtCursor,
  MERGE_TAGS,
} from '@/lib/presentation-templates';
import { PAGE } from '@/lib/copy';
import { cn } from '@/lib/utils';
import { MergeTagBar } from './MergeTagBar';

interface EmailTemplateEditorProps {
  value: EmailTemplateFields;
  onChange: (value: EmailTemplateFields) => void;
  variant?: EmailTemplateVariant;
}

const FIELDS: {
  key: keyof EmailTemplateFields;
  label: string;
  rows: number;
  icon: IconType;
}[] = [
  { key: 'greeting', label: 'Opening line', rows: 2, icon: RiHandHeartLine },
  { key: 'introduction', label: 'Introduction', rows: 4, icon: RiArticleLine },
  { key: 'sessionDetails', label: 'Session details', rows: 3, icon: RiCalendarEventLine },
  { key: 'closing', label: 'Closing note', rows: 3, icon: RiChatQuoteLine },
  { key: 'ctaLabel', label: 'Button label', rows: 2, icon: RiCursorLine },
];

const fieldTextareaClass =
  'w-full resize-y border-b border-stone-alt bg-transparent px-0 py-2 text-sm font-medium leading-relaxed text-ink outline-none transition-colors placeholder:text-zinc-400 focus-visible:border-gold';

export function EmailTemplateEditor({
  value,
  onChange,
  variant = 'invite',
}: EmailTemplateEditorProps) {
  const copy =
    variant === 'reschedule'
      ? PAGE.templates.rescheduleEmailEditor
      : PAGE.templates.inviteEmailEditor;
  const refs = useRef<Partial<Record<keyof EmailTemplateFields, HTMLTextAreaElement>>>({});
  const [activeField, setActiveField] = useState<keyof EmailTemplateFields>('introduction');

  const updateField = (key: keyof EmailTemplateFields, next: string) => {
    onChange({ ...value, [key]: next });
  };

  const insertIntoField = (key: keyof EmailTemplateFields, token: string) => {
    const element = refs.current[key];
    if (!element) {
      updateField(key, `${value[key]}${token}`);
      return;
    }
    insertAtCursor(element, token, value[key], (next) => updateField(key, next));
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-ink">
          <RiMailLine className="text-gold" size={18} />
          {copy.title}
        </h3>
        <p className="text-sm font-medium leading-relaxed text-zinc-500">{copy.description}</p>
      </div>

      <MergeTagBar
        tags={MERGE_TAGS.filter((tag) => tag.token !== '{meeting_link}')}
        onInsert={(token) => insertIntoField(activeField, token)}
      />

      <div className="border border-stone-alt bg-ivory">
        {FIELDS.map((field) => {
          const FieldIcon = field.icon;
          const isActive = activeField === field.key;
          return (
            <div
              key={field.key}
              className={cn(
                'space-y-3 border-b border-stone-alt px-5 py-5 last:border-b-0 transition-colors',
                isActive && 'bg-stone/30'
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <Label className="label-premium flex items-center gap-2 text-zinc-600">
                  <FieldIcon size={14} className={isActive ? 'text-gold' : 'text-zinc-400'} />
                  {field.label}
                </Label>
              </div>
              <textarea
                ref={(node) => {
                  if (node) refs.current[field.key] = node;
                }}
                value={value[field.key]}
                onFocus={() => setActiveField(field.key)}
                onChange={(event) => updateField(field.key, event.target.value)}
                rows={field.rows}
                className={cn(fieldTextareaClass, 'min-h-[72px]')}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
