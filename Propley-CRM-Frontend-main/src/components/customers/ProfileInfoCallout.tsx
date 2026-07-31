import { RiInformationLine } from 'react-icons/ri';

interface ProfileInfoCalloutProps {
  title: string;
  children: React.ReactNode;
}

export function ProfileInfoCallout({ title, children }: ProfileInfoCalloutProps) {
  return (
    <aside
      className="border border-stone-alt bg-stone/60 px-4 py-3"
      aria-label={title}
    >
      <div className="flex gap-3">
        <RiInformationLine className="mt-0.5 shrink-0 text-gold" size={16} aria-hidden />
        <div className="min-w-0 space-y-1.5 text-xs leading-relaxed text-zinc-600">{children}</div>
      </div>
    </aside>
  );
}
