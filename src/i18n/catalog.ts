import { getCalculators } from "@/domain/calculators/registry";
import type { CalculatorField, CalculatorMetadata } from "@/domain/calculators/types";
import type { Locale } from "@/i18n/config";
import { localizeResultText } from "@/i18n/result-copy";

type CalculatorText = Pick<CalculatorMetadata, "name" | "shortName" | "summary">;

const calculatorText: Record<Exclude<Locale, "en">, Record<string, CalculatorText>> = {
  si: {
    age: { name: "වයස ගණකය", shortName: "වයස", summary: "දින දෙකක් අතර සම්පූර්ණ අවුරුදු සහ ගත වූ දින සොයන්න." },
    percentage: { name: "ප්‍රතිශත ගණකය", shortName: "ප්‍රතිශතය", summary: "සැඟවුණු වට කිරීම් නොමැතිව ඕනෑම අගයක ප්‍රතිශතයක් ගණනය කරන්න." },
    "compound-interest": { name: "සංයුක්ත පොලී ගණකය", shortName: "සංයුක්ත පොලිය", summary: "ස්ථාවර අනුපාතයක් සහ සංයෝජන වාර ගණනක් අනුව මූලධනයේ අනාගත අගය ගණනය කරන්න." },
    area: { name: "වර්ගඵල ගණකය", shortName: "වර්ගඵලය", summary: "සෘජුකෝණාස්‍ර, ත්‍රිකෝණ හෝ වෘත්තයක වර්ගඵලය එක් ඒකකයකින් ගණනය කරන්න." },
    "tile-quantity": { name: "ටයිල් ප්‍රමාණ ගණකය", shortName: "ටයිල් ප්‍රමාණය", summary: "සන්ධි සහ අපතේ යාම ඇතුළුව බිමකට හෝ බිත්තියකට අවශ්‍ය ටයිල් ගණන ඇස්තමේන්තු කරන්න." },
    paint: { name: "තීන්ත ප්‍රමාණ ගණකය", shortName: "තීන්ත", summary: "වර්ගඵලය, ආලේපන වාර, ආවරණය සහ අපතේ යාම අනුව තීන්ත ලීටර් ගණන ඇස්තමේන්තු කරන්න." },
    concrete: { name: "කොන්ක්‍රීට් ප්‍රමාණ ගණකය", shortName: "කොන්ක්‍රීට්", summary: "අපතේ යාම ඇතුළුව පුවරුවකට හෝ අත්තිවාරමකට අවශ්‍ය කොන්ක්‍රීට් ඝන මීටර් ඇස්තමේන්තු කරන්න." },
    "brick-block": { name: "ගඩොල් සහ බ්ලොක් ප්‍රමාණ ගණකය", shortName: "ගඩොල් සහ බ්ලොක්", summary: "විවර, සන්ධි සහ අපතේ යාම ඇතුළුව තනි ස්තර බිත්තියකට අවශ්‍ය ගඩොල් ගණන ඇස්තමේන්තු කරන්න." },
    steel: { name: "වානේ ප්‍රමාණ ගණකය", shortName: "වානේ", summary: "කම්බි විෂ්කම්භය, දිග සහ ගණන අනුව TMT කම්බි බර ඇස්තමේන්තු කරන්න." },
    "roof-material": { name: "වහල ද්‍රව්‍ය ප්‍රමාණ ගණකය", shortName: "වහල ද්‍රව්‍ය", summary: "සෘජුකෝණාස්‍ර ගොඩනැගිල්ලක බෑවුම් වහලයට අවශ්‍ය උළු හෝ ලෝහ තහඩු ඇස්තමේන්තු කරන්න." },
    "loan-emi": { name: "ණය EMI ගණකය", shortName: "ණය EMI", summary: "ස්ථාවර මාසික වාරිකය සහ මුළු පොලිය ඇස්තමේන්තු කරන්න." },
    "loan-affordability": { name: "ණය දැරිය හැකි ප්‍රමාණ ගණකය", shortName: "ණය හැකියාව", summary: "මාසික ආදායම, ණය සහ වියදම් අනුව ඔබට ලබාගත හැකි ණය මුදල ඇස්තමේන්තු කරන්න." },
    "fuel-consumption": { name: "ඉන්ධන පරිභෝජන ගණකය", shortName: "ඉන්ධන පරිභෝජනය", summary: "ගමන් දුර සහ භාවිත කළ ඉන්ධන පොදු කාර්යක්ෂමතා මිනුම් දෙකට පරිවර්තනය කරන්න." },
  },
  ta: {
    age: { name: "வயது கணிப்பான்", shortName: "வயது", summary: "இரண்டு தேதிகளுக்கிடையிலான நிறைவடைந்த ஆண்டுகளையும் கடந்த நாட்களையும் கணக்கிடுங்கள்." },
    percentage: { name: "சதவீத கணிப்பான்", shortName: "சதவீதம்", summary: "மறைமுக முழுமையாக்கம் இல்லாமல் எந்த மதிப்பின் சதவீதத்தையும் கணக்கிடுங்கள்." },
    "compound-interest": { name: "கூட்டு வட்டி கணிப்பான்", shortName: "கூட்டு வட்டி", summary: "நிலையான வட்டி வீதம் மற்றும் கூட்டல் இடைவெளியைப் பயன்படுத்தி முதலின் எதிர்கால மதிப்பைக் கணக்கிடுங்கள்." },
    area: { name: "பரப்பளவு கணிப்பான்", shortName: "பரப்பளவு", summary: "செவ்வகம், முக்கோணம் அல்லது வட்டத்தின் பரப்பளவை ஒரே அலகில் கணக்கிடுங்கள்." },
    "tile-quantity": { name: "ஓடு அளவு கணிப்பான்", shortName: "ஓடு அளவு", summary: "இணைப்புகள் மற்றும் கழிவுடன் தரை அல்லது சுவருக்குத் தேவையான ஓடுகளைக் கணக்கிடுங்கள்." },
    paint: { name: "வண்ணப்பூச்சு அளவு கணிப்பான்", shortName: "வண்ணப்பூச்சு", summary: "பரப்பளவு, பூச்சு அடுக்குகள், மூடுதிறன் மற்றும் கழிவின் அடிப்படையில் தேவையான லீற்றர்களைக் கணக்கிடுங்கள்." },
    concrete: { name: "கொங்கிறீற்று அளவு கணிப்பான்", shortName: "கொங்கிறீற்று", summary: "கழிவுடன் தளம் அல்லது அத்திவாரத்திற்குத் தேவையான கன மீற்றர்களைக் கணக்கிடுங்கள்." },
    "brick-block": { name: "செங்கல் மற்றும் கட்டி அளவு கணிப்பான்", shortName: "செங்கல் மற்றும் கட்டி", summary: "திறப்புகள், இணைப்புகள் மற்றும் கழிவுடன் ஒற்றை அடுக்குச் சுவருக்குத் தேவையான செங்கற்களைக் கணக்கிடுங்கள்." },
    steel: { name: "உருக்கு அளவு கணிப்பான்", shortName: "உருக்கு", summary: "கம்பியின் விட்டம், நீளம் மற்றும் எண்ணிக்கையிலிருந்து TMT கம்பிகளின் எடையைக் கணக்கிடுங்கள்." },
    "roof-material": { name: "கூரைப் பொருள் அளவு கணிப்பான்", shortName: "கூரைப் பொருள்", summary: "செவ்வகக் கட்டடத்தின் சாய்வுக் கூரைக்குத் தேவையான ஓடுகள் அல்லது உலோகத் தகடுகளைக் கணக்கிடுங்கள்." },
    "loan-emi": { name: "கடன் EMI கணிப்பான்", shortName: "கடன் EMI", summary: "நிலையான மாதத் தவணையையும் மொத்த வட்டியையும் கணக்கிடுங்கள்." },
    "loan-affordability": { name: "கடன் பெறுமதி கணிப்பான்", shortName: "கடன் பெறுமதி", summary: "மாத வருமானம், கடன்கள் மற்றும் செலவுகளிலிருந்து நீங்கள் பெறக்கூடிய கடன் தொகையைக் கணக்கிடுங்கள்." },
    "fuel-consumption": { name: "எரிபொருள் நுகர்வு கணிப்பான்", shortName: "எரிபொருள் நுகர்வு", summary: "பயணத் தூரத்தையும் பயன்படுத்திய எரிபொருளையும் இரு பொதுவான திறன் அளவுகளாக மாற்றுங்கள்." },
  },
};

