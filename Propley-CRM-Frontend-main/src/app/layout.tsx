import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import Script from "next/script";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import ReduxProvider from "@/components/providers/ReduxProvider";
import { OrbContainer } from "@/components/voice-agent/OrbContainer";
import { VoiceAgentProvider } from "@/context/VoiceAgentProvider";
import { VoiceAgentLayoutWrapper } from "@/components/voice-agent/VoiceAgentLayoutWrapper";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Propley | Premium Property Showcase",
  description: "Experience luxury living through our cinematic property showcases.",
  keywords: ["real estate", "luxury properties", "cinematic showcase", "propley"],
  authors: [{ name: "Propley Team" }],
  manifest: "/site.webmanifest",
};

export const viewport = {
  themeColor: "#8B6B3F", // Gold
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>

        <Script src="/EnxRtc.js" strategy="beforeInteractive" />
      </head>
      <body className={`${dmSans.variable} min-h-full bg-background text-ink font-sans selection:bg-gold-muted selection:text-ink`} suppressHydrationWarning>
        <ReduxProvider>
          <TooltipProvider delay={0}>
            <VoiceAgentProvider>
              <VoiceAgentLayoutWrapper>
                {children}
              </VoiceAgentLayoutWrapper>
              <OrbContainer />
            </VoiceAgentProvider>
            <Toaster position="top-right" />
          </TooltipProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}

