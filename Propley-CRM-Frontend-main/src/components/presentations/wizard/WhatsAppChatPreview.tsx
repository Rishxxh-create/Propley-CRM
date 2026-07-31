'use client';

import {
  RiArrowLeftLine,
  RiAttachment2,
  RiEyeLine,
  RiMicLine,
  RiMore2Fill,
  RiPhoneLine,
  RiVideoLine,
} from 'react-icons/ri';
import {
  formatWhatsappPreview,
  type PresentationContext,
} from '@/lib/presentation-templates';

interface WhatsAppChatPreviewProps {
  message: string;
  context: PresentationContext;
  projectName: string;
}

/** WhatsApp chat wallpaper — subtle doodle-style pattern */
const WA_WALLPAPER_STYLE = {
  backgroundColor: '#efeae2',
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d4cfc4' fill-opacity='0.45'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`,
};

export function WhatsAppChatPreview({
  message,
  context,
  projectName,
}: WhatsAppChatPreviewProps) {
  const html = formatWhatsappPreview(message, context);

  return (
    <div className="space-y-6">
      <div className="space-y-2 border-b border-stone-alt pb-4">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
          <RiEyeLine size={14} />
          Live preview
        </p>
        <h3 className="text-sm font-semibold tracking-tight text-ink">WhatsApp mobile view</h3>
        <p className="text-xs font-medium text-zinc-500">
          Message as received on the client&apos;s device
        </p>
      </div>

      <div className="mx-auto w-full max-w-[340px] overflow-hidden rounded-lg border border-[#d1d7db] bg-white shadow-lg">
        {/* WhatsApp header */}
        <header className="flex items-center gap-2 bg-[#075E54] px-2 py-2.5 text-white">
          <button type="button" className="p-1.5 opacity-90" aria-hidden>
            <RiArrowLeftLine size={22} />
          </button>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#128C7E] text-sm font-semibold">
            P
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-medium leading-tight">Propley Sales</p>
            <p className="text-[11px] font-normal text-white/75">Business account</p>
          </div>
          <div className="flex items-center gap-3 pr-1 opacity-90">
            <RiVideoLine size={20} />
            <RiPhoneLine size={18} />
            <RiMore2Fill size={18} />
          </div>
        </header>

        {/* Chat area */}
        <div
          className="flex min-h-[360px] flex-col justify-between"
          style={WA_WALLPAPER_STYLE}
        >
          <div className="flex justify-center px-3 pt-3">
            <span className="rounded-lg bg-[#fff9c4] px-3 py-1 text-[11px] font-medium text-[#54656f] shadow-sm">
              Today
            </span>
          </div>

          <div className="flex flex-col gap-1 px-2 pb-2 pt-2">
            {/* Incoming message bubble (white, left) */}
            <div className="relative max-w-[92%] self-start">
              <div className="overflow-hidden rounded-lg rounded-tl-none bg-white shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
                {/* Link preview card */}
                <div className="border-b border-[#e9edef]">
                  <div className="flex gap-0 overflow-hidden">
                    <div className="w-1 shrink-0 bg-[#25D366]" />
                    <div className="min-w-0 flex-1 bg-[#f0f2f5] p-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#25D366]">
                        propley.com
                      </p>
                      <p className="mt-0.5 truncate text-[13px] font-medium text-[#111b21]">
                        {projectName}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-[#667781]">
                        Immersive 3D presentation — tap to join your session
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-2 pb-1 pt-1.5">
                  <p
                    className="text-[14.2px] leading-[19px] text-[#111b21] [&_br]:block [&_strong]:font-semibold"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                  <div className="mt-0.5 flex items-center justify-end gap-1">
                    <span className="text-[11px] text-[#667781]">9:42 AM</span>
                  </div>
                </div>
              </div>
              {/* Bubble tail */}
              <svg
                className="absolute -left-[6px] top-0 h-[13px] w-[8px] text-white"
                viewBox="0 0 8 13"
                aria-hidden
              >
                <path
                  fill="currentColor"
                  d="M1.533 3.568L8 12.193V1H2.812C1.728 1 1.057 1.936.92 3.068L1.533 3.568z"
                />
              </svg>
            </div>
          </div>

          {/* Input bar mock */}
          <div className="flex items-center gap-2 border-t border-[#e9edef] bg-[#f0f2f5] px-2 py-2">
            <span className="text-[#54656f]">
              <RiAttachment2 size={22} />
            </span>
            <div className="flex flex-1 items-center rounded-full bg-white px-4 py-2 text-[13px] text-[#667781]">
              Message
            </div>
            <span className="text-[#54656f]">
              <RiMicLine size={22} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
