import Link from "next/link";

import { locales, localizedPath, type Locale } from "@/i18n/config";

const names: Record<Locale, string> = { en: "English", si: "සිංහල", ta: "தமிழ்" };

export function LanguageSwitcher({ locale, pathname, label }: { locale: Locale; pathname: string; label: string }) {
  return (
    <nav aria-label={label} className="flex items-center rounded-lg border p-0.5 text-xs">
      {locales.map((item) => (
        <Link
          aria-current={item === locale ? "page" : undefined}
          className={`rounded-md px-2 py-1.5 ${item === locale ? "bg-muted font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          href={localizedPath(item, pathname)}
          key={item}
          hrefLang={`${item}-LK`}
        >
          {names[item]}
        </Link>
      ))}
    </nav>
  );
}
