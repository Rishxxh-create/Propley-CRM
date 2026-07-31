'use client';

import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*(.+)\*\*$/);
    if (bold) {
      return (
        <strong key={i} className="font-semibold text-ink">
          {bold[1]}
        </strong>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

interface VoiceChatMarkdownProps {
  text: string;
  className?: string;
}

/** Renders agent briefs: bold (`**`), bullets (`•`), and line breaks. */
export function VoiceChatMarkdown({ text, className }: VoiceChatMarkdownProps) {
  const lines = text.split('\n');

  return (
    <div className={cn('space-y-1.5', className)}>
      {lines.map((line, lineIndex) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lineIndex} className="h-1" aria-hidden />;
        }

        const isBullet = /^[•\-]\s/.test(trimmed);
        const content = isBullet ? trimmed.replace(/^[•\-]\s+/, '') : trimmed;

        if (isBullet) {
          return (
            <p key={lineIndex} className="flex gap-2 pl-0.5">
              <span className="shrink-0 text-gold" aria-hidden>
                •
              </span>
              <span className="min-w-0">{renderInline(content)}</span>
            </p>
          );
        }

        return (
          <p key={lineIndex} className="min-w-0">
            {renderInline(content)}
          </p>
        );
      })}
    </div>
  );
}
