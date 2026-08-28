import type { Metadata } from "next";
import { languageAlternates, isLocale, localizedPath, openGraphLocales } from "@/i18n/config";
import { copy } from "@/i18n/copy";
import { isPublicIndexingEnabled, siteName, socialImage } from "@/lib/site";

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "si" }, { locale: "ta" }];
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const text = copy[locale];
  const title = `${siteName} | ${text.hero}`;
  const index = isPublicIndexingEnabled();
  return {
    title,
    description: text.intro,
    robots: { index, follow: index },
    alternates: { canonical: localizedPath(locale), languages: languageAlternates() },
    openGraph: { type: "website", locale: openGraphLocales[locale], alternateLocale: Object.values(openGraphLocales).filter((item) => item !== openGraphLocales[locale]), siteName, title, description: text.intro, url: localizedPath(locale), images: [socialImage] },
  };
}

export default function LocaleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