const categories: Record<Locale, Record<string, string>> = {
  en: { Everyday: "Everyday", Money: "Money", Build: "Build", Travel: "Travel" },
  si: { Everyday: "එදිනෙදා", Money: "මුදල්", Build: "ඉදිකිරීම්", Travel: "ගමන්" },
  ta: { Everyday: "அன்றாடம்", Money: "பணம்", Build: "கட்டுமானம்", Travel: "பயணம்" },
};

const terms: Record<Exclude<Locale, "en">, Record<string, string>> = {
  si: {
    "Date of birth": "උපන් දිනය", "Calculate age on": "වයස ගණනය කරන දිනය", Percentage: "ප්‍රතිශතය", Value: "අගය", "Starting principal": "ආරම්භක මූලධනය", "Nominal annual interest rate": "නාමික වාර්ෂික පොලී අනුපාතය", Duration: "කාලසීමාව", Compounding: "පොලී සංයෝජනය", Annually: "වාර්ෂිකව", Quarterly: "කාර්තුමය", Monthly: "මාසිකව", Daily: "දිනපතා", Shape: "හැඩය", Rectangle: "සෘජුකෝණාස්‍රය", Triangle: "ත්‍රිකෝණය", Circle: "වෘත්තය", "Dimension unit": "මාන ඒකකය", Metres: "මීටර්", Centimetres: "සෙන්ටිමීටර්", Feet: "අඩි", Length: "දිග", Width: "පළල", Base: "පාදය", Height: "උස", Radius: "අරය", "Room length": "කාමරයේ දිග", "Room width": "කාමරයේ පළල", "Tile length": "ටයිලයේ දිග", "Tile width": "ටයිලයේ පළල", "Joint width": "සන්ධියේ පළල", Wastage: "අපතේ යාම", "Surface area": "මතුපිට වර්ගඵලය", "Area unit": "වර්ගඵල ඒකකය", "Square metres": "වර්ග මීටර්", "Square feet": "වර්ග අඩි", Coats: "ආලේපන වාර", Coverage: "ආවරණය", Depth: "ගැඹුර", "Depth or thickness": "ගැඹුර හෝ ඝනකම", "Wall length": "බිත්තියේ දිග", "Wall height": "බිත්තියේ උස", "Openings (doors, windows)": "විවර (දොරවල්, ජනෙල්)", "Brick length": "ගඩොලේ දිග", "Brick height": "ගඩොලේ උස", "Mortar joint": "බදාම සන්ධිය", "Bar diameter": "කම්බි විෂ්කම්භය", "Bar length": "කම්බි දිග", "Number of bars": "කම්බි ගණන", "Building length": "ගොඩනැගිල්ලේ දිග", "Building width": "ගොඩනැගිල්ලේ පළල", "Roof slope": "වහලේ බෑවුම", Material: "ද්‍රව්‍යය", "Clay tiles": "මැටි උළු", "Concrete tiles": "කොන්ක්‍රීට් උළු", "Corrugated metal sheets": "රැලි ලෝහ තහඩු", "Coverage per unit": "ඒකකයක ආවරණය", "Loan amount": "ණය මුදල", "Loan term": "ණය කාලය", "Monthly take-home income": "මාසික අතට ලැබෙන ආදායම", "Monthly living expenses": "මාසික ජීවන වියදම්", "Existing monthly debt payments": "දැනට ඇති මාසික ණය ගෙවීම්", "Debt-to-income cap": "ආදායමට සාපේක්ෂ ණය සීමාව", "Desired loan term": "අපේක්ෂිත ණය කාලය", "Expected nominal annual rate": "අපේක්ෂිත නාමික වාර්ෂික අනුපාතය", "Interest-rate stress premium": "පොලී අනුපාත ආතති අතිරේකය", "Distance travelled": "ගමන් කළ දුර", "Distance unit": "දුර ඒකකය", Kilometres: "කිලෝමීටර්", Miles: "සැතපුම්", "Fuel used": "භාවිත කළ ඉන්ධන", "Fuel unit": "ඉන්ධන ඒකකය", Litres: "ලීටර්", "US gallons": "US ගැලුම්", "Imperial gallons": "ඉම්පීරියල් ගැලුම්",
  },
  ta: {
    "Date of birth": "பிறந்த தேதி", "Calculate age on": "வயது கணக்கிடும் தேதி", Percentage: "சதவீதம்", Value: "மதிப்பு", "Starting principal": "ஆரம்ப முதல்", "Nominal annual interest rate": "பெயரளவு ஆண்டு வட்டி வீதம்", Duration: "காலம்", Compounding: "வட்டி கூட்டல்", Annually: "ஆண்டுதோறும்", Quarterly: "காலாண்டு", Monthly: "மாதந்தோறும்", Daily: "தினமும்", Shape: "வடிவம்", Rectangle: "செவ்வகம்", Triangle: "முக்கோணம்", Circle: "வட்டம்", "Dimension unit": "அளவு அலகு", Metres: "மீற்றர்", Centimetres: "சென்ரிமீற்றர்", Feet: "அடி", Length: "நீளம்", Width: "அகலம்", Base: "அடித்தளம்", Height: "உயரம்", Radius: "ஆரம்", "Room length": "அறையின் நீளம்", "Room width": "அறையின் அகலம்", "Tile length": "ஓட்டின் நீளம்", "Tile width": "ஓட்டின் அகலம்", "Joint width": "இணைப்பின் அகலம்", Wastage: "கழிவு", "Surface area": "மேற்பரப்பு", "Area unit": "பரப்பளவு அலகு", "Square metres": "சதுர மீற்றர்", "Square feet": "சதுர அடி", Coats: "பூச்சு அடுக்குகள்", Coverage: "மூடுதிறன்", "Depth or thickness": "ஆழம் அல்லது தடிமன்", "Wall length": "சுவரின் நீளம்", "Wall height": "சுவரின் உயரம்", "Openings (doors, windows)": "திறப்புகள் (கதவுகள், யன்னல்கள்)", "Brick length": "செங்கலின் நீளம்", "Brick height": "செங்கலின் உயரம்", "Mortar joint": "சாந்து இணைப்பு", "Bar diameter": "கம்பி விட்டம்", "Bar length": "கம்பி நீளம்", "Number of bars": "கம்பிகளின் எண்ணிக்கை", "Building length": "கட்டடத்தின் நீளம்", "Building width": "கட்டடத்தின் அகலம்", "Roof slope": "கூரைச் சாய்வு", Material: "பொருள்", "Clay tiles": "களிமண் ஓடுகள்", "Concrete tiles": "கொங்கிறீற்று ஓடுகள்", "Corrugated metal sheets": "நெளிந்த உலோகத் தகடுகள்", "Coverage per unit": "ஓர் அலகின் மூடுபரப்பு", "Loan amount": "கடன் தொகை", "Loan term": "கடன் காலம்", "Monthly take-home income": "மாத நிகர வருமானம்", "Monthly living expenses": "மாத வாழ்க்கைச் செலவுகள்", "Existing monthly debt payments": "தற்போதைய மாதக் கடன் கொடுப்பனவுகள்", "Debt-to-income cap": "வருமானத்திற்கான கடன் வரம்பு", "Desired loan term": "விரும்பிய கடன் காலம்", "Expected nominal annual rate": "எதிர்பார்க்கும் பெயரளவு ஆண்டு வீதம்", "Interest-rate stress premium": "வட்டி வீத அழுத்த மேலதிகம்", "Distance travelled": "பயணித்த தூரம்", "Distance unit": "தூர அலகு", Kilometres: "கிலோமீற்றர்", Miles: "மைல்கள்", "Fuel used": "பயன்படுத்திய எரிபொருள்", "Fuel unit": "எரிபொருள் அலகு", Litres: "லீற்றர்", "US gallons": "US கலன்கள்", "Imperial gallons": "இம்பீரியல் கலன்கள்",
  },
};

