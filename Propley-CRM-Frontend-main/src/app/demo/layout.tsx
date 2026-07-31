import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import { getDemoStylesheetUrl } from '@/lib/clarity-config';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Propley Demo | Clarity tracking',
  description: 'Demo landing page with Microsoft Clarity heatmaps and session recordings.',
};

const criticalCss = `
  .clarity-demo-root { margin:0; background:#fbfbf9; color:#1a1a1a; font-family:'DM Sans',system-ui,sans-serif; }
  .clarity-demo-bar { height:6px; background:#8b6b3f; }
`;

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  const stylesheetUrl = getDemoStylesheetUrl();

  return (
    <div className={`clarity-demo-root ${dmSans.className}`} style={{ minHeight: '100vh' }}>
      {/* Absolute URL + unmask so Clarity replay can load styles (see clarity-config.ts) */}
      <link
        rel="stylesheet"
        href={stylesheetUrl}
        data-clarity-unmask="true"
        precedence="default"
      />
      <style data-clarity-unmask="true" dangerouslySetInnerHTML={{ __html: criticalCss }} />
      <div className="clarity-demo-bar" aria-hidden />
      {children}
    </div>
  );
}
