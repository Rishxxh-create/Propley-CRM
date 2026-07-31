"use client";

import {
  RiLayoutGridLine,
  RiMicLine,
  RiMicOffLine,
  RiVideoChatFill,
  RiVideoChatLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiPhoneLine,
  RiFileList3Line,
  RiLineChartLine,
  RiUser3Line,
  RiBrushLine,
  RiPresentationLine,
} from "react-icons/ri";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeviceSettingsMenu, type DeviceOption } from "@/components/session/DeviceSettingsMenu";
import { EndSessionModal } from "./EndSessionModal";
import {
  canGoNext,
  canGoPrev,
  formatSlidePosition,
  formatSlidePositionCompact,
  getAdjacentSlideId,
  type MandakeSlide,
} from "@/lib/mandake-slides";

import { memo } from "react";

type DrawerType = "analytics" | "script" | "visitors" | "notes" | null;

interface FooterControlsProps {
  slides: MandakeSlide[];
  slidesLoading?: boolean;
  activeSlide: string;
  setActiveSlide: (val: string) => void;
  isMicOn: boolean;
  setIsMicOn: (val: boolean) => void;
  isCamOn: boolean;
  setIsCamOn: (val: boolean) => void;
  isAnnotating: boolean;
  setIsAnnotating: (val: boolean) => void;
  activeDrawer: DrawerType;
  setActiveDrawer: (drawer: DrawerType) => void;
  executiveNodeClass: string;
  participantCount?: number;
  showObservers: boolean;
  setShowObservers: (val: boolean) => void;
  endSession: () => void;
  // Screen share
  isScreenSharing: boolean;
  onToggleScreenShare: () => void;
  // Device picker
  devices: { cameras: DeviceOption[]; microphones: DeviceOption[] };
  currentCameraId: string | null;
  currentMicrophoneId: string | null;
  onSwitchCamera: (id: string) => void;
  onSwitchMicrophone: (id: string) => void;
  onRefreshDevices: () => void;
}

