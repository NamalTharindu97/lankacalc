import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "LankaCalc | Clear calculations for Sri Lanka",
    template: "%s | LankaCalc",
  },
  description:
    "Straightforward calculators with visible assumptions, calculation breakdowns, and source-aware results.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="LankaCalc home">
            <span className="brand-mark" aria-hidden="true">
              LC
            </span>
            <span>LankaCalc</span>
          </Link>
          <nav aria-label="Primary navigation">
            <Link href="/#calculators">Calculators</Link>
            <Link href="/#principles">How results work</Link>
            <Link href="/api/v1/calculators">API</Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <p>Built for clear decisions, not mysterious totals.</p>
          <p>Static calculators are estimates. Regulated Sri Lankan rules will include official sources.</p>
        </footer>
      </body>
    </html>
  );
}
