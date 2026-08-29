import type { Locale } from "@/i18n/config";

export const categorySlugs = ["everyday", "money", "build", "travel"] as const;
export type CategorySlug = (typeof categorySlugs)[number];
export type CategoryCanonicalName = "Everyday" | "Money" | "Build" | "Travel";
export type CategoryCalculatorKey = "age" | "percentage" | "compound-interest" | "area" | "tile-quantity" | "paint" | "concrete" | "brick-block" | "steel" | "roof-material" | "loan-emi" | "loan-affordability" | "fuel-consumption";

export type LocalizedCategoryContent = {
  slug: CategorySlug;
  canonicalName: CategoryCanonicalName;
  description: string;
  useCases: [string, string, string];
  limitations: [string, string, string];
  selectionGuidance: string;
  referencedCalculatorKeys: readonly CategoryCalculatorKey[];
  reviewedAt: "2026-08-28";
  reviewOwner: string;
};

type CategoryCopy = Omit<LocalizedCategoryContent, "slug" | "canonicalName" | "reviewedAt" | "reviewOwner">;

const identities: Record<CategorySlug, CategoryCanonicalName> = {
  everyday: "Everyday",
  money: "Money",
  build: "Build",
  travel: "Travel",
};

const reviewOwners: Record<Locale, string> = {
  en: "LankaCalc repository maintainers",
  si: "LankaCalc කේත ගබඩාවේ නඩත්තුකරුවන්",
  ta: "LankaCalc நிரல் களஞ்சியப் பராமரிப்பாளர்கள்",
};

