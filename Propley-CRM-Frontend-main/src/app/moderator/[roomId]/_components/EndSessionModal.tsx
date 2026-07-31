"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RiPhoneLine, RiAlertLine, RiLoader4Line } from "react-icons/ri";
import { cn } from "@/lib/utils";

interface EndSessionModalProps {
  children: React.ReactNode;
  onConfirm: () => void | Promise<void>;
}

export function EndSessionModal({ children, onConfirm }: EndSessionModalProps) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = () => {
    setIsPending(true);
    setOpen(false);
    
    // Give Radix UI time to remove body pointer-events-none and data-scroll-locked
    // before the router unmounts the current page
    setTimeout(async () => {
      try {
        await onConfirm();
      } catch (e) {
        setIsPending(false);
        setOpen(true);
      }
    }, 150);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={children as React.ReactElement}
        nativeButton={false}
      />
      <DialogContent
        overlayClassName="bg-ink/70 supports-backdrop-filter:backdrop-blur-md"
        className="bg-ivory border-stone-alt rounded-lg p-8 max-w-md shadow-2xl"
      >
        <DialogHeader className="space-y-4">
          <div className="w-12 h-12 bg-red-50 flex items-center justify-center text-red-600">
            <RiAlertLine size={24} />
          </div>
          <div className="space-y-1">
            <DialogTitle className="text-2xl font-semibold tracking-tight text-ink">
              End Sale Session?
            </DialogTitle>
            <DialogDescription className="text-zinc-500 font-medium">
              Are you sure you want to end this session?
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter className="mt-8 flex flex-col! gap-3 w-full">
          <Button
            onClick={handleConfirm}
            disabled={isPending}
            className="w-full bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase tracking-[0.15em] rounded-lg h-14 flex items-center justify-center gap-2 cursor-pointer border-none disabled:opacity-50"
          >
            {isPending ? (
              <>
                <RiLoader4Line className="animate-spin" size={16} />
                Exiting…
              </>
            ) : (
              <>
                <RiPhoneLine className="rotate-[135deg]" size={16} />
                Exit Meeting
              </>
            )}
          </Button>
          <DialogClose
            disabled={isPending}
            render={
              <Button
                variant="outline"
                disabled={isPending}
                className="w-full border-stone-alt text-ink text-[10px] font-bold uppercase tracking-[0.15em] rounded-lg h-14 hover:bg-stone transition-colors cursor-pointer text-center flex items-center justify-center disabled:opacity-50"
              />
            }
          >
            Cancel
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

