import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Chakra_Petch } from "next/font/google";
import SiteNav from "@/components/layout/SiteNav";
import MaintainerBanner from "@/components/layout/MaintainerBanner";
import TourOverlay from "@/components/tour/TourOverlay";
import { TelemetryProvider } from "@/providers/TelemetryProvider";
import { NotifyProvider } from "@/providers/NotifyProvider";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/providers/ThemeProvider";
import { TourProvider } from "@/providers/TourProvider";
import "./globals.css";

// Inter (prose) + JetBrains Mono (labels, data, UI), with Chakra Petch as the
// Nighthawk display face — squarish stencil-tech for headings and brand chrome.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const chakraPetch = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Nighthawk — Midnight Network Observability",
  description:
    "Network health, validator attestation, report generation, diagnostics, and runbooks for the core Midnight blockchain network",
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
      className={`${inter.variable} ${jetbrainsMono.variable} ${chakraPetch.variable} h-full antialiased`}
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
                <MaintainerBanner />
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
