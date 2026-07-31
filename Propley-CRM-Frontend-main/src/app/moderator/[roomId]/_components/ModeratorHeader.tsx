"use client";

import {
  RiShareForwardLine,
  RiTimeLine,
  RiLineChartLine,
  RiRadarLine,
  RiTeamLine,
  RiFileList3Line,
  RiStickyNoteLine,
} from "react-icons/ri";
import { cn } from "@/lib/utils";
import { PropleyLogo } from "@/components/PropleyLogo";
import { toast } from "@/lib/toast";

import { SessionTimer } from "./SessionTimer";

type DrawerType = "analytics" | "script" | "visitors" | "notes" | null;

interface HeaderProps {
  activeDrawer: DrawerType;
  setActiveDrawer: (drawer: DrawerType) => void;
  executiveNodeClass: string;
  activeNodeClass: string;
  meeting?: any;
  participantCount: number;
}

export function ModeratorHeader({
  activeDrawer,
  setActiveDrawer,
  executiveNodeClass,
  activeNodeClass,
  meeting,
  participantCount,
}: HeaderProps) {
  console.log("MODERATOR HEADER MEETING:", meeting);
  return (
    <header className="py-1 flex items-center justify-between px-8 z-50 bg-black/40 backdrop-blur-md shrink-0 border-b border-white/5 h-[56px]">
      <div className="flex items-center gap-2">
        <div className="flex flex-col pr-2">
          <PropleyLogo size="sm" className="brightness-110" />
        </div>
        <div className="h-8 w-[1px] bg-white/10 hidden lg:block" />

        <div
          id="currentRoomDisplay"
          className="hidden lg:flex h-10 px-4 bg-gold/10 border border-gold-light/20 text-[10px] font-bold text-gold-light items-center gap-2 tracking-widest uppercase"
        >
          Client: {meeting?.meeting_for || "Instant Presentation"}
        </div>

        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href.replace("/moderator/", "/participant/"));
            toast.success("Participant link copied to clipboard");
          }}
          className={cn(executiveNodeClass, "h-10 w-10 px-0 relative flex items-center justify-center")}
        >
          <RiShareForwardLine size={18} />
        </button>
      </div>

      <div className="flex items-center gap-6">
        <SessionTimer />

        <div className="flex items-center gap-1.5 relative">
          <button
            onClick={() =>
              setActiveDrawer(activeDrawer === "analytics" ? null : "analytics")
            }
            className={cn(
              executiveNodeClass,
              "h-10 w-10 px-0 flex items-center justify-center",
              activeDrawer === "analytics" && activeNodeClass,
            )}
          >
            <RiLineChartLine size={18} />
          </button>
          
          <button
            onClick={() =>
              setActiveDrawer(activeDrawer === "script" ? null : "script")
            }
            className={cn(
              executiveNodeClass,
              "h-10 w-10 px-0 flex items-center justify-center",
              activeDrawer === "script" && activeNodeClass,
            )}
          >
            <RiFileList3Line size={18} />
          </button>

          <button
            onClick={() =>
              setActiveDrawer(activeDrawer === "notes" ? null : "notes")
            }
            className={cn(
              executiveNodeClass,
              "h-10 w-10 px-0 flex items-center justify-center",
              activeDrawer === "notes" && activeNodeClass,
            )}
            title="Session Notes"
          >
            <RiStickyNoteLine size={18} />
          </button>

          <button
            onClick={() =>
              setActiveDrawer(activeDrawer === "visitors" ? null : "visitors")
            }
            className={cn(
              executiveNodeClass,
              "h-10 w-10 px-0 flex items-center justify-center relative",
              activeDrawer === "visitors" && activeNodeClass,
            )}
          >
            <RiTeamLine size={18} />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gold-light text-black rounded-full text-[8px] font-bold flex items-center justify-center border border-black">
              {participantCount}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
