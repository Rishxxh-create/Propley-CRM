'use client';

import { RiCameraLine, RiMicLine, RiCheckLine, RiSettings3Line } from 'react-icons/ri';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface DeviceOption {
  id: string;
  label: string;
}

interface DeviceSettingsMenuProps {
  devices: { cameras: DeviceOption[]; microphones: DeviceOption[] };
  currentCameraId: string | null;
  currentMicrophoneId: string | null;
  onSwitchCamera: (id: string) => void;
  onSwitchMicrophone: (id: string) => void;
  /** Called when the menu opens — refresh the device list (labels need permission). */
  onOpen?: () => void;
  triggerClassName?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
}

export function DeviceSettingsMenu({
  devices,
  currentCameraId,
  currentMicrophoneId,
  onSwitchCamera,
  onSwitchMicrophone,
  onOpen,
  triggerClassName,
  side = 'top',
  align = 'center',
}: DeviceSettingsMenuProps) {
  const renderGroup = (
    title: string,
    Icon: typeof RiCameraLine,
    options: DeviceOption[],
    currentId: string | null,
    onSelect: (id: string) => void,
  ) => (
    <div className="py-2">
      <div className="flex items-center gap-2 px-3 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
        <Icon size={12} className="text-gold-light" />
        {title}
      </div>
      {options.length === 0 ? (
        <div className="px-3 py-2 text-[10px] text-zinc-600">No devices found</div>
      ) : (
        options.map((d) => {
          const active = currentId === d.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onSelect(d.id)}
              className={cn(
                'w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-[10px] font-medium transition-colors',
                active
                  ? 'bg-gold-light text-black'
                  : 'text-zinc-300 hover:bg-white/5 hover:text-white',
              )}
            >
              <span className="truncate">{d.label}</span>
              {active && <RiCheckLine size={13} className="shrink-0" />}
            </button>
          );
        })
      )}
    </div>
  );

  return (
    <Popover
      onOpenChange={(open: boolean) => {
        if (open) onOpen?.();
      }}
    >
      <PopoverTrigger
        title="Devices"
        className={cn('flex items-center justify-center transition-all', triggerClassName)}
      >
        <RiSettings3Line size={18} />
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={8}
        className="w-64 gap-0 p-0 bg-zinc-950 border border-white/10 ring-0 text-white rounded-lg divide-y divide-white/5"
      >
        {renderGroup('Camera', RiCameraLine, devices.cameras, currentCameraId, onSwitchCamera)}
        {renderGroup('Microphone', RiMicLine, devices.microphones, currentMicrophoneId, onSwitchMicrophone)}
      </PopoverContent>
    </Popover>
  );
}
