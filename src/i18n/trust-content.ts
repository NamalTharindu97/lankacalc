import type { Locale } from "@/i18n/config";

export const trustPageSlugs = [
  "about",
  "methodology",
  "editorial-policy",
  "source-policy",
  "privacy",
  "terms",
  "corrections",
  "updates",
] as const;

export type TrustPageSlug = (typeof trustPageSlugs)[number];

export type TrustPageSection = {
  heading: string;
  paragraphs: string[];
  items?: string[];
};

export type LocalizedTrustPage = {
  slug: TrustPageSlug;
  title: string;
  description: string;
  reviewedAt: string;
  reviewOwner: string;
  indexingNotice: string;
  sections: TrustPageSection[];
};

export const correctionIssuesUrl = "https://github.com/NamalTharindu97/lankacalc/issues";

export function isTrustPageSlug(value: string): value is TrustPageSlug {
  return trustPageSlugs.includes(value as TrustPageSlug);
}

type TrustPageCopy = Omit<LocalizedTrustPage, "slug">;

const reviewedAt = "2026-08-28";

const shared: Record<Locale, Pick<TrustPageCopy, "reviewedAt" | "reviewOwner" | "indexingNotice">> = {
  en: {
    reviewedAt,
    reviewOwner: "LankaCalc repository maintainers",
    indexingNotice: "Native-speaker review remains required before Sinhala or Tamil indexing is enabled.",
  },
  si: {
    reviewedAt,
    reviewOwner: "LankaCalc කේත ගබඩාවේ නඩත්තුකරුවන්",
    indexingNotice: "සිංහල හෝ දෙමළ සුචිගත කිරීම සක්‍රිය කිරීමට පෙර මව් භාෂා කථික සමාලෝචනය තවමත් අවශ්‍ය වේ.",
  },
  ta: {
    reviewedAt,
    reviewOwner: "LankaCalc நிரல் களஞ்சியப் பராமரிப்பாளர்கள்",
    indexingNotice: "சிங்களம் அல்லது தமிழ் அட்டவணையிடலைச் செயல்படுத்தும் முன் தாய்மொழிப் பயனர் மதிப்பாய்வு இன்னும் தேவை.",
  },
};

