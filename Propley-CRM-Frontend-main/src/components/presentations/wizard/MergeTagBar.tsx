'use client';

import type { IconType } from 'react-icons';
import {
  RiAddLine,
  RiBuilding4Line,
  RiCalendarLine,
  RiLink,
  RiTimeLine,
  RiUser3Line,
} from 'react-icons/ri';
import { MERGE_TAGS } from '@/lib/presentation-templates';
import { cn } from '@/lib/utils';

type MergeTag = { token: string; label: string };

const TAG_ICONS: Record<string, IconType> = {
  '{client_name}': RiUser3Line,
  '{project_name}': RiBuilding4Line,
  '{meeting_date}': RiCalendarLine,
  '{meeting_time}': RiTimeLine,
  '{meeting_link}': RiLink,
};

interface MergeTagBarProps {
  onInsert: (token: string) => void;
  className?: string;
  tags?: readonly MergeTag[];
}

export function MergeTagBar({
  onInsert,
  className,
  tags = MERGE_TAGS,
}: MergeTagBarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 border border-stone-alt bg-stone/40 px-4 py-3',
        className
      )}
    >
      <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
        <RiAddLine size={14} className="text-gold" />
        Insert field
      </span>
      {tags.map((tag) => {
        const Icon = TAG_ICONS[tag.token] ?? RiAddLine;
        return (
          <button
            key={tag.token}
            type="button"
            onClick={() => onInsert(tag.token)}
            className="inline-flex items-center gap-1.5 border border-stone-alt bg-ivory px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-gold hover:text-gold"
          >
            <Icon size={14} className="shrink-0" />
            {tag.label}
          </button>
        );
      })}
    </div>
  );
}
