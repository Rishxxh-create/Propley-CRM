'use client';

import { useRef } from 'react';
import { RiBold, RiEyeLine, RiItalic, RiWhatsappLine } from 'react-icons/ri';
import { FormFieldLabel } from './FormFieldLabel';
import { insertAtCursor, MERGE_TAGS } from '@/lib/presentation-templates';
import { cn } from '@/lib/utils';
import { MergeTagBar } from './MergeTagBar';

interface WhatsAppTemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const textareaClass =
  'min-h-[240px] w-full resize-y border-b border-stone-alt bg-transparent px-0 py-3 text-sm font-medium leading-relaxed text-ink outline-none transition-colors placeholder:text-zinc-400 focus-visible:border-gold';

export function WhatsAppTemplateEditor({ value, onChange }: WhatsAppTemplateEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertTag = (token: string) => {
    const element = textareaRef.current;
    if (!element) {
      onChange(`${value}${token}`);
      return;
    }
    insertAtCursor(element, token, value, onChange);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-ink">
          <RiWhatsappLine className="text-[#075E54]" size={18} />
          WhatsApp message
        </h3>
        <p className="text-sm font-medium leading-relaxed text-zinc-500">
          Use *asterisks* for emphasis. Session link and schedule fields update from step one.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 border border-stone-alt bg-stone/30 p-4">
        <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-600">
          <RiBold size={14} className="text-gold" />
          *bold*
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-600">
          <RiItalic size={14} className="text-gold" />
          _italic_
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-600">
          <RiEyeLine size={14} className="text-gold" />
          Live preview updates on the right
        </span>
      </div>

      <MergeTagBar onInsert={insertTag} tags={MERGE_TAGS} />

      <div className="space-y-3">
        <FormFieldLabel icon={RiWhatsappLine}>Message body</FormFieldLabel>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(textareaClass)}
          placeholder="Write the WhatsApp invitation..."
        />
      </div>
    </div>
  );
}
