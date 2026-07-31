'use client';

import { useMemo } from 'react';
import { RiFocus3Line, RiArrowRightUpLine } from 'react-icons/ri';
import { BrandLogo } from '@/components/BrandLogo';
import { getLeadSourceLabel } from '@/lib/lead-source-options';
import type { Customer } from '@/lib/mock-data';
import { Skeleton } from '@/components/ui/skeleton';

interface AutoTaggedSourcesProps {
  customers: Customer[];
  selectedSource: string | null;
  onSelectSource: (source: string | null) => void;
  loading?: boolean;
}

export function AutoTaggedSources({ customers, selectedSource, onSelectSource, loading }: AutoTaggedSourcesProps) {
  // Dynamically compute counts based on the customers fetched from the API
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    customers.forEach(c => {
      if (c.leadSource) {
        const source = c.leadSource.toLowerCase();
        counts[source] = (counts[source] || 0) + 1;
      }
    });
    return counts;
  }, [customers]);

  // Render detailed skeleton loading state if loading
  if (loading) {
    return (
      <div className="py-2 bg-stone/20 overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-2 min-w-max">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-2.5 pl-2 py-1.5 border border-stone-alt bg-white rounded-full shadow-sm"
            >
              <Skeleton className="w-4 h-4 rounded-full bg-zinc-200 animate-pulse" />
              <Skeleton className="h-3 w-16 bg-zinc-200 animate-pulse" />
              <Skeleton className="h-3 w-4 bg-zinc-100 animate-pulse rounded-sm" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Define how each source is rendered
  const sourceConfig: Record<string, { label: string; renderIcon: () => React.ReactNode }> = {
    referral: {
      label: 'Referral',
      renderIcon: () => (
        <div className="w-4 h-4 bg-[#A67C52] rounded-full flex items-center justify-center text-white">
          <RiArrowRightUpLine size={10} />
        </div>
      )
    },
    google: {
      label: 'Google Ads',
      renderIcon: () => <BrandLogo brand="google" size={14} />
    },
    instagram: {
      label: 'Instagram DM',
      renderIcon: () => <BrandLogo brand="instagram" size={14} />
    },
    facebook: {
      label: 'Facebook Lead Ad',
      renderIcon: () => <BrandLogo brand="facebook" size={14} />
    },
    magicbricks: {
      label: 'MagicBricks',
      renderIcon: () => (
        <div className="w-4 h-4 bg-[#E85D04] rounded-sm flex items-center justify-center text-white font-bold text-[9px]">
          M
        </div>
      )
    }
  };

  // Convert to an array and sort by count descending
  // If there are no real customers with sources yet, we'll show the mock data for visual consistency
  let sourcesToRender = Object.entries(sourceCounts)
    .filter(([_, count]) => count > 0)
    .map(([key, count]) => ({
      key,
      count,
      label: getLeadSourceLabel(key) || sourceConfig[key]?.label || key,
      renderIcon: sourceConfig[key]?.renderIcon || (() => <span className="w-4 h-4 rounded-full bg-stone-alt flex items-center justify-center text-[10px]">{key.charAt(0).toUpperCase()}</span>)
    }))
    .sort((a, b) => b.count - a.count);

  if (sourcesToRender.length === 0) {
    return null;
  }

  return (
    <div className="py-2 bg-stone/20 overflow-x-auto custom-scrollbar">
      <div className="flex items-center gap-4 min-w-max">

        <div className="flex items-center gap-2">
          {sourcesToRender.map(source => {
            const isSelected = selectedSource === source.key;
            return (
              <div
                key={source.key}
                onClick={() => onSelectSource(isSelected ? null : source.key)}
                className={`flex items-center gap-1.5 px-2.5 pl-2 py-1.5 border rounded-full shadow-sm text-xs cursor-pointer transition-all ${isSelected
                  ? 'bg-gold/10 border-gold text-gold-hover'
                  : 'bg-white border-stone-alt text-ink/80 hover:border-gold/40'
                  }`}
              >
                {source.renderIcon()}
                <span className="font-medium">{source.label}</span>
                <span className={`font-bold ${isSelected ? 'text-gold' : 'text-ink'}`}>{
                  String(source.count).padStart(2, '0')
                }</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
