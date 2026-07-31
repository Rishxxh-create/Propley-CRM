'use client';

import {
  RiMicLine,
  RiMicOffLine,
  RiVideoChatFill,
  RiVideoChatLine,
  RiUser3Line,
  RiPhoneFill,
  RiPresentationLine,
} from 'react-icons/ri';
import { cn } from '@/lib/utils';
import { DeviceSettingsMenu, type DeviceOption } from '@/components/session/DeviceSettingsMenu';

interface CommandBarProps {
  isMicOn: boolean;
  setIsMicOn: (val: boolean) => void;
  isCamOn: boolean;
  setIsCamOn: (val: boolean) => void;
  presenceVisible: boolean;
  setPresenceVisible: (val: boolean) => void;
  onHangUp: () => void;
  // Device picker
  devices: { cameras: DeviceOption[]; microphones: DeviceOption[] };
  currentCameraId: string | null;
  currentMicrophoneId: string | null;
  onSwitchCamera: (id: string) => void;
  onSwitchMicrophone: (id: string) => void;
  onRefreshDevices: () => void;
}

export function CommandBar({
  isMicOn,
  setIsMicOn,
  isCamOn,
  setIsCamOn,
  presenceVisible,
  setPresenceVisible,
  onHangUp,
  devices,
  currentCameraId,
  currentMicrophoneId,
  onSwitchCamera,
  onSwitchMicrophone,
  onRefreshDevices,
}: CommandBarProps) {

  const nodeBaseClass = "h-12 md:h-[56px] px-6 md:px-8 flex items-center justify-center transition-all duration-300 text-white/60 hover:text-white rounded-lg relative group border-r border-white/5 last:border-r-0";
  const activeNodeClass = "text-gold";

  return (
    <div className={cn(
      "w-full bg-[#1e1e1e] border-t border-white/5 flex items-center justify-center transition-all duration-500",
      "h-auto md:h-[56px] relative z-50 pb-[env(safe-area-inset-bottom)] py-3"
    )}>
      {/* CENTERED ICON CLUSTER */}
      <div className="flex items-center bg-white/[0.03] border border-white/5">
        <button
          onClick={() => setIsMicOn(!isMicOn)}
          className={cn(nodeBaseClass, !isMicOn && "text-red-500")}
          title={isMicOn ? 'Mute' : 'Unmute'}
        >
          {isMicOn ? <RiMicLine size={20} /> : <RiMicOffLine size={20} />}
        </button>

        <button
          onClick={() => setIsCamOn(!isCamOn)}
          className={cn(nodeBaseClass, !isCamOn && "text-red-500")}
          title={isCamOn ? 'Stop Cam' : 'Start Cam'}
        >
          {isCamOn ? <RiVideoChatFill size={20} /> : <RiVideoChatLine size={20} />}
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
          triggerClassName={nodeBaseClass}
        />

        <button
          onClick={() => setPresenceVisible(!presenceVisible)}
          className={cn(nodeBaseClass, presenceVisible && activeNodeClass)}
          title="Toggle Presence"
        >
          {/* RiUser3Line icon instead of RiPresentationLine */}
          <RiUser3Line size={20} />
        </button>

        <button
          onClick={onHangUp}
          className="h-12 md:h-[56px] px-8 md:px-10 bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-all cursor-pointer border-none group"
          title="Hang Up"
        >
          <RiPhoneFill size={20} className="rotate-[135deg] group-hover:scale-110 transition-transform" />
        </button>
      </div>
    </div>
  );
}
