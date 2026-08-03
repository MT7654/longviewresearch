import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Instrument_Serif } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono" });
const display = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-display" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: "Longview Research — Learn how a stock opinion is built",
  description: "An independent quant-literacy publication that turns curiosity about a security into a transparent educational opinion.",
  openGraph: {
    title: "Longview Research",
    description: "From a starting hypothesis to an inspectable educational opinion.",
    type: "website",
    images: [{ url: "/og.png", width: 1680, height: 945, alt: "Longview Research educational opinion desk" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Longview Research",
    description: "From a starting hypothesis to an inspectable educational opinion.",
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
            <Link href="/methodology">Methodology</Link>
            <Link href="/editorial-policy">Editorial policy</Link>
            <Link href="/#sample-cases">Sample cases</Link>
            <Link className="header-action" href="/research/NVDA">Open guided sample</Link>
          </nav>
        </header>
        <div className="education-strip">
          <strong>INDEPENDENT QUANT-LITERACY PUBLICATION</strong>
          <span>Generic education · Standardised models · No suitability or transaction recommendations</span>
        </div>
        {children}
        <footer className="site-footer">
          <div className="brand"><span className="brand-mark">L·R</span><span>LONGVIEW RESEARCH</span></div>
          <p>Follow the evidence. Inspect the math. Learn how opinions are formed.</p>
          <div className="footer-links">
            <Link href="/methodology">Methodology</Link>
            <Link href="/editorial-policy">Editorial policy</Link>
          </div>
          <small>Generic educational information only. Not a recommendation or suitability assessment. © 2026</small>
        </footer>
      </body>
    </html>
  );
}