export type LocalizedCalculator = CalculatorMetadata & { execution: "browser" };

const localizedSuffixes: Record<Exclude<Locale, "en">, Record<string, string>> = {
  si: { months: "මාස", years: "අවුරුදු", bars: "කම්බි", tiles: "ටයිල්", litres: "ලීටර්", sheets: "තහඩු", bricks: "ගඩොල්", units: "ඒකක" },
  ta: { months: "மாதங்கள்", years: "ஆண்டுகள்", bars: "கம்பிகள்", tiles: "ஓடுகள்", litres: "லீற்றர்", sheets: "தகடுகள்", bricks: "செங்கற்கள்", units: "அலகுகள்" },
};

function translate(locale: Locale, value: string): string {
  return locale === "en" ? value : terms[locale][value] ?? value;
}

function localizeField(locale: Locale, field: CalculatorField): CalculatorField {
  return {
    ...field,
    label: translate(locale, field.label),
    description: field.description ? translate(locale, field.description) : undefined,
    suffix: locale === "en" || !field.suffix ? field.suffix : localizedSuffixes[locale][field.suffix] ?? field.suffix,
    options: field.options?.map((option) => ({ ...option, label: translate(locale, option.label) })),
  };
}

export function getLaunchCalculators(locale: Locale): LocalizedCalculator[] {
  return getCalculators().filter((calculator) => calculator.execution === "browser").map((calculator) => ({
    key: calculator.key,
    name: calculator.name,
    shortName: calculator.shortName,
    summary: calculator.summary,
    classification: calculator.classification,
    version: calculator.version,
    accent: calculator.accent,
    ...(locale === "en" ? {} : calculatorText[locale][calculator.key]),
    category: categories[locale][calculator.category] ?? calculator.category,
    fields: calculator.fields.map((field) => localizeField(locale, field)),
    execution: "browser",
  }));
}

export function getLaunchCalculator(locale: Locale, key: string): LocalizedCalculator | undefined {
  return getLaunchCalculators(locale).find((calculator) => calculator.key === key);
}

export type LocalizedCategory = { name: string; canonicalName: string; slug: string; calculators: LocalizedCalculator[] };

export function getLaunchCategories(locale: Locale): LocalizedCategory[] {
  const grouped = new Map<string, LocalizedCategory>();
  for (const calculator of getLaunchCalculators(locale)) {
    const canonical = getCalculators().find((item) => item.key === calculator.key)!.category;
    const slug = canonical.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const category = grouped.get(slug) ?? { name: calculator.category, canonicalName: canonical, slug, calculators: [] };
    category.calculators.push(calculator);
    grouped.set(slug, category);
  }
  return [...grouped.values()];
}

export function getLaunchCategory(locale: Locale, slug: string) {
  return getLaunchCategories(locale).find((category) => category.slug === slug);
}

export function translateResultText(locale: Locale, text: string): string {
  return localizeResultText(locale, text);
}
