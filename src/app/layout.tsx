import type { Metadata } from "next";
import Link from "next/link";

import { AccountBar } from "@/components/account-bar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
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
              <p className="text-right">Static calculators are estimates. Regulated rules will include official sources.</p>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
