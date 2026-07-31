import Image from 'next/image';
import { cn } from '@/lib/utils';
import { PROPLEY_LOGO_PATH } from '@/lib/brand-logos';

const SIZE_MAP = {
  sm: { width: 28, height: 28, className: 'h-7 w-7' },
  md: { width: 40, height: 40, className: 'h-10 w-10' },
  lg: { width: 52, height: 52, className: 'h-[52px] w-[52px]' },
  xl: { width: 72, height: 72, className: 'h-[72px] w-[72px]' },
} as const;

type PropleyLogoSize = keyof typeof SIZE_MAP;

interface PropleyLogoProps {
  size?: PropleyLogoSize;
  className?: string;
  priority?: boolean;
}

export function PropleyLogo({ size = 'md', className, priority }: PropleyLogoProps) {
  const dims = SIZE_MAP[size];

  return (
    <Image
      src={PROPLEY_LOGO_PATH}
      alt="Propley"
      width={dims.width}
      height={dims.height}
      priority={priority}
      className={cn('object-contain', dims.className, className)}
    />
  );
}
