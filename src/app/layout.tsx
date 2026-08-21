import type { Metadata } from "next";
import Link from "next/link";

import { AccountBar } from "@/components/account-bar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSiteUrl, siteDescription, siteName } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: "LankaCalc | Clear calculations for Sri Lanka",
    template: "%s | LankaCalc",
  },
  description: siteDescription,
  applicationName: siteName,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_LK",
    siteName,
    title: "LankaCalc | Clear calculations for Sri Lanka",
    description: siteDescription,
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "LankaCalc | Clear calculations for Sri Lanka",
    description: siteDescription,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
              <Link className="flex items-center gap-2 font-semibold" href="/" aria-label="LankaCalc home">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                  LC
                </span>
                <span className="text-sm">LankaCalc</span>
              </Link>
              <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground sm:flex" aria-label="Primary navigation">
                <Link className="transition-colors hover:text-foreground" href="/#calculators">Calculators</Link>
                <Link className="transition-colors hover:text-foreground" href="/#principles">How results work</Link>
                <Link className="transition-colors hover:text-foreground" href="/api/v1/calculators">API</Link>
              </nav>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <AccountBar />
              </div>
            </div>
          </header>
          <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
          <footer className="border-t bg-muted/50">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-xs text-muted-foreground sm:px-6 lg:px-8">
              <p>Built for clear decisions, not mysterious totals.</p>
              <p className="text-right">Estimates show their assumptions; regulated results cite published rules and sources.</p>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
