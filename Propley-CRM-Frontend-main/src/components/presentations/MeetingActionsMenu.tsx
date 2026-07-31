"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  RiCalendarLine,
  RiCloseLine,
  RiExternalLinkLine,
  RiFileCopyLine,
  RiLineChartLine,
  RiMailSendLine,
  RiMicLine,
  RiMore2Fill,
  RiWhatsappLine,
} from "react-icons/ri";
import { UpdateTranscriptDialog } from "@/components/presentations/UpdateTranscriptDialog";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ACTIONS, PAGE } from "@/lib/copy";
import { RiHistoryFill } from "@remixicon/react";

export interface MeetingRow {
  uuid: string;
  property: string;
  client: string;
  status?: string;
  transcript?: string | null;
}

interface MeetingActionsMenuProps {
  meeting: MeetingRow;
  isCanceled: boolean;
  onReschedule: () => void;
  onCancel: () => void;
  onShare: () => void;
  onResendEmail: () => void;
  onResendWhatsApp: () => void;
  onCopyLink: () => void;
  align?: "start" | "center" | "end";
  className?: string;
}

const panelClass = cn(
  "z-[1100] flex max-h-[min(70vh,20rem)] w-[272px] flex-col overflow-hidden",
  "rounded-lg border border-stone-alt bg-ivory p-0 shadow-[0_20px_50px_-16px_rgba(26,26,26,0.28)] ring-0",
);

const scrollBodyClass =
  "max-h-[min(calc(70vh-4.5rem),16.5rem)] overflow-x-hidden overflow-y-auto overscroll-contain custom-scrollbar";

const triggerClass = buttonVariants({
  variant: "outline",
  size: "icon-sm",
  className:
    "rounded-lg border-stone-alt bg-ivory text-zinc-500 shadow-none hover:border-gold hover:bg-stone hover:text-ink data-popup-open:border-gold data-popup-open:bg-stone data-popup-open:text-gold",
});

/** Neutralize shadcn accent (gold) hover — Sera stone / ink only */
const itemResetClass = cn(
  "group/item relative flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2",
  "text-[13px] font-medium normal-case tracking-normal",
  "outline-none select-none",
  "text-ink",
  "focus:bg-stone focus:text-ink focus-visible:bg-stone focus-visible:text-ink",
  "data-highlighted:bg-stone data-highlighted:text-ink",
  "data-disabled:pointer-events-none data-disabled:opacity-45",
);

const itemPrimaryClass = cn(
  itemResetClass,
  "font-semibold",
  "data-highlighted:bg-gold/10 data-highlighted:text-ink",
);

const itemDestructiveClass = cn(
  itemResetClass,
  "text-red-600",
  "focus:bg-red-50 focus:text-red-700 focus-visible:bg-red-50 focus-visible:text-red-700",
  "data-highlighted:bg-red-50 data-highlighted:text-red-700",
);

type IconVariant = "default" | "primary" | "whatsapp" | "destructive";

function ItemIcon({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: IconVariant;
}) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center border transition-all duration-200",

        /* DEFAULT */
        variant === "default" && [
          "border-stone-alt bg-stone text-zinc-500",
          "group-data-[highlighted]/item:border-gold/40",
          "group-data-[highlighted]/item:bg-gold/10",
          "group-data-[highlighted]/item:text-gold",
        ],

        /* PRIMARY */
        variant === "primary" && [
          "border-ink bg-ink text-ivory!",
          "group-data-[highlighted]/item:bg-gold",
          "group-data-[highlighted]/item:border-gold",
          "group-data-[highlighted]/item:text-ink!",
        ],

        /* WHATSAPP */
        variant === "whatsapp" && [
          "border-[#075E54]/20 bg-[#075E54]/5 text-[#075E54]!",
          "group-data-[highlighted]/item:border-[#075E54]/40",
          "group-data-[highlighted]/item:bg-[#075E54]/12",
          "group-data-[highlighted]/item:text-[#064C44]!",
        ],

        /* DESTRUCTIVE */
        variant === "destructive" && [
          "border-red-100 bg-red-50 text-red-600",
          "group-data-[highlighted]/item:border-red-200",
          "group-data-[highlighted]/item:bg-red-100",
          "group-data-[highlighted]/item:text-red-700",
        ],
      )}
    >
      <span className="transition-transform duration-200 group-data-[highlighted]/item:scale-105">
        {children}
      </span>
    </span>
  );
}

function ItemLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("min-w-0 flex-1 text-inherit", className)}>
      {children}
    </span>
  );
}

function MenuHeader({
  property,
  client,
}: {
  property: string;
  client: string;
}) {
  return (
    <div className="shrink-0 border-b border-stone-alt bg-stone/40 px-4 py-3">
      <p className="truncate text-sm font-semibold tracking-tight text-ink">
        {property}
      </p>
      <p className="mt-0.5 truncate text-xs font-medium text-zinc-500">
        {client}
      </p>
    </div>
  );
}

function MenuSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("px-2 py-1.5", className)}>
      <p className="mb-1 px-2 text-[10px] font-semibold tracking-[0.14em] text-zinc-400">
        {title}
      </p>
      <div className="flex flex-col gap-px">{children}</div>
    </section>
  );
}

function MenuDivider() {
  return <div className="mx-4 border-t border-stone-alt" role="separator" />;
}

