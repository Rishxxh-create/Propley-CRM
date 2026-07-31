'use client';

import { useState } from 'react';
import { 
  RiCloseLine, 
  RiFileCopyLine, 
  RiWhatsappLine,
  RiExternalLinkLine
} from 'react-icons/ri';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion } from 'framer-motion';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  link: string;
  clientName: string;
  projectName?: string;
  mode?: 'share' | 'resend';
}

export default function WhatsAppShareModal({
  isOpen,
  onClose,
  link,
  clientName,
  projectName = 'The Ivory Pavilion',
  mode = 'share',
}: WhatsAppShareModalProps) {
  const isResend = mode === 'resend';
  const [copied, setCopied] = useState(false);
  const [currentTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  const salutation = clientName.includes('& Family') ? clientName : `${clientName} & Family`;
  
  const message = `Dear *${salutation}*,

We’re pleased to invite you for a *Quick eTour* of _${projectName}_.

*Join via:* ${link}

Kindly enable *audio* and *video* access for the session.

We look forward to presenting the project to you.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="p-0 border-none bg-transparent shadow-none max-w-[440px] w-full">
        <motion.div 
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white border border-stone-alt w-full shadow-2xl relative overflow-hidden flex flex-col rounded-lg"
        >
          {/* WhatsApp Brand Color Accent */}
          <div className="absolute left-0 top-0 w-full h-[4px] bg-[#075E54]"></div>

          <DialogHeader className="p-8 pb-4 border-b border-stone-alt flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-semibold text-ink tracking-tight leading-none mb-2">
                {isResend ? 'Resend WhatsApp message' : 'Invite client'}
              </DialogTitle>
              <p className="text-xs font-medium text-zinc-500">
                {isResend ? 'Dispatch invitation again via WhatsApp' : 'Participate link sharing'}
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="w-10 h-10 rounded-lg hover:bg-stone flex items-center justify-center transition-colors text-zinc-500 hover:text-ink"
            >
              <RiCloseLine size={24} />
            </button>
          </DialogHeader>

          {/* WHATSAPP MESSAGE BUBBLE PREVIEW */}
          <div className="p-8 bg-[#E5DDD5] relative overflow-hidden min-h-[300px] flex items-center justify-center">
            {/* Background Pattern */}
            <div 
              className="absolute inset-0 opacity-[0.08] pointer-events-none" 
              style={{ 
                backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", 
                backgroundSize: '200px' 
              }}
            ></div>

            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative z-10 bg-white p-5 rounded-2xl rounded-tl-none shadow-xl max-w-[95%] max-h-[250px] overflow-y-auto custom-scrollbar flex flex-col gap-3 border border-white/20"
            >
              <p className="text-[13px] leading-relaxed text-[#111B21] whitespace-pre-line font-medium">
                {message}
              </p>
              <div className="flex items-center justify-end gap-1.5 opacity-50">
                <span className="text-[9px] text-[#111B21] font-semibold">{currentTime}</span>
              </div>
            </motion.div>
          </div>

          <footer className="p-8 border-t border-stone-alt flex flex-col gap-3 bg-stone/20">
            <div className="flex items-stretch gap-3">
              <Tooltip open={copied}>
                <TooltipTrigger
                  onClick={handleCopy}
                  className="flex-1 py-4 bg-white border border-stone-alt text-[10px] font-semibold text-ink hover:bg-stone transition-all flex items-center justify-center gap-2 rounded-lg shadow-sm uppercase tracking-widest"
                >
                  <RiFileCopyLine className="text-gold" />
                  {copied ? 'Copied Link' : 'Copy Participate Link'}
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-ink text-white text-xs font-semibold border-none rounded-lg py-2 px-4">
                  Link Copied!
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger 
                  onClick={() => window.open(link, '_blank')}
                  className="w-14 py-4 bg-white border border-stone-alt text-ink hover:bg-stone transition-all flex items-center justify-center rounded-lg shrink-0 shadow-sm"
                >
                  <RiExternalLinkLine className="text-gold" size={20} />
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-ink text-white text-xs font-semibold border-none rounded-lg py-2 px-4">
                  Initialize Engine
                </TooltipContent>
              </Tooltip>
            </div>

            <button 
              onClick={handleShare}
              className="w-full py-4 bg-[#075E54] text-white text-[10px] font-semibold shadow-2xl shadow-green-900/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 rounded-lg uppercase tracking-widest"
            >
              <RiWhatsappLine className="text-xl" />
              {isResend ? 'Resend on WhatsApp' : 'Share on WhatsApp'}
            </button>
          </footer>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
