import type { DealStage } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

export function dealStageBadgeClass(stage: DealStage): string {
  const map: Record<DealStage, string> = {
    inquiry: 'bg-stone text-zinc-700 border-stone-alt',
    vsv_scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
    vsv_done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    offer: 'bg-amber-50 text-amber-700 border-amber-200',
    negotiation: 'bg-orange-50 text-orange-700 border-orange-200',
    closed_won: 'bg-gradient-to-r from-emerald-800 to-emerald-950 text-white border-transparent shadow-sm',
    closed_lost: 'bg-red-50 text-red-700 border-red-200',
  };
  return cn(map[stage]);
}