const content: Record<Locale, Record<CategorySlug, CategoryCopy>> = {
  en: {
    everyday: {
      description: "Quick calculations for common date and percentage questions.",
      useCases: ["Find completed years between two dates.", "Check the elapsed days alongside completed years.", "Calculate X% of Y."],
      limitations: ["The percentage calculator supports X% of Y only.", "Age results do not provide a legal interpretation of age.", "Date accuracy depends on entering the intended birth date and calculation date."],
      selectionGuidance: "Choose Age for completed years and elapsed days between dates, or Percentage for X% of Y.",
      referencedCalculatorKeys: ["age", "percentage"],
    },
    money: {
      description: "Transparent estimates for compound growth, loan repayments, and borrowing capacity.",
      useCases: ["Project compound growth from a fixed principal and rate.", "Estimate a fixed monthly loan installment and total interest.", "Explore borrowing capacity from income, expenses, debts, and assumptions."],
      limitations: ["Results are estimates, not financial advice or lender decisions.", "Actual rates, fees, taxes, insurance, and lender rules may change outcomes.", "Affordability depends on the accuracy and completeness of the entered household figures."],
      selectionGuidance: "Choose Compound Interest for future value, Loan EMI for repayments on a known loan, or Loan Affordability to explore a possible loan amount.",
      referencedCalculatorKeys: ["compound-interest", "loan-emi", "loan-affordability"],
    },
    build: {
      description: "Early quantity estimates for selected building surfaces, materials, and reinforcing bars.",
      useCases: ["Estimate tiles or paint for a measured surface.", "Estimate concrete, bricks, or blocks from simple dimensions.", "Estimate TMT bar weight or roof covering units."],
      limitations: ["Quantities are not design, procurement, or engineering advice.", "Area handles one supported shape; site conditions, detailing, product sizes, openings, cuts, laps, and waste can alter other requirements.", "Confirm dimensions, specifications, coverage, and order quantities with qualified professionals and suppliers."],
      selectionGuidance: "Choose Area for one rectangle, triangle, or circle; Tile Quantity or Paint for finishes; Concrete or Brick and Block for basic material volumes or counts; Steel for TMT bar weight; or Roof Material for roof covering units.",
      referencedCalculatorKeys: ["area", "tile-quantity", "paint", "concrete", "brick-block", "steel", "roof-material"],
    },
    travel: {
      description: "Convert distance travelled and fuel used into common fuel-consumption measures.",
      useCases: ["Calculate kilometres per litre for a completed journey.", "Calculate litres per 100 kilometres from the same journey data.", "Compare measured fuel efficiency across journeys."],
      limitations: ["The calculation excludes fuel price and trip cost.", "Use measured distance and actual fuel used; dashboard readings and fill levels can be imprecise.", "Traffic, load, terrain, weather, and driving style can change consumption."],
      selectionGuidance: "Choose Fuel Consumption when you know distance travelled and fuel used and need efficiency, not price or trip cost.",
      referencedCalculatorKeys: ["fuel-consumption"],
    },
  },
  si: {
    everyday: {
      description: "පොදු දින සහ ප්‍රතිශත ප්‍රශ්න සඳහා ඉක්මන් ගණනය කිරීම්.",
      useCases: ["දින දෙකක් අතර සම්පූර්ණ අවුරුදු සොයන්න.", "සම්පූර්ණ අවුරුදු සමඟ ගත වූ දින පරීක්ෂා කරන්න.", "Y හි X% ගණනය කරන්න."],
      limitations: ["ප්‍රතිශත ගණකය සහාය දක්වන්නේ Y හි X% සඳහා පමණි.", "වයස් ප්‍රතිඵල වයස පිළිබඳ නීතිමය අර්ථකථනයක් නොවේ.", "දින ප්‍රතිඵලයේ නිවැරදිභාවය අපේක්ෂිත උපන් දිනය සහ ගණනය කරන දිනය ඇතුළත් කිරීම මත රඳා පවතී."],
      selectionGuidance: "දින අතර සම්පූර්ණ අවුරුදු සහ ගත වූ දින සඳහා වයස, හෝ Y හි X% සඳහා ප්‍රතිශතය තෝරන්න.",
      referencedCalculatorKeys: ["age", "percentage"],
    },
    money: {
      description: "සංයුක්ත වර්ධනය, ණය වාරික සහ ණය ගැනීමේ හැකියාව සඳහා පැහැදිලි ඇස්තමේන්තු.",
      useCases: ["ස්ථාවර මූලධනයක් සහ අනුපාතයක් මත සංයුක්ත වර්ධනය පුරෝකථනය කරන්න.", "ස්ථාවර මාසික ණය වාරිකය සහ මුළු පොලිය ඇස්තමේන්තු කරන්න.", "ආදායම, වියදම්, ණය සහ උපකල්පන මත ණය ගැනීමේ හැකියාව සොයන්න."],
      limitations: ["ප්‍රතිඵල ඇස්තමේන්තු පමණක් වන අතර මූල්‍ය උපදෙස් හෝ ණය දෙන්නෙකුගේ තීරණ නොවේ.", "සැබෑ අනුපාත, ගාස්තු, බදු, රක්ෂණ සහ ණය දෙන්නාගේ නීති නිසා ප්‍රතිඵල වෙනස් විය හැක.", "දැරිය හැකි බව ඇතුළත් කළ ගෘහස්ථ අගයන්හි නිවැරදිභාවය සහ සම්පූර්ණභාවය මත රඳා පවතී."],
      selectionGuidance: "අනාගත අගය සඳහා සංයුක්ත පොලිය, දන්නා ණයක වාරික සඳහා ණය EMI, හෝ හැකි ණය මුදලක් සෙවීමට ණය හැකියාව තෝරන්න.",
      referencedCalculatorKeys: ["compound-interest", "loan-emi", "loan-affordability"],
    },
    build: {
      description: "තෝරාගත් ගොඩනැගිලි මතුපිට, ද්‍රව්‍ය සහ ශක්තිමත් කිරීමේ කම්බි සඳහා මූලික ප්‍රමාණ ඇස්තමේන්තු.",
      useCases: ["මැනූ මතුපිටකට ටයිල් හෝ තීන්ත ඇස්තමේන්තු කරන්න.", "සරල මානවලින් කොන්ක්‍රීට්, ගඩොල් හෝ බ්ලොක් ඇස්තමේන්තු කරන්න.", "TMT කම්බි බර හෝ වහල ආවරණ ඒකක ඇස්තමේන්තු කරන්න."],
      limitations: ["ප්‍රමාණ සැලසුම්, ප්‍රසම්පාදන හෝ ඉංජිනේරු උපදෙස් නොවේ.", "වර්ගඵලය සහාය දක්වන එක් හැඩයක් පමණක් හසුරුවයි; වැඩබිම් තත්ත්ව, විස්තර, නිෂ්පාදන ප්‍රමාණ, විවර, කැපීම්, අතිච්ඡාදන සහ අපතේ යාම අනෙකුත් අවශ්‍යතා වෙනස් කළ හැක.", "මාන, පිරිවිතර, ආවරණය සහ ඇණවුම් ප්‍රමාණ සුදුසුකම් ලත් වෘත්තිකයන් හා සැපයුම්කරුවන් සමඟ තහවුරු කරන්න."],
      selectionGuidance: "එක් සෘජුකෝණාස්‍රයක්, ත්‍රිකෝණයක් හෝ වෘත්තයක් සඳහා වර්ගඵලය; නිමාව සඳහා ටයිල් ප්‍රමාණය හෝ තීන්ත; මූලික ද්‍රව්‍ය පරිමාව හෝ ගණන සඳහා කොන්ක්‍රීට් හෝ ගඩොල් සහ බ්ලොක්; TMT කම්බි බර සඳහා වානේ; හෝ වහල ආවරණ ඒකක සඳහා වහල ද්‍රව්‍ය තෝරන්න.",
      referencedCalculatorKeys: ["area", "tile-quantity", "paint", "concrete", "brick-block", "steel", "roof-material"],
    },
    travel: {
      description: "ගමන් කළ දුර සහ භාවිත කළ ඉන්ධන පොදු ඉන්ධන පරිභෝජන මිනුම්වලට පරිවර්තනය කරන්න.",
      useCases: ["සම්පූර්ණ කළ ගමනක ලීටරයකට කිලෝමීටර් ගණනය කරන්න.", "එම ගමන් දත්තවලින් කිලෝමීටර් 100කට ලීටර් ගණනය කරන්න.", "ගමන් අතර මැනූ ඉන්ධන කාර්යක්ෂමතාව සසඳන්න."],
      limitations: ["ගණනයට ඉන්ධන මිල හෝ ගමන් වියදම ඇතුළත් නොවේ.", "මැනූ දුර සහ සැබෑ ඉන්ධන භාවිතය යොදන්න; මීටර් කියවීම් සහ ටැංකි මට්ටම් අවිනිශ්චිත විය හැක.", "වාහන තදබදය, බර, භූමි ස්වභාවය, කාලගුණය සහ රිය පැදවීම පරිභෝජනය වෙනස් කළ හැක."],
      selectionGuidance: "ගමන් කළ දුර සහ භාවිත කළ ඉන්ධන දන්නා විට මිල හෝ ගමන් වියදම නොව කාර්යක්ෂමතාව අවශ්‍ය නම් ඉන්ධන පරිභෝජනය තෝරන්න.",
      referencedCalculatorKeys: ["fuel-consumption"],
    },
  },
  ta: {
    everyday: {
      description: "பொதுவான தேதி மற்றும் சதவீதக் கேள்விகளுக்கான விரைவான கணக்கீடுகள்.",
      useCases: ["இரு தேதிகளுக்கிடையே நிறைவடைந்த ஆண்டுகளைக் காணுங்கள்.", "நிறைவடைந்த ஆண்டுகளுடன் கடந்த நாட்களைச் சரிபாருங்கள்.", "Y இன் X% ஐக் கணக்கிடுங்கள்."],
      limitations: ["சதவீதக் கணிப்பான் Y இன் X% ஐ மட்டும் ஆதரிக்கிறது.", "வயது முடிவுகள் வயதுக்கான சட்ட விளக்கத்தை வழங்குவதில்லை.", "தேதி முடிவின் துல்லியம் நோக்கப்பட்ட பிறந்த தேதியையும் கணக்கிடும் தேதியையும் உள்ளிடுவதைச் சார்ந்தது."],
      selectionGuidance: "தேதிகளுக்கிடையிலான நிறைவடைந்த ஆண்டுகளுக்கும் கடந்த நாட்களுக்கும் வயது, அல்லது Y இன் X% க்கு சதவீதம் என்பதைத் தேர்ந்தெடுங்கள்.",
      referencedCalculatorKeys: ["age", "percentage"],
    },
    money: {
      description: "கூட்டு வளர்ச்சி, கடன் தவணைகள் மற்றும் கடன் பெறும் திறனுக்கான வெளிப்படையான மதிப்பீடுகள்.",
      useCases: ["நிலையான முதல் மற்றும் வீதத்திலிருந்து கூட்டு வளர்ச்சியை மதிப்பிடுங்கள்.", "நிலையான மாதக் கடன் தவணையையும் மொத்த வட்டியையும் மதிப்பிடுங்கள்.", "வருமானம், செலவுகள், கடன்கள் மற்றும் கருதுகோள்களிலிருந்து கடன் பெறும் திறனை ஆராயுங்கள்."],
      limitations: ["முடிவுகள் மதிப்பீடுகள் மட்டுமே; நிதி ஆலோசனையோ கடன் வழங்குநரின் முடிவோ அல்ல.", "உண்மையான வீதங்கள், கட்டணங்கள், வரிகள், காப்புறுதி மற்றும் கடன் வழங்குநரின் விதிகள் முடிவுகளை மாற்றலாம்.", "கடன் பெறும் திறன் உள்ளிட்ட குடும்ப மதிப்புகளின் துல்லியத்தையும் முழுமையையும் சார்ந்தது."],
      selectionGuidance: "எதிர்கால மதிப்புக்கு கூட்டு வட்டி, அறிந்த கடனின் தவணைகளுக்கு கடன் EMI, அல்லது சாத்தியமான கடன் தொகையை ஆராய கடன் பெறுமதி என்பதைத் தேர்ந்தெடுங்கள்.",
      referencedCalculatorKeys: ["compound-interest", "loan-emi", "loan-affordability"],
    },
    build: {
      description: "தேர்ந்தெடுக்கப்பட்ட கட்டட மேற்பரப்புகள், பொருட்கள் மற்றும் வலுவூட்டும் கம்பிகளுக்கான ஆரம்ப அளவு மதிப்பீடுகள்.",
      useCases: ["அளந்த மேற்பரப்புக்கான ஓடுகள் அல்லது வண்ணப்பூச்சை மதிப்பிடுங்கள்.", "எளிய அளவுகளிலிருந்து கொங்கிறீற்று, செங்கல் அல்லது கட்டிகளை மதிப்பிடுங்கள்.", "TMT கம்பி எடை அல்லது கூரை மூடும் அலகுகளை மதிப்பிடுங்கள்."],
      limitations: ["அளவுகள் வடிவமைப்பு, கொள்வனவு அல்லது பொறியியல் ஆலோசனை அல்ல.", "பரப்பளவு ஆதரிக்கப்படும் ஒரு வடிவத்தை மட்டுமே கையாளும்; தள நிலைமைகள், விவரங்கள், தயாரிப்பு அளவுகள், திறப்புகள், வெட்டுகள், ஒன்றிப்புகள் மற்றும் கழிவு மற்ற தேவைகளை மாற்றலாம்.", "அளவுகள், விவரக்குறிப்புகள், மூடுதிறன் மற்றும் கொள்வனவு அளவுகளைத் தகுதிபெற்ற நிபுணர்களுடனும் வழங்குநர்களுடனும் உறுதிப்படுத்துங்கள்."],
      selectionGuidance: "ஒரு செவ்வகம், முக்கோணம் அல்லது வட்டத்திற்குப் பரப்பளவு; முடிப்பு வேலைக்கு ஓடு அளவு அல்லது வண்ணப்பூச்சு; அடிப்படைப் பொருள் கனஅளவு அல்லது எண்ணிக்கைக்கு கொங்கிறீற்று அல்லது செங்கல் மற்றும் கட்டி; TMT கம்பி எடைக்கு உருக்கு; அல்லது கூரை மூடும் அலகுகளுக்குக் கூரைப் பொருள் என்பதைத் தேர்ந்தெடுங்கள்.",
      referencedCalculatorKeys: ["area", "tile-quantity", "paint", "concrete", "brick-block", "steel", "roof-material"],
    },
    travel: {
      description: "பயணித்த தூரத்தையும் பயன்படுத்திய எரிபொருளையும் பொதுவான எரிபொருள் நுகர்வு அளவுகளாக மாற்றுங்கள்.",
      useCases: ["முடித்த பயணத்துக்கு லீற்றருக்கான கிலோமீற்றரைக் கணக்கிடுங்கள்.", "அதே பயணத் தரவிலிருந்து 100 கிலோமீற்றருக்கான லீற்றரைக் கணக்கிடுங்கள்.", "பயணங்களுக்கிடையே அளந்த எரிபொருள் திறனை ஒப்பிடுங்கள்."],
      limitations: ["கணக்கீட்டில் எரிபொருள் விலையோ பயணச் செலவோ சேர்க்கப்படவில்லை.", "அளந்த தூரத்தையும் உண்மையில் பயன்படுத்திய எரிபொருளையும் உள்ளிடுங்கள்; அளவுமானி வாசிப்புகளும் நிரப்பு மட்டங்களும் துல்லியமற்றிருக்கலாம்.", "போக்குவரத்து, சுமை, நிலப்பரப்பு, வானிலை மற்றும் ஓட்டும் முறை நுகர்வை மாற்றலாம்."],
      selectionGuidance: "பயணித்த தூரமும் பயன்படுத்திய எரிபொருளும் தெரிந்து, விலையோ பயணச் செலவோ அல்லாமல் திறன் தேவைப்படும்போது எரிபொருள் நுகர்வைத் தேர்ந்தெடுங்கள்.",
      referencedCalculatorKeys: ["fuel-consumption"],
    },
  },
};

export function listCategoryContent(locale: Locale): LocalizedCategoryContent[] {
  return categorySlugs.map((slug) => ({
    slug,
    canonicalName: identities[slug],
    ...content[locale][slug],
    reviewedAt: "2026-08-28",
    reviewOwner: reviewOwners[locale],
  }));
}

export function getCategoryContent(locale: Locale, slugOrCanonicalName: string): LocalizedCategoryContent | undefined {
  const normalized = slugOrCanonicalName.toLowerCase();
  return listCategoryContent(locale).find(({ slug, canonicalName }) => slug === normalized || canonicalName.toLowerCase() === normalized);
}