export const FooterControls = memo(function FooterControls({
  slides,
  slidesLoading = false,
  activeSlide,
  setActiveSlide,
  isMicOn,
  setIsMicOn,
  isCamOn,
  setIsCamOn,
  isAnnotating,
  setIsAnnotating,
  activeDrawer,
  setActiveDrawer,
  executiveNodeClass,
  participantCount = 4,
  showObservers,
  setShowObservers,
  endSession,
  isScreenSharing,
  onToggleScreenShare,
  devices,
  currentCameraId,
  currentMicrophoneId,
  onSwitchCamera,
  onSwitchMicrophone,
  onRefreshDevices,
}: FooterControlsProps) {
  const goPrev = () => {
    if (canGoPrev(slides, activeSlide)) {
      setActiveSlide(getAdjacentSlideId(slides, activeSlide, "prev"));
    }
  };

  const goNext = () => {
    if (canGoNext(slides, activeSlide)) {
      setActiveSlide(getAdjacentSlideId(slides, activeSlide, "next"));
    }
  };

  const slidePosition = formatSlidePosition(slides, activeSlide);
  const slidePositionCompact = formatSlidePositionCompact(slides, activeSlide);
  const navDisabled = slidesLoading || slides.length === 0 || !activeSlide;

  return (
    <footer className="bg-obsidian/80 backdrop-blur-md flex flex-col lg:flex-row items-center justify-between px-4 lg:px-8 z-50 border-t border-white/5 shrink-0 h-auto py-3 lg:py-0 lg:h-[56px] gap-4 lg:gap-0">
      {/* MOBILE ROW 1: NAVIGATION (Only visible on mobile) */}
      <div className="flex lg:hidden items-center justify-between w-full border-b border-white/5 pb-3 gap-3">
        <div className="flex-1">
          <Select
            key={`mobile-${activeSlide}`}
            value={activeSlide || undefined}
            onValueChange={(val) => val && setActiveSlide(val)}
            disabled={navDisabled}
          >
            <SelectTrigger className="w-full h-10 bg-white/5 border border-white/10 flex items-center justify-start px-4 text-gold-light hover:bg-white/10 hover:border-gold/30 transition-all active:scale-[0.98] text-[10px] font-bold uppercase tracking-widest disabled:opacity-50">
              <RiLayoutGridLine size={18} className="mr-3" />
              <SelectValue placeholder="Select Slide" />
            </SelectTrigger>
            <SelectContent
              side="top"
              className="bg-zinc-950 border-white/10 text-zinc-400 rounded-lg p-1"
            >
              {slides.map((item) => (
                <SelectItem
                  key={item.id}
                  value={item.id}
                  className="text-[10px] font-semibold py-2.5 px-3 focus:bg-gold focus:!text-white data-[state=checked]:bg-gold data-[state=checked]:!text-white cursor-pointer rounded-lg transition-all"
                >
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-4 h-10">
          <button
            type="button"
            onClick={goPrev}
            disabled={navDisabled || !canGoPrev(slides, activeSlide)}
            className="text-zinc-500 hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <RiArrowLeftLine size={18} />
          </button>
          <span className="text-[10px] font-semibold tabular-nums text-white">
            {slidePosition}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={navDisabled || !canGoNext(slides, activeSlide)}
            className="text-zinc-500 hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <RiArrowRightLine size={18} />
          </button>
        </div>
      </div>

      {/* DESKTOP VIEW / MOBILE ROW 2: SYSTEM CONTROLS */}
      <div className="flex items-center justify-between w-full lg:w-full lg:gap-6">
        {/* DESKTOP SLIDE SELECT (Hidden on mobile) */}
        <div className="hidden lg:block">
          <Select
            key={`desktop-${activeSlide}`}
            value={activeSlide || undefined}
            onValueChange={(val) => val && setActiveSlide(val)}
            disabled={navDisabled}
          >
            <SelectTrigger className="w-[200px] h-10 bg-white/5 border-white/10 hover:bg-white/10 rounded-lg text-white text-[10px] font-semibold focus:ring-0 focus:border-gold px-4 transition-colors disabled:opacity-50">
              <div className="flex items-center gap-3">
                <RiLayoutGridLine className="text-gold" />
                <SelectValue placeholder="Select Slide" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-white/10 text-zinc-400 rounded-lg p-1">
              {slides.map((item) => (
                <SelectItem
                  key={item.id}
                  value={item.id}
                  className="text-[10px] font-semibold py-2.5 px-3 focus:bg-gold focus:!text-white data-[state=checked]:bg-gold data-[state=checked]:!text-white cursor-pointer rounded-lg transition-all"
                >
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* PRIMARY MEDIA CONTROLS */}
        <div className="flex items-center bg-white/5 border border-white/10 h-10 shadow-2xl overflow-hidden">
          <div className="flex items-center gap-px pr-2 lg:pr-4 border-r border-white/10 h-full">
            <button
              onClick={() => setIsMicOn(!isMicOn)}
              className={cn(
                "w-10 h-full flex items-center justify-center transition-all",
                isMicOn
                  ? "hover:bg-white/10 text-white/70 hover:text-white"
                  : "bg-red-500/20 text-red-500",
              )}
            >
              {isMicOn ? <RiMicLine size={18} /> : <RiMicOffLine size={18} />}
            </button>
            <button
              onClick={() => setIsCamOn(!isCamOn)}
              className={cn(
                "w-10 h-full flex items-center justify-center transition-all",
                isCamOn
                  ? "hover:bg-white/10 text-white/70 hover:text-white"
                  : "bg-red-500/20 text-red-500",
              )}
            >
              {isCamOn ? (
                <RiVideoChatFill size={18} />
              ) : (
                <RiVideoChatLine size={18} />
              )}
            </button>
            <button
              onClick={() => setIsAnnotating(!isAnnotating)}
              className={cn(
                "w-10 h-full flex items-center justify-center transition-all border-l border-white/10",
                isAnnotating
                  ? "bg-gold text-white"
                  : "hover:bg-white/10 text-white/70 hover:text-white",
              )}
              title="Toggle Annotation"
            >
              <RiBrushLine size={18} />
            </button>
            <button
              onClick={onToggleScreenShare}
              className={cn(
                "w-10 h-full flex items-center justify-center transition-all border-l border-white/10",
                isScreenSharing
                  ? "bg-gold-light text-black"
                  : "hover:bg-white/10 text-white/70 hover:text-white",
              )}
              title={isScreenSharing ? "Stop sharing" : "Share screen"}
            >
              <RiPresentationLine size={18} />
            </button>
            <DeviceSettingsMenu
              devices={devices}
              currentCameraId={currentCameraId}
              currentMicrophoneId={currentMicrophoneId}
              onSwitchCamera={onSwitchCamera}
              onSwitchMicrophone={onSwitchMicrophone}
              onOpen={onRefreshDevices}
              side="top"
              align="center"
              triggerClassName="w-10 h-full border-l border-white/10 hover:bg-white/10 text-white/70 hover:text-white"
            />
          </div>

          {/* DESKTOP NAV (Hidden on mobile) */}
          <div className="hidden lg:flex items-center gap-4 px-6 h-full border-r border-white/10">
            <button
              type="button"
              onClick={goPrev}
              disabled={navDisabled || !canGoPrev(slides, activeSlide)}
              className="text-zinc-400 hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <RiArrowLeftLine size={18} />
            </button>
            <div className="flex flex-col items-center justify-center min-w-[60px]">
              <span className="text-xs font-bold tabular-nums leading-none text-white">
                {slidePositionCompact}
              </span>
            </div>
            <button
              type="button"
              onClick={goNext}
              disabled={navDisabled || !canGoNext(slides, activeSlide)}
              className="text-zinc-400 hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <RiArrowRightLine size={18} />
            </button>
          </div>

          <div className="h-full flex items-center">
            <EndSessionModal onConfirm={endSession}>

              <div className="h-full px-4 lg:px-5 bg-red-600 text-white text-[10px] font-bold flex items-center gap-2 hover:bg-red-700 transition-all cursor-pointer">
                <RiPhoneLine className="rotate-[135deg]" size={18} />
                <span className="hidden lg:inline">End</span>
              </div>
            </EndSessionModal>
          </div>
        </div>

        {/* DRAWER TRIGGERS */}
        <div className="flex items-center gap-2 lg:gap-3">
          <button
            onClick={() => setShowObservers(!showObservers)}
            className={cn(
              executiveNodeClass,
              "h-10 px-3 flex items-center justify-center gap-2 transition-colors",
              showObservers
                ? "bg-gold-light text-black"
                : "bg-white/5 text-white/80 border-white/10",
            )}
          >
            <RiUser3Line size={18} />
            <div
              className={`w-[1px] h-full mr-1  ${showObservers ? "bg-black/10" : "bg-white/10"}`}
            ></div>
            <span className="text-[10px] font-bold">{participantCount}</span>
          </button>
        </div>
      </div>
    </footer>
  );
});
