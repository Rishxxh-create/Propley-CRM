/** Primary Propley mark (`public/propley_logo.jpeg`) */
export const PROPLEY_LOGO_PATH = '/propley_logo.jpeg';

/** Brand assets in `public/company/` */
export const BRAND_LOGO_PATHS = {
  googleCalendar: '/company/Google_google_calendar_0.svg',
  google: '/company/Google_Symbol_2.webp',
  facebook: '/company/facebook.png',
  instagram: '/company/instagram.webp',
  linkedin: '/company/linkdin.webp',
} as const;

export type BrandLogoKey = keyof typeof BRAND_LOGO_PATHS;

export function brandLogoForPlatform(platform: string): BrandLogoKey | undefined {
  const key = platform.toLowerCase();
  if (key === 'linkedin') return 'linkedin';
  if (key === 'instagram') return 'instagram';
  return undefined;
}

export function brandLogoForLeadSource(id: string): BrandLogoKey | undefined {
  if (id === 'google') return 'google';
  if (id === 'facebook') return 'facebook';
  if (id === 'instagram') return 'instagram';
  if (id === 'linkedin') return 'linkedin';
  return undefined;
}
