import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Instrument_Serif } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono" });
const display = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-display" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: "Longview Research — Understand what a stock price assumes",
  description: "Explore global equities through explainable valuation models, uncertainty ranges, factor lenses and source-linked learning. Educational only; not financial advice.",
  openGraph: {
    title: "Longview Research",
    description: "Understand what a stock price assumes.",
    type: "website",
    images: [{ url: "/og.png", width: 1680, height: 945, alt: "Longview Research valuation distribution and model ranges" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Longview Research",
    description: "Understand what a stock price assumes.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable} ${display.variable}`}>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="Longview Research home">
            <span className="brand-mark">L·R</span>
            <span>LONGVIEW <i>RESEARCH</i></span>
          </Link>
          <nav>
            <Link href="/#methodology">Methodology</Link>
            <Link href="/#samples">Sample cases</Link>
            <Link className="header-action" href="/research/NVDA">Open sample desk</Link>
          </nav>
        </header>
        <div className="education-strip">
          <strong>EDUCATIONAL ANALYSIS</strong>
          <span>General circulation · Assumption-driven models · No buy, sell or hold recommendations</span>
        </div>
        {children}
        <footer className="site-footer">
          <div className="brand"><span className="brand-mark">L·R</span><span>LONGVIEW RESEARCH</span></div>
          <p>Understand the assumptions. Inspect the math. Decide what to learn next.</p>
          <small>Educational information only. Not financial advice or a suitability assessment. © 2026</small>
        </footer>
      </body>
    </html>
  );
}
