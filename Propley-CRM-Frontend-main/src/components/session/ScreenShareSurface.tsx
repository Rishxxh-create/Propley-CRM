'use client';

interface ScreenShareSurfaceProps {
  /** True while a remote peer (stream 101) is sharing; the session hook plays into `containerId`. */
  active: boolean;
  presenterName?: string | null;
  /** DOM id the session hook plays the shared screen (stream 101) into. */
  containerId: string;
}

export function ScreenShareSurface({ active, presenterName, containerId }: ScreenShareSurfaceProps) {
  return (
    <div
      className="screen-area absolute inset-0 z-30 flex flex-col bg-black"
      style={{ display: active ? 'flex' : 'none' }}
      aria-hidden={!active}
    >
      {active && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-obsidian/70 backdrop-blur-md border border-white/10 px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-gold-light animate-pulse" />
          <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-gold-light">
            {presenterName ? `${presenterName} is sharing` : 'Screen share'}
          </span>
        </div>
      )}
      <div id={containerId} className="screen-inner flex-1 w-full h-full" />
    </div>
  );
}
