import type { Metadata } from "next";
import { Outfit, DM_Mono } from "next/font/google";
import SiteNav from "@/components/layout/SiteNav";
import TourOverlay from "@/components/tour/TourOverlay";
import { TelemetryProvider } from "@/providers/TelemetryProvider";
import { NotifyProvider } from "@/providers/NotifyProvider";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/providers/ThemeProvider";
import { TourProvider } from "@/providers/TourProvider";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

// DM Mono is Midnight's brand monospace face (used across midnight.network)
const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "PO Dash 2.0 — Midnight Network Operations",
  description:
    "Network health, validator attestation, report generation, diagnostics, and runbooks for Midnight Network operations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${outfit.variable} ${dmMono.variable} h-full antialiased`}
    >
      <head>
        {/* Apply persisted theme before first paint to avoid a flash */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-mn-bg text-mn-text">
        <ThemeProvider>
          <TelemetryProvider>
            <NotifyProvider>
              <TourProvider>
                <SiteNav />
                <main className="flex-1">{children}</main>
                <TourOverlay />
              </TourProvider>
            </NotifyProvider>
          </TelemetryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
