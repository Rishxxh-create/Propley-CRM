import Link from 'next/link';
import { RiArrowLeftLine } from 'react-icons/ri';

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-stone">
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="space-y-6 max-w-md">
          {/* Signature Accent Line */}
          <div className="h-[2px] w-16 bg-gold mx-auto" />
          
          <div className="space-y-2">
            <h1 className="text-5xl font-semibold tracking-tight text-ink">
              404.
            </h1>
            <p className="text-sm font-medium text-zinc-500 leading-relaxed">
              The presentation or page you are looking for has been moved, deleted, or does not exist.
            </p>
          </div>

          <div className="pt-8 flex justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-md bg-ink text-white hover:bg-gold transition-colors text-xs font-semibold shadow-none!"
            >
              <RiArrowLeftLine size={16} />
              Return to Engine
            </Link>
          </div>
        </div>
      </div>
      
      {/* Minimal Footer */}
      <div className="p-6 text-center">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-zinc-400 uppercase">
          Propley Sales Engine
        </p>
      </div>
    </div>
  );
}
