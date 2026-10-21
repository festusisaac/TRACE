import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";

import { DeskNav } from "@/components/desk-nav";
import { GlobalSearch } from "@/components/global-search";
import { LiveBook } from "@/components/live-book";
import { PitchSimulator } from "@/components/pitch-simulator";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "TRACE · Incident Triage & Resolution",
  description: "Triage and Root-cause Analysis of Customer Engagements",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}>
      <body>
        <div className="desk">
          <header className="topbar">
            <Link className="brand" href="/" style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <img
                src="/logo.png"
                alt="TRACE Logo"
                width={55}
                height={44}
                style={{ height: 44, width: "auto", objectFit: "contain", flexShrink: 0 }}
              />
              <strong>TRACE</strong>
              <span className="brand-rule" aria-hidden="true" />
              <span className="brand-copy">
                <span>Triage and Root-cause Analysis</span>
                <span>of Customer Engagements</span>
              </span>
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <GlobalSearch />
              <p className="environment">
                <span>Operations desk / demonstration</span>
                <span>Demo snapshot · 21 Oct 2026</span>
              </p>
            </div>
          </header>
          <div className="workspace">
            <Suspense fallback={<nav className="menubar" aria-hidden="true" />}>
              <DeskNav />
              <LiveBook />
            </Suspense>
            <div className="workspace-main">
              <div className="main">{children}</div>
              <footer className="desk-foot">
                <div className="status-key">
                  <p>
                    <span className="pill systemic">
                      <span className="dot" aria-hidden="true" />
                      Systemic
                    </span>
                    Same problem, many customers; well above normal. Answer together.
                  </p>
                  <p>
                    <span className="pill emerging">
                      <span className="dot" aria-hidden="true" />
                      Emerging
                    </span>
                    More than usual, not yet a network alarm. Watch and investigate.
                  </p>
                  <p>
                    <span className="pill isolated">
                      <span className="dot" aria-hidden="true" />
                      Isolated
                    </span>
                    One customer. Handle alone, outside the wider incident response.
                  </p>
                </div>
                <div className="legal">
                  <span>Synthetic demonstration data · No core-banking connection</span>
                  <span>Zenith Bank Zecathon 6.0 · AI-Powered Transaction Investigation and Resolution · 20–22 Oct 2026</span>
                </div>
              </footer>
            </div>
          </div>
        </div>
        <PitchSimulator />
      </body>
    </html>
  );
}
