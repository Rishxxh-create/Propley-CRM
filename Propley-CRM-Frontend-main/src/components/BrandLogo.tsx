import Image from 'next/image';
import { BRAND_LOGO_PATHS, type BrandLogoKey } from '@/lib/brand-logos';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  brand: BrandLogoKey;
  size?: number;
  className?: string;
  alt?: string;
}

export function BrandLogo({ brand, size = 16, className, alt = '' }: BrandLogoProps) {
  return (
    <Image
      src={BRAND_LOGO_PATHS[brand]}
      alt={alt}
      width={size}
      height={size}
      className={cn('shrink-0 object-contain', className)}
      aria-hidden={!alt}
    />
  );
}