export function MeetingActionsMenu({
  meeting,
  isCanceled,
  onReschedule,
  onCancel,
  onShare,
  onResendEmail,
  onResendWhatsApp,
  onCopyLink,
  align = "end",
  className,
}: MeetingActionsMenuProps) {
  const router = useRouter();
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const isScheduled = meeting.status === "Scheduled";

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        aria-label="Open presentation actions"
        className={cn(triggerClass, className)}
        onClick={(e) => e.stopPropagation()}
      >
        <RiMore2Fill size={18} />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={align}
        side="bottom"
        sideOffset={8}
        showArrow={false}
        className={panelClass}
      >
        <MenuHeader property={meeting.property} client={meeting.client} />

        <div className={scrollBodyClass}>
          <MenuSection title={ACTIONS.menuSections.session}>
            {!isCanceled && (
              <DropdownMenuItem
                className={itemPrimaryClass}
                onClick={() => router.push(`/moderator/${meeting.uuid}`)}
              >
                <ItemIcon>
                  <RiExternalLinkLine size={16} />
                </ItemIcon>
                <ItemLabel>{ACTIONS.enterPortal}</ItemLabel>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem className={itemResetClass} onClick={onCopyLink}>
              <ItemIcon>
                <RiFileCopyLine size={16} />
              </ItemIcon>
              <ItemLabel>{ACTIONS.copyClientLink}</ItemLabel>
            </DropdownMenuItem>

            {!isCanceled && (
              <DropdownMenuItem className={itemResetClass} onClick={onShare}>
                <ItemIcon>
                  <RiWhatsappLine size={16} />
                </ItemIcon>
                <ItemLabel>{ACTIONS.shareWhatsapp}</ItemLabel>
              </DropdownMenuItem>
            )}
          </MenuSection>

          <MenuDivider />

          <MenuSection title={ACTIONS.menuSections.notifications}>
            {!isCanceled ? (
              <>
                <DropdownMenuItem
                  className={itemResetClass}
                  onClick={onResendEmail}
                >
                  <ItemIcon>
                    <RiMailSendLine size={16} />
                  </ItemIcon>
                  <ItemLabel>{ACTIONS.resendEmail}</ItemLabel>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={itemResetClass}
                  onClick={onResendWhatsApp}
                >
                  <ItemIcon>
                    <RiWhatsappLine size={16} />
                  </ItemIcon>
                  <ItemLabel>{ACTIONS.resendWhatsapp}</ItemLabel>
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem disabled className={itemResetClass}>
                <ItemLabel className="text-xs text-zinc-400">
                  {PAGE.presentations.unavailable}
                </ItemLabel>
              </DropdownMenuItem>
            )}
          </MenuSection>

          <MenuDivider />

          <MenuSection title={ACTIONS.menuSections.intelligence}>
            {/* FIX: was missing className={itemResetClass}, causing shadcn's
                default gold/accent hover instead of the stone/ink style */}
            <DropdownMenuItem
              className={itemResetClass}
              onClick={() =>
                router.push(`/meetings/${meeting.uuid}/activity-logs`)
              }
            >
              <ItemIcon>
                <RiHistoryFill size={16} />
              </ItemIcon>
              <ItemLabel className="capitalize!">
                {ACTIONS.meetingActivityLog}
              </ItemLabel>
            </DropdownMenuItem>
            <DropdownMenuItem
              className={itemResetClass}
              onClick={() =>
                router.push(`/meetings/${meeting.uuid}/post-analysis`)
              }
            >
              <ItemIcon>
                <RiLineChartLine size={16} />
              </ItemIcon>
              <ItemLabel>{ACTIONS.postAnalysis}</ItemLabel>
            </DropdownMenuItem>
            <DropdownMenuItem
              className={itemResetClass}
              onClick={() => setTranscriptOpen(true)}
            >
              <ItemIcon>
                <RiMicLine size={16} />
              </ItemIcon>
              <ItemLabel>{ACTIONS.updateTranscript}</ItemLabel>
            </DropdownMenuItem>
          </MenuSection>

          <MenuDivider />

          <MenuSection title={ACTIONS.menuSections.manage} className="pb-2">
            {!isCanceled ? (
              <>
                {isScheduled && (
                  <DropdownMenuItem
                    className={itemResetClass}
                    onClick={onReschedule}
                  >
                    <ItemIcon>
                      <RiCalendarLine size={16} />
                    </ItemIcon>
                    <ItemLabel>{ACTIONS.reschedule}</ItemLabel>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  variant="destructive"
                  className={itemDestructiveClass}
                  onClick={onCancel}
                >
                  <ItemIcon variant="destructive">
                    <RiCloseLine size={16} />
                  </ItemIcon>
                  <ItemLabel>{ACTIONS.cancel}</ItemLabel>
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem disabled className={itemResetClass}>
                <ItemLabel className="text-xs text-red-600/80">
                  {PAGE.presentations.portalLocked}
                </ItemLabel>
              </DropdownMenuItem>
            )}
          </MenuSection>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>

    <UpdateTranscriptDialog
      isOpen={transcriptOpen}
      onClose={() => setTranscriptOpen(false)}
      meetingUuid={meeting.uuid}
      property={meeting.property}
      initialTranscript={meeting.transcript || ""}
    />
    </>
  );
}