const content: Record<Locale, Record<TrustPageSlug, Omit<TrustPageCopy, keyof typeof shared.en>>> = {
  en: {
    about: {
      title: "About LankaCalc",
      description: "What LankaCalc provides at launch and who maintains its published material.",
      sections: [
        {
          heading: "Launch scope",
          paragraphs: ["LankaCalc's launch scope is 13 anonymous calculators that run in the browser. They cover everyday, money, construction, and travel estimates without requiring an account."],
        },
        {
          heading: "How the project is maintained",
          paragraphs: ["The calculator registry and versioned TypeScript formulas in this repository are authoritative. LankaCalc repository maintainers review the content; no official affiliation or certification is implied."],
        },
      ],
    },
    methodology: {
      title: "Calculation methodology",
      description: "How formulas, visible examples, and publication controls produce calculator results.",
      sections: [
        {
          heading: "Authoritative implementation",
          paragraphs: ["The shared calculator registry defines metadata and validation, while versioned TypeScript contains the executable formulas. Visible examples execute through those formulas rather than reproducing results as editorial text."],
        },
        {
          heading: "Publication safeguards",
          paragraphs: ["Regulated and other server-authoritative calculators fail closed until reviewed rules and sources are published. Inputs, assumptions, units, rounding, and result breakdowns should be read together when assessing an estimate."],
        },
      ],
    },
    "editorial-policy": {
      title: "Editorial policy",
      description: "Standards for clear, reviewable, and equivalent calculator guidance.",
      sections: [
        {
          heading: "Content standards",
          paragraphs: ["Guidance explains purpose, assumptions, units, limitations, and result meaning without changing executable behavior. Facts are intended to remain equivalent across English, Sinhala, and Tamil."],
        },
        {
          heading: "Review and localization",
          paragraphs: ["LankaCalc repository maintainers own review. Changes should be traceable to repository history, and native-speaker review remains required before Sinhala or Tamil indexing is enabled."],
        },
      ],
    },
    "source-policy": {
      title: "Source policy",
      description: "How source material supports formulas, parameters, and publication decisions.",
      sections: [
        {
          heading: "Source selection",
          paragraphs: ["Regulated parameters require official sources, provenance, effective dates, and review. Explanatory sources may add context, but they do not replace the calculator registry or versioned TypeScript formulas as the executable authority."],
        },
        {
          heading: "Fail-closed publication",
          paragraphs: ["A regulated or server-authoritative calculator is not published merely because a draft formula exists. It fails closed until its reviewed rules and sources are published for the applicable period."],
        },
      ],
    },
    privacy: {
      title: "Privacy",
      description: "How anonymous calculator inputs and explicit persistence features are handled.",
      sections: [
        {
          heading: "Anonymous calculations",
          paragraphs: ["Anonymous financial inputs are not persisted, logged, or used for raw-input analytics. The 13 launch calculators run in the browser, so an account is not required to calculate."],
        },
        {
          heading: "Explicit persistence",
          paragraphs: ["Accounts are only for features that explicitly persist information, such as saves, reports, and reminders. Before using such a feature, review what it stores and avoid entering sensitive personal data where it is not needed."],
        },
      ],
    },
    terms: {
      title: "Terms of use",
      description: "Practical limits that apply when using LankaCalc calculations and content.",
      sections: [
        {
          heading: "Estimates, not advice",
          paragraphs: ["Calculator outputs are estimates based on the inputs and assumptions shown. They are not professional, legal, financial, or engineering advice and do not replace a qualified review of your circumstances."],
        },
        {
          heading: "Responsible use",
          paragraphs: ["Check units, dates, source periods, assumptions, and rounding before relying on a result. Regulated and server-authoritative calculators remain unavailable until reviewed rules and sources are published."],
        },
      ],
    },
    corrections: {
      title: "Corrections",
      description: "How to report a content or calculation concern without sharing sensitive data.",
      sections: [
        {
          heading: "Report a concern",
          paragraphs: ["Submit correction reports through the public GitHub issues page. Include the route, locale, input assumptions, and observed result, but do not include sensitive personal data."],
          items: [correctionIssuesUrl],
        },
        {
          heading: "Review process",
          paragraphs: ["LankaCalc repository maintainers compare the report with the registry, versioned formula, tests, and applicable published sources. Accepted corrections are made through reviewable repository changes; no response time is guaranteed."],
        },
      ],
    },
    updates: {
      title: "Update history",
      description: "A dated record of major launch-preparation content and trust improvements.",
      sections: [
        {
          heading: "Recorded updates",
          paragraphs: ["These entries describe repository work and do not claim that LankaCalc has launched publicly."],
          items: [
            "2026-08-27: Added trilingual launch content in English, Sinhala, and Tamil.",
            "2026-08-28: Enriched calculator explanations, assumptions, and safety notes.",
            "2026-08-28: Added structured data for discoverable page metadata.",
            "2026-08-28: Added trust pages covering methods, policies, privacy, terms, corrections, and updates.",
          ],
        },
        {
          heading: "Review status",
          paragraphs: ["LankaCalc repository maintainers review this history against repository changes. Native-speaker review remains required before Sinhala or Tamil indexing is enabled."],
        },
      ],
    },
  },
  si: {
    about: {
      title: "LankaCalc ගැන",
      description: "දියත් කිරීමේදී LankaCalc සපයන දේ සහ ප්‍රකාශිත තොරතුරු නඩත්තු කරන්නේ කවුරුන්ද යන්න.",
      sections: [
        { heading: "දියත් කිරීමේ විෂය පථය", paragraphs: ["LankaCalc දියත් කිරීමේ විෂය පථයට බ්‍රවුසරයේ ක්‍රියාත්මක වන නිර්නාමික ගණක 13ක් ඇතුළත් වේ. ගිණුමක් අවශ්‍ය නොවී එදිනෙදා, මුදල්, ඉදිකිරීම් සහ ගමන් ඇස්තමේන්තු ඒවායෙන් ආවරණය වේ."] },
        { heading: "ව්‍යාපෘතිය නඩත්තු කරන ආකාරය", paragraphs: ["මෙම කේත ගබඩාවේ ගණක නාමාවලිය සහ අනුවාදගත TypeScript සූත්‍ර අධිකාරී මූලාශ්‍ර වේ. LankaCalc කේත ගබඩාවේ නඩත්තුකරුවන් අන්තර්ගතය සමාලෝචනය කරන අතර නිල සම්බන්ධතාවක් හෝ සහතිකයක් අදහස් නොවේ."] },
      ],
    },
    methodology: {
      title: "ගණනය කිරීමේ ක්‍රමවේදය",
      description: "සූත්‍ර, පෙනෙන උදාහරණ සහ ප්‍රකාශන පාලන මගින් ගණක ප්‍රතිඵල සකස් වන ආකාරය.",
      sections: [
        { heading: "අධිකාරී ක්‍රියාත්මක කිරීම", paragraphs: ["හවුල් ගණක නාමාවලිය පාරදත්ත සහ වලංගුකරණය නිර්වචනය කරන අතර ක්‍රියාත්මක කළ හැකි සූත්‍ර අනුවාදගත TypeScript තුළ ඇත. පෙනෙන උදාහරණ සංස්කරණ පාඨ ලෙස ප්‍රතිඵල නැවත ලිවීම වෙනුවට එම සූත්‍ර හරහා ක්‍රියාත්මක වේ."] },
        { heading: "ප්‍රකාශන ආරක්ෂණ", paragraphs: ["නියාමිත සහ අනෙකුත් සේවාදායක-අධිකාරී ගණක, සමාලෝචිත නීති සහ මූලාශ්‍ර ප්‍රකාශයට පත් වන තෙක් වසා අසමත් වේ. ඇස්තමේන්තුවක් ඇගයීමේදී ආදාන, උපකල්පන, ඒකක, වටකිරීම් සහ ප්‍රතිඵල විස්තර එකට කියවිය යුතුය."] },
      ],
    },
    "editorial-policy": {
      title: "සංස්කරණ ප්‍රතිපත්තිය",
      description: "පැහැදිලි, සමාලෝචනය කළ හැකි සහ සමාන ගණක මාර්ගෝපදේශ සඳහා ප්‍රමිතීන්.",
      sections: [
        { heading: "අන්තර්ගත ප්‍රමිතීන්", paragraphs: ["මාර්ගෝපදේශ ක්‍රියාත්මක හැසිරීම වෙනස් නොකර අරමුණ, උපකල්පන, ඒකක, සීමා සහ ප්‍රතිඵලයේ අර්ථය පැහැදිලි කරයි. ඉංග්‍රීසි, සිංහල සහ දෙමළ භාෂා තුනෙහි කරුණු සමානව තබා ගැනීම අරමුණයි."] },
        { heading: "සමාලෝචනය සහ දේශීයකරණය", paragraphs: ["සමාලෝචනයේ වගකීම LankaCalc කේත ගබඩාවේ නඩත්තුකරුවන් සතුය. වෙනස්කම් කේත ගබඩා ඉතිහාසයෙන් සොයාගත හැකි විය යුතු අතර සිංහල හෝ දෙමළ සුචිගත කිරීම සක්‍රිය කිරීමට පෙර මව් භාෂා කථික සමාලෝචනය තවමත් අවශ්‍ය වේ."] },
      ],
    },
    "source-policy": {
      title: "මූලාශ්‍ර ප්‍රතිපත්තිය",
      description: "සූත්‍ර, පරාමිති සහ ප්‍රකාශන තීරණ සඳහා මූලාශ්‍ර සහාය වන ආකාරය.",
      sections: [
        { heading: "මූලාශ්‍ර තේරීම", paragraphs: ["නියාමිත පරාමිති සඳහා නිල මූලාශ්‍ර, මූලාශ්‍ර විස්තර, බලපැවැත්වෙන දින සහ සමාලෝචනය අවශ්‍ය වේ. පැහැදිලි කිරීමේ මූලාශ්‍ර සන්දර්භය එක් කළ හැකි නමුත් ක්‍රියාත්මක අධිකාරිය ලෙස ගණක නාමාවලිය හෝ අනුවාදගත TypeScript සූත්‍ර ප්‍රතිස්ථාපනය නොකරයි."] },
        { heading: "වසා අසමත් වන ප්‍රකාශනය", paragraphs: ["කෙටුම්පත් සූත්‍රයක් තිබීම පමණින් නියාමිත හෝ සේවාදායක-අධිකාරී ගණකයක් ප්‍රකාශයට පත් නොවේ. අදාළ කාලයට සමාලෝචිත නීති සහ මූලාශ්‍ර ප්‍රකාශයට පත් වන තෙක් එය වසා අසමත් වේ."] },
      ],
    },
    privacy: {
      title: "පෞද්ගලිකත්වය",
      description: "නිර්නාමික ගණක ආදාන සහ පැහැදිලි ස්ථිර දත්ත විශේෂාංග හසුරුවන ආකාරය.",
      sections: [
        { heading: "නිර්නාමික ගණනය කිරීම්", paragraphs: ["නිර්නාමික මූල්‍ය ආදාන ස්ථිරව තබා නොගනී, ලොග් නොකරයි, හෝ අමු-ආදාන විශ්ලේෂණ සඳහා භාවිත නොකරයි. දියත් කිරීමේ ගණක 13 බ්‍රවුසරයේ ක්‍රියාත්මක වන බැවින් ගණනය කිරීමට ගිණුමක් අවශ්‍ය නොවේ."] },
        { heading: "පැහැදිලි ස්ථිර දත්ත", paragraphs: ["ගිණුම් භාවිත වන්නේ සුරැකුම්, වාර්තා සහ සිහිකැඳවීම් වැනි තොරතුරු පැහැදිලිව ස්ථිර කරන විශේෂාංග සඳහා පමණි. එවැනි විශේෂාංගයක් භාවිතයට පෙර ගබඩා කරන දේ පරීක්ෂා කර අවශ්‍ය නොවන තැන්වල සංවේදී පෞද්ගලික දත්ත ඇතුළත් නොකරන්න."] },
      ],
    },
    terms: {
      title: "භාවිත නියමයන්",
      description: "LankaCalc ගණනය කිරීම් සහ අන්තර්ගතය භාවිතයේදී අදාළ වන ප්‍රායෝගික සීමා.",
      sections: [
        { heading: "ඇස්තමේන්තු මිස උපදෙස් නොවේ", paragraphs: ["ගණක ප්‍රතිඵල පෙන්වා ඇති ආදාන සහ උපකල්පන මත පදනම් වූ ඇස්තමේන්තු වේ. ඒවා වෘත්තීය, නීතිමය, මූල්‍ය හෝ ඉංජිනේරු උපදෙස් නොවන අතර ඔබේ තත්ත්වය පිළිබඳ සුදුසුකම් ලත් සමාලෝචනයක් ප්‍රතිස්ථාපනය නොකරයි."] },
        { heading: "වගකීම් සහිත භාවිතය", paragraphs: ["ප්‍රතිඵලයක් මත රඳා සිටීමට පෙර ඒකක, දින, මූලාශ්‍ර කාල, උපකල්පන සහ වටකිරීම් පරීක්ෂා කරන්න. සමාලෝචිත නීති සහ මූලාශ්‍ර ප්‍රකාශයට පත් වන තෙක් නියාමිත සහ සේවාදායක-අධිකාරී ගණක නොලැබේ."] },
      ],
    },
    corrections: {
      title: "නිවැරදි කිරීම්",
      description: "සංවේදී දත්ත බෙදා නොගෙන අන්තර්ගත හෝ ගණනය කිරීමේ ගැටලුවක් වාර්තා කරන ආකාරය.",
      sections: [
        { heading: "ගැටලුවක් වාර්තා කිරීම", paragraphs: ["පොදු GitHub issues පිටුව හරහා නිවැරදි කිරීමේ වාර්තා ඉදිරිපත් කරන්න. මාර්ගය, භාෂාව, ආදාන උපකල්පන සහ නිරීක්ෂිත ප්‍රතිඵලය ඇතුළත් කරන්න; සංවේදී පෞද්ගලික දත්ත ඇතුළත් නොකරන්න."], items: [correctionIssuesUrl] },
        { heading: "සමාලෝචන ක්‍රියාවලිය", paragraphs: ["LankaCalc කේත ගබඩාවේ නඩත්තුකරුවන් වාර්තාව නාමාවලිය, අනුවාදගත සූත්‍රය, පරීක්ෂණ සහ අදාළ ප්‍රකාශිත මූලාශ්‍ර සමඟ සසඳයි. පිළිගත් නිවැරදි කිරීම් සමාලෝචනය කළ හැකි කේත ගබඩා වෙනස්කම් මගින් සිදු කරන අතර ප්‍රතිචාර කාලයක් සහතික නොවේ."] },
      ],
    },
    updates: {
      title: "යාවත්කාලීන ඉතිහාසය",
      description: "ප්‍රධාන දියත්-සූදානම් අන්තර්ගත සහ විශ්වාස වැඩිදියුණු කිරීම් පිළිබඳ දින සහිත වාර්තාවක්.",
      sections: [
        { heading: "වාර්තාගත යාවත්කාලීන", paragraphs: ["මෙම ඇතුළත් කිරීම් කේත ගබඩා කාර්යයන් විස්තර කරන අතර LankaCalc පොදුවේ දියත් කර ඇති බවක් නොකියයි."], items: ["2026-08-27: ඉංග්‍රීසි, සිංහල සහ දෙමළ භාෂාවල ත්‍රෛභාෂික දියත් අන්තර්ගතය එක් කරන ලදී.", "2026-08-28: ගණක පැහැදිලි කිරීම්, උපකල්පන සහ ආරක්ෂක සටහන් පුළුල් කරන ලදී.", "2026-08-28: සොයාගත හැකි පිටු පාරදත්ත සඳහා ව්‍යුහගත දත්ත එක් කරන ලදී.", "2026-08-28: ක්‍රම, ප්‍රතිපත්ති, පෞද්ගලිකත්වය, නියමයන්, නිවැරදි කිරීම් සහ යාවත්කාලීන සඳහා විශ්වාස පිටු එක් කරන ලදී."] },
        { heading: "සමාලෝචන තත්ත්වය", paragraphs: ["LankaCalc කේත ගබඩාවේ නඩත්තුකරුවන් මෙම ඉතිහාසය කේත ගබඩා වෙනස්කම් සමඟ සමාලෝචනය කරයි. සිංහල හෝ දෙමළ සුචිගත කිරීම සක්‍රිය කිරීමට පෙර මව් භාෂා කථික සමාලෝචනය තවමත් අවශ්‍ය වේ."] },
      ],
    },
  },
  ta: {
    about: {
      title: "LankaCalc பற்றி",
      description: "தொடக்கத்தில் LankaCalc வழங்குவது என்ன, வெளியிடப்பட்ட உள்ளடக்கத்தைப் பராமரிப்பது யார் என்பதற்கான விளக்கம்.",
      sections: [
        { heading: "தொடக்க வரம்பு", paragraphs: ["LankaCalc தொடக்க வரம்பில் உலாவியில் இயங்கும் 13 பெயரில்லா கணிப்பான்கள் உள்ளன. கணக்கு தேவையின்றி அன்றாடம், பணம், கட்டுமானம் மற்றும் பயண மதிப்பீடுகளை அவை உள்ளடக்குகின்றன."] },
        { heading: "திட்டப் பராமரிப்பு", paragraphs: ["இந்த நிரல் களஞ்சியத்தின் கணிப்பான் பதிவேடும் பதிப்பிடப்பட்ட TypeScript சூத்திரங்களும் அதிகாரப்பூர்வமானவை. LankaCalc நிரல் களஞ்சியப் பராமரிப்பாளர்கள் உள்ளடக்கத்தை மதிப்பாய்வு செய்கின்றனர்; எந்த அதிகாரப்பூர்வத் தொடர்போ சான்றிதழோ இதனால் குறிக்கப்படவில்லை."] },
      ],
    },
    methodology: {
      title: "கணக்கீட்டு முறை",
      description: "சூத்திரங்கள், காணக்கூடிய எடுத்துக்காட்டுகள் மற்றும் வெளியீட்டுக் கட்டுப்பாடுகள் முடிவுகளை உருவாக்கும் விதம்.",
      sections: [
        { heading: "அதிகாரப்பூர்வச் செயலாக்கம்", paragraphs: ["பகிரப்பட்ட கணிப்பான் பதிவேடு மேனிலைத் தரவையும் சரிபார்ப்பையும் வரையறுக்கிறது; செயல்படுத்தக்கூடிய சூத்திரங்கள் பதிப்பிடப்பட்ட TypeScript-இல் உள்ளன. காணக்கூடிய எடுத்துக்காட்டுகள் முடிவுகளைத் தொகுப்புரையாக மீண்டும் எழுதாமல் அந்தச் சூத்திரங்கள் வழியாக இயங்குகின்றன."] },
        { heading: "வெளியீட்டுப் பாதுகாப்புகள்", paragraphs: ["ஒழுங்குபடுத்தப்பட்ட மற்றும் பிற சேவையக-அதிகாரப்பூர்வ கணிப்பான்கள், மதிப்பாய்வு செய்யப்பட்ட விதிகளும் மூலங்களும் வெளியிடப்படும் வரை மூடிய நிலையில் தோல்வியடைகின்றன. ஒரு மதிப்பீட்டை ஆராயும்போது உள்ளீடுகள், ஊகங்கள், அலகுகள், முழுமையாக்கம் மற்றும் முடிவு விவரங்களை ஒன்றாகப் படிக்க வேண்டும்."] },
      ],
    },
    "editorial-policy": {
      title: "தொகுப்புக் கொள்கை",
      description: "தெளிவான, மதிப்பாய்வு செய்யக்கூடிய, சமமான கணிப்பான் வழிகாட்டலுக்கான தரநிலைகள்.",
      sections: [
        { heading: "உள்ளடக்கத் தரநிலைகள்", paragraphs: ["செயல்பாட்டு நடத்தையை மாற்றாமல் நோக்கம், ஊகங்கள், அலகுகள், வரம்புகள் மற்றும் முடிவின் பொருளை வழிகாட்டல் விளக்குகிறது. ஆங்கிலம், சிங்களம் மற்றும் தமிழில் உண்மைகள் சமமாக இருப்பது நோக்கம்."] },
        { heading: "மதிப்பாய்வும் உள்ளூர்மயமாக்கலும்", paragraphs: ["மதிப்பாய்வுக்கு LankaCalc நிரல் களஞ்சியப் பராமரிப்பாளர்கள் பொறுப்பாவர். மாற்றங்களை களஞ்சிய வரலாற்றில் கண்டறியக்கூடியதாக இருக்க வேண்டும்; சிங்களம் அல்லது தமிழ் அட்டவணையிடலைச் செயல்படுத்தும் முன் தாய்மொழிப் பயனர் மதிப்பாய்வு இன்னும் தேவை."] },
      ],
    },
    "source-policy": {
      title: "மூலக் கொள்கை",
      description: "சூத்திரங்கள், அளவுருக்கள் மற்றும் வெளியீட்டு முடிவுகளை மூலங்கள் ஆதரிக்கும் விதம்.",
      sections: [
        { heading: "மூலத் தேர்வு", paragraphs: ["ஒழுங்குபடுத்தப்பட்ட அளவுருக்களுக்கு அதிகாரப்பூர்வ மூலங்கள், தோற்ற விவரம், நடைமுறைத் தேதிகள் மற்றும் மதிப்பாய்வு தேவை. விளக்க மூலங்கள் சூழலைச் சேர்க்கலாம்; ஆனால் செயல்பாட்டு அதிகாரமாகக் கணிப்பான் பதிவேட்டையோ பதிப்பிடப்பட்ட TypeScript சூத்திரங்களையோ மாற்றாது."] },
        { heading: "மூடிய நிலையில் தோல்வியுறும் வெளியீடு", paragraphs: ["வரைவுச் சூத்திரம் இருப்பதால் மட்டும் ஒழுங்குபடுத்தப்பட்ட அல்லது சேவையக-அதிகாரப்பூர்வ கணிப்பான் வெளியிடப்படாது. பொருந்தும் காலத்திற்கான மதிப்பாய்வு செய்யப்பட்ட விதிகளும் மூலங்களும் வெளியிடப்படும் வரை அது மூடிய நிலையில் தோல்வியடையும்."] },
      ],
    },
    privacy: {
      title: "தனியுரிமை",
      description: "பெயரில்லா கணிப்பான் உள்ளீடுகளும் வெளிப்படையான நிலைத்த தரவு அம்சங்களும் கையாளப்படும் விதம்.",
      sections: [
        { heading: "பெயரில்லா கணக்கீடுகள்", paragraphs: ["பெயரில்லா நிதி உள்ளீடுகள் நிலையாகச் சேமிக்கப்படுவதில்லை, பதிவுசெய்யப்படுவதில்லை, அல்லது மூல-உள்ளீட்டுப் பகுப்பாய்வுக்குப் பயன்படுத்தப்படுவதில்லை. 13 தொடக்கக் கணிப்பான்களும் உலாவியில் இயங்குவதால் கணக்கிட ஒரு கணக்கு தேவையில்லை."] },
        { heading: "வெளிப்படையான நிலைத்த தரவு", paragraphs: ["சேமிப்புகள், அறிக்கைகள், நினைவூட்டல்கள் போன்ற தகவலை வெளிப்படையாக நிலையாக வைத்திருக்கும் அம்சங்களுக்கு மட்டுமே கணக்குகள் பயன்படும். அத்தகைய அம்சத்தைப் பயன்படுத்தும் முன் அது சேமிப்பதைப் பார்த்து, தேவையில்லாத இடத்தில் உணர்திறன் மிக்க தனிப்பட்ட தரவை உள்ளிடாதீர்கள்."] },
      ],
    },
    terms: {
      title: "பயன்பாட்டு விதிமுறைகள்",
      description: "LankaCalc கணக்கீடுகளையும் உள்ளடக்கத்தையும் பயன்படுத்தும்போது பொருந்தும் நடைமுறை வரம்புகள்.",
      sections: [
        { heading: "மதிப்பீடுகள், ஆலோசனை அல்ல", paragraphs: ["கணிப்பான் முடிவுகள் காட்டப்பட்ட உள்ளீடுகள் மற்றும் ஊகங்களின் அடிப்படையிலான மதிப்பீடுகள். அவை தொழில்முறை, சட்ட, நிதி அல்லது பொறியியல் ஆலோசனை அல்ல; உங்கள் சூழ்நிலைக்கான தகுதிவாய்ந்த மதிப்பாய்வை மாற்றாது."] },
        { heading: "பொறுப்பான பயன்பாடு", paragraphs: ["ஒரு முடிவைச் சாரும் முன் அலகுகள், தேதிகள், மூலக் காலங்கள், ஊகங்கள் மற்றும் முழுமையாக்கத்தைச் சரிபார்க்கவும். மதிப்பாய்வு செய்யப்பட்ட விதிகளும் மூலங்களும் வெளியிடப்படும் வரை ஒழுங்குபடுத்தப்பட்ட மற்றும் சேவையக-அதிகாரப்பூர்வ கணிப்பான்கள் கிடைக்காது."] },
      ],
    },
    corrections: {
      title: "திருத்தங்கள்",
      description: "உணர்திறன் மிக்க தரவைப் பகிராமல் உள்ளடக்க அல்லது கணக்கீட்டுச் சிக்கலை அறிவிக்கும் விதம்.",
      sections: [
        { heading: "ஒரு சிக்கலை அறிவித்தல்", paragraphs: ["பொது GitHub issues பக்கம் வழியாகத் திருத்த அறிக்கைகளைச் சமர்ப்பிக்கவும். பாதை, மொழி, உள்ளீட்டு ஊகங்கள் மற்றும் கண்ட முடிவைச் சேர்க்கவும்; உணர்திறன் மிக்க தனிப்பட்ட தரவைச் சேர்க்காதீர்கள்."], items: [correctionIssuesUrl] },
        { heading: "மதிப்பாய்வு நடைமுறை", paragraphs: ["LankaCalc நிரல் களஞ்சியப் பராமரிப்பாளர்கள் அறிக்கையைப் பதிவேடு, பதிப்பிடப்பட்ட சூத்திரம், சோதனைகள் மற்றும் பொருந்தும் வெளியிடப்பட்ட மூலங்களுடன் ஒப்பிடுவர். ஏற்கப்பட்ட திருத்தங்கள் மதிப்பாய்வு செய்யக்கூடிய களஞ்சிய மாற்றங்களாகச் செய்யப்படும்; பதில் நேரம் உறுதியளிக்கப்படவில்லை."] },
      ],
    },
    updates: {
      title: "புதுப்பிப்பு வரலாறு",
      description: "முக்கிய தொடக்கத் தயாரிப்பு உள்ளடக்கம் மற்றும் நம்பிக்கை மேம்பாடுகளின் தேதியிட்ட பதிவு.",
      sections: [
        { heading: "பதிவுசெய்யப்பட்ட புதுப்பிப்புகள்", paragraphs: ["இந்தப் பதிவுகள் நிரல் களஞ்சியப் பணியை விவரிக்கின்றன; LankaCalc பொதுமக்களுக்குத் தொடங்கப்பட்டதாகக் கூறவில்லை."], items: ["2026-08-27: ஆங்கிலம், சிங்களம் மற்றும் தமிழில் மும்மொழித் தொடக்க உள்ளடக்கம் சேர்க்கப்பட்டது.", "2026-08-28: கணிப்பான் விளக்கங்கள், ஊகங்கள் மற்றும் பாதுகாப்புக் குறிப்புகள் செறிவூட்டப்பட்டன.", "2026-08-28: கண்டறியக்கூடிய பக்க மேனிலைத் தரவுக்குக் கட்டமைக்கப்பட்ட தரவு சேர்க்கப்பட்டது.", "2026-08-28: முறைகள், கொள்கைகள், தனியுரிமை, விதிமுறைகள், திருத்தங்கள் மற்றும் புதுப்பிப்புகளுக்கான நம்பிக்கைப் பக்கங்கள் சேர்க்கப்பட்டன."] },
        { heading: "மதிப்பாய்வு நிலை", paragraphs: ["LankaCalc நிரல் களஞ்சியப் பராமரிப்பாளர்கள் இந்த வரலாற்றைக் களஞ்சிய மாற்றங்களுடன் மதிப்பாய்வு செய்கின்றனர். சிங்களம் அல்லது தமிழ் அட்டவணையிடலைச் செயல்படுத்தும் முன் தாய்மொழிப் பயனர் மதிப்பாய்வு இன்னும் தேவை."] },
      ],
    },
  },
};

export function listTrustPages(locale: Locale): LocalizedTrustPage[] {
  return trustPageSlugs.map((slug) => ({ slug, ...shared[locale], ...content[locale][slug] }));
}

export function getTrustPage(locale: Locale, slug: TrustPageSlug): LocalizedTrustPage {
  return { slug, ...shared[locale], ...content[locale][slug] };
}
