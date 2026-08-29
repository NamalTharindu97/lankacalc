import { ArrowRight, ChevronDown, Eye, FileText, HelpCircle, Shield } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StructuredData } from "@/components/structured-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLaunchCalculators, getLaunchCategories } from "@/i18n/catalog";
import { copy } from "@/i18n/copy";
import { isLocale, localizedPath } from "@/i18n/config";
import { getHomeSchemas } from "@/lib/public-schemas";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const text = copy[locale];
  const calculators = getLaunchCalculators(locale);
  const categories = getLaunchCategories(locale);
  const principles = locale === "si"
    ? [[Eye, "ආදාන පෙනේ", "භාවිත කළ අගයන් සහ ඒකක ප්‍රතිඵලයේ පෙන්වයි."], [FileText, "ගණනය පැහැදිලියි", "අතරමැදි අගයන් මුළු අගය සෑදුණු ආකාරය පෙන්වයි."], [HelpCircle, "උපකල්පන සඳහන් වේ", "ගාස්තු සහ බැහැර කිරීම් සඟවා නොතබයි."], [Shield, "පෞද්ගලිකව ක්‍රියා කරයි", "මෙම ගණක ඔබේ බ්‍රවුසරයේ ක්‍රියා කරයි."]]
    : locale === "ta"
      ? [[Eye, "உள்ளீடுகள் தெரியும்", "பயன்படுத்திய மதிப்புகளும் அலகுகளும் முடிவில் காட்டப்படும்."], [FileText, "கணக்கீடு விளக்கப்படும்", "இடைப்பட்ட மதிப்புகள் மொத்தம் உருவான விதத்தைக் காட்டும்."], [HelpCircle, "கருதுகோள்கள் குறிப்பிடப்படும்", "கட்டணங்களும் விலக்குகளும் மறைக்கப்படாது."], [Shield, "தனிப்பட்ட முறையில் இயங்கும்", "இந்தக் கணிப்பான்கள் உங்கள் உலாவியில் இயங்குகின்றன."]]
      : [[Eye, "Inputs stay visible", "Results repeat the values and units used."], [FileText, "Workings are explained", "Intermediate values reveal how the total was formed."], [HelpCircle, "Assumptions are named", "Fees and exclusions are never silently implied."], [Shield, "Runs privately", "These calculators execute in your browser."]];

  return <>
    <StructuredData data={getHomeSchemas(locale, text.intro)} />
    <section className="border-b"><div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8"><Badge className="mb-6" variant="secondary">{text.badge}</Badge><h1 className="max-w-3xl text-pretty text-4xl font-bold tracking-tight sm:text-6xl">{text.hero}</h1><p className="mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">{text.intro}</p><Button asChild className="mt-8"><a href="#calculators">{text.choose}<ChevronDown aria-hidden="true" className="h-4 w-4" /></a></Button></div></section>
    <section className="border-b bg-muted/30" id="calculators"><div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8"><div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><Badge className="mb-4" variant="secondary">{text.available}</Badge><h2 className="text-3xl font-bold">{text.choose}</h2></div><p className="text-sm text-muted-foreground">{calculators.length} {text.releaseCount}</p></div><nav aria-label={text.calculators} className="mb-8 flex flex-wrap gap-2">{categories.map(category => <Button asChild key={category.slug} size="sm" variant="outline"><Link href={localizedPath(locale, `/categories/${category.slug}`)}>{category.name} ({category.calculators.length})</Link></Button>)}</nav><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{calculators.map(calculator => <Link className="group flex flex-col rounded-xl border bg-card p-6 hover:shadow-md" href={localizedPath(locale, `/calculators/${calculator.key}`)} key={calculator.key}><div className="mb-4 flex justify-between"><Badge variant="outline">{calculator.category}</Badge><ArrowRight className="h-4 w-4" /></div><h3 className="text-lg font-semibold">{calculator.shortName}</h3><p className="mt-2 text-sm text-muted-foreground">{calculator.summary}</p></Link>)}</div></div></section>
    <section id="principles"><div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8"><Badge className="mb-4" variant="secondary">{text.standard}</Badge><h2 className="mb-10 text-3xl font-bold">{text.trust}</h2><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{principles.map(([Icon, title, description]) => <Card className="p-6" key={String(title)}><Icon className="mb-4 h-5 w-5" /><h3 className="font-semibold">{String(title)}</h3><p className="mt-2 text-sm text-muted-foreground">{String(description)}</p></Card>)}</div></div></section>
  </>;
}
