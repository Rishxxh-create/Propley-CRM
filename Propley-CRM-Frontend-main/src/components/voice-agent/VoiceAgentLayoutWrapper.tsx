'use client';

import { usePathname } from 'next/navigation';
import { useVoiceAgentStore } from '@/store/voice-agent-store';
import { VoiceAgentSidebar } from './sidebar/VoiceAgentSidebar';
import { cn } from '@/lib/utils';

interface VoiceAgentLayoutWrapperProps {
  children: React.ReactNode;
}

/**
 * Shell layout only — voice panel is a relative flex sibling (never fixed overlay).
 * Main app column shrinks when the panel is open; tablet uses a narrower panel width.
 */
export function VoiceAgentLayoutWrapper({ children }: VoiceAgentLayoutWrapperProps) {
  const pathname = usePathname();
  const isPanelOpen = useVoiceAgentStore((s) => s.isPanelOpen);

  if (pathname?.startsWith('/demo')) {
    return <>{children}</>;
  }

  return (
    <div
      data-voice-panel={isPanelOpen ? 'open' : 'closed'}
      className={cn(
        'flex h-screen w-full overflow-hidden bg-stone',
        isPanelOpen && 'max-md:flex-col'
      )}
    >
      <div className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden max-md:min-h-[50vh]">
        {children}
      </div>

      {isPanelOpen && (
        <aside
          className={cn(
            'relative z-10 flex shrink-0 flex-col overflow-hidden border-stone-alt bg-white shadow-2xl',
            'max-md:h-[min(48vh,420px)] max-md:w-full max-md:border-t',
            'md:h-full md:border-l',
            'md:w-[300px] md:max-w-[38vw]',
            'lg:w-[340px] lg:max-w-[34vw]',
            'xl:w-[400px] xl:max-w-[32vw]',
            '2xl:w-[450px] 2xl:max-w-[450px]'
          )}
        >
          <VoiceAgentSidebar />
        </aside>
      )}
    </div>
  );
}
