export const locales = ["en", "si", "ta"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const languageTags: Record<Locale, string> = {
  en: "en-LK",
  si: "si-LK",
  ta: "ta-LK",
};

export const openGraphLocales: Record<Locale, string> = {
  en: "en_LK",
  si: "si_LK",
  ta: "ta_LK",
};

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function localizedPath(locale: Locale, pathname = ""): string {
  return `/${locale}${pathname === "/" ? "" : pathname}`;
}

export function languageAlternates(pathname = "") {
  return {
    "en-LK": localizedPath("en", pathname),
    "si-LK": localizedPath("si", pathname),
    "ta-LK": localizedPath("ta", pathname),
    "x-default": localizedPath("en", pathname),
  };
}
