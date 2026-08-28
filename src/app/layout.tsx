import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";

import { AccountBar } from "@/components/account-bar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSiteUrl, siteDescription, siteName, socialImage } from "@/lib/site";
import { copy } from "@/i18n/copy";
import { defaultLocale, isLocale, localizedPath } from "@/i18n/config";
import { listTrustPages } from "@/i18n/trust-content";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: "LankaCalc | Clear calculations for Sri Lanka",
    template: "%s | LankaCalc",
  },
  description: siteDescription,
  applicationName: siteName,
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName,
    title: "LankaCalc | Clear calculations for Sri Lanka",
    description: siteDescription,
    images: [socialImage],
  },
  twitter: {
    card: "summary",
    title: "LankaCalc | Clear calculations for Sri Lanka",
    description: siteDescription,
    images: [socialImage],
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const headerLocale = requestHeaders.get("x-lankacalc-locale") ?? "";
  const locale = isLocale(headerLocale) ? headerLocale : defaultLocale;
  const pathname = requestHeaders.get("x-lankacalc-pathname") ?? "/";
  const localizedLaunch = requestHeaders.has("x-lankacalc-locale");
  const text = copy[locale];
  const trustPages = listTrustPages(locale);
  const skipLabel = locale === "si" ? "ප්‍රධාන අන්තර්ගතයට යන්න" : locale === "ta" ? "முதன்மை உள்ளடக்கத்திற்குச் செல்" : "Skip to content";
  const mobileNavigationLabel = locale === "si" ? "ජංගම සංචාලනය" : locale === "ta" ? "கைபேசி வழிசெலுத்தல்" : "Mobile navigation";

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <a className="fixed left-4 top-4 z-[100] -translate-y-20 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform focus:translate-y-0" href="#main-content">
          {skipLabel}
        </a>
        <ThemeProvider>
          <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
              <Link className="flex items-center gap-2 font-semibold" href={localizedPath(locale)}>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                  LC
                </span>
                <span className="text-sm">LankaCalc</span>
              </Link>
              <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground sm:flex" aria-label="Primary navigation">
                 <Link className="transition-colors hover:text-foreground" href={`${localizedPath(locale)}#calculators`}>{text.calculators}</Link>
                 <Link className="transition-colors hover:text-foreground" href={`${localizedPath(locale)}#principles`}>{text.principles}</Link>
              </nav>
              <div className="flex items-center gap-2">
                 {localizedLaunch ? <LanguageSwitcher label={text.language} locale={locale} pathname={pathname} /> : null}
                 <ThemeToggle label={text.theme} />
                 {localizedLaunch ? null : <AccountBar />}
              </div>
            </div>
            {localizedLaunch ? (
              <nav aria-label={mobileNavigationLabel} className="mx-auto flex max-w-6xl items-center gap-4 border-t px-4 py-2 text-sm font-medium text-muted-foreground sm:hidden">
                <Link className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={`${localizedPath(locale)}#calculators`}>{text.calculators}</Link>
                <Link className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={`${localizedPath(locale)}#principles`}>{text.principles}</Link>
              </nav>
            ) : null}
          </header>
          <main className="min-h-[calc(100vh-3.5rem)]" id="main-content">{children}</main>
          <footer className="border-t bg-muted/50">
            <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-xs text-muted-foreground sm:px-6 md:grid-cols-[1fr_2fr] lg:px-8">
               <div><p>{text.footer}</p><p className="mt-2">{text.footerDetail}</p></div>
               <nav aria-label={locale === "si" ? "විශ්වාසය සහ ප්‍රතිපත්ති" : locale === "ta" ? "நம்பிக்கையும் கொள்கையும்" : "Trust and policies"} className="flex flex-wrap gap-x-5 gap-y-3 md:justify-end">
                 {trustPages.map(page => <Link className="underline-offset-4 hover:text-foreground hover:underline" href={localizedPath(locale, `/${page.slug}`)} key={page.slug}>{page.title}</Link>)}
               </nav>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
