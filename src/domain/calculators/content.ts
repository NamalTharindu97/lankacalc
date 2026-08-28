import type { Locale } from "@/i18n/config";

export type CalculatorContent = {
  directAnswer: string;
  instructions: string[];
  formula: {
    expression: string;
    explanation: string;
    variables: Array<{ symbol: string; meaning: string }>;
  };
  workedExample: {
    title: string;
    input: string;
    result: string;
  };
  assumptions: string[];
  exclusions: string[];
  commonMistakes: string[];
  faqs: Array<{ question: string; answer: string }>;
  relatedCalculatorKeys: string[];
  reviewedAt: string;
  reviewedBy: string;
};

const loanEmiContent: Record<Locale, CalculatorContent> = {
  en: {
    directAnswer: "A loan EMI is the fixed monthly installment needed to repay a loan over a selected term at a fixed interest rate. This calculator estimates the regular installment, adjusted final installment, total interest, and total repayment. It does not include lender fees, insurance, taxes, or variable-rate changes.",
    instructions: [
      "Enter the amount you plan to borrow in Sri Lankan rupees.",
      "Enter the nominal annual interest rate quoted by the lender.",
      "Enter the complete repayment period in months, then calculate the result.",
    ],
    formula: {
      expression: "EMI = P x i x (1 + i)^N / ((1 + i)^N - 1)",
      explanation: "The annual percentage rate is divided by 12 to obtain the monthly rate. When the rate is zero, the payment is the loan amount divided by the number of months.",
      variables: [
        { symbol: "P", meaning: "loan principal" },
        { symbol: "i", meaning: "monthly interest rate: annual rate / 100 / 12" },
        { symbol: "N", meaning: "number of monthly installments" },
      ],
    },
    workedExample: {
      title: "Example: LKR 1,000,000 for 12 months at 12%",
      input: "For a principal of LKR 1,000,000, a 12% nominal annual rate, and a 12-month term, the monthly rate is 1%.",
      result: "The regular installment is LKR 88,848.79, the adjusted final installment is LKR 88,848.77, total interest is LKR 66,185.46, and total repayment is LKR 1,066,185.46.",
    },
    assumptions: ["The interest rate remains fixed for the full term.", "Payments are made monthly in arrears.", "The nominal annual rate is divided by 12."],
    exclusions: ["Lender fees, insurance, taxes, penalties, and grace periods", "Prepayments, variable rates, and lender-specific day-count or rounding rules", "Loan approval, affordability assessment, or financial advice"],
    commonMistakes: ["Entering the complete loan term in years instead of months", "Using an effective annual rate when the lender quoted a nominal annual rate", "Comparing loans without including fees and insurance outside the EMI"],
    faqs: [
      { question: "Is the calculated EMI a lender quotation?", answer: "No. It is an estimate based only on the amount, rate, and term you enter. A lender may apply fees, insurance, different rounding, or other conditions." },
      { question: "Why can the final installment differ slightly?", answer: "Regular installments are rounded to cents. The final installment is adjusted so the displayed installments reconcile exactly with the displayed total repayment." },
      { question: "Does a lower EMI always mean a cheaper loan?", answer: "No. A longer term can reduce the monthly installment while increasing total interest. Compare both the monthly installment and total repayment." },
    ],
    relatedCalculatorKeys: ["loan-affordability", "compound-interest"],
    reviewedAt: "2026-08-14",
    reviewedBy: "LankaCalc calculation specification",
  },
  si: {
    directAnswer: "ණය EMI යනු ස්ථාවර පොලී අනුපාතයකට තෝරාගත් කාලය තුළ ණයක් ආපසු ගෙවීමට අවශ්‍ය ස්ථාවර මාසික වාරිකයයි. මෙම ගණකය සාමාන්‍ය වාරිකය, ගැළපූ අවසාන වාරිකය, මුළු පොලිය සහ මුළු ආපසු ගෙවීම ඇස්තමේන්තු කරයි. ණය දෙන්නාගේ ගාස්තු, රක්ෂණ, බදු හෝ වෙනස්වන පොලී මෙයට ඇතුළත් නොවේ.",
    instructions: ["ණයට ගැනීමට බලාපොරොත්තු වන මුදල ශ්‍රී ලංකා රුපියල්වලින් ඇතුළත් කරන්න.", "ණය දෙන්නා සඳහන් කළ නාමික වාර්ෂික පොලී අනුපාතය ඇතුළත් කරන්න.", "සම්පූර්ණ ආපසු ගෙවීමේ කාලය මාසවලින් ඇතුළත් කර ප්‍රතිඵලය ගණනය කරන්න."],
    formula: {
      expression: "EMI = P x i x (1 + i)^N / ((1 + i)^N - 1)",
      explanation: "මාසික අනුපාතය ලබාගැනීමට වාර්ෂික ප්‍රතිශත අනුපාතය 12න් බෙදයි. පොලී අනුපාතය ශූන්‍ය නම්, ණය මුදල මාස ගණනින් බෙදයි.",
      variables: [{ symbol: "P", meaning: "ණය මූලික මුදල" }, { symbol: "i", meaning: "මාසික පොලී අනුපාතය: වාර්ෂික අනුපාතය / 100 / 12" }, { symbol: "N", meaning: "මාසික වාරික ගණන" }],
    },
    workedExample: {
      title: "උදාහරණය: රු. 1,000,000ක් මාස 12කට 12% පොලියට",
      input: "රු. 1,000,000ක ණයක්, 12% නාමික වාර්ෂික අනුපාතයක් සහ මාස 12ක කාලයක් සඳහා මාසික අනුපාතය 1%කි.",
      result: "සාමාන්‍ය වාරිකය රු. 88,848.79ක්, ගැළපූ අවසාන වාරිකය රු. 88,848.77ක්, මුළු පොලිය රු. 66,185.46ක් සහ මුළු ආපසු ගෙවීම රු. 1,066,185.46ක් වේ.",
    },
    assumptions: ["මුළු කාලය පුරා පොලී අනුපාතය ස්ථාවරව පවතී.", "වාරික සෑම මාසයකම අවසානයේ ගෙවයි.", "නාමික වාර්ෂික අනුපාතය 12න් බෙදයි."],
    exclusions: ["ණය දෙන්නාගේ ගාස්තු, රක්ෂණ, බදු, දඩ සහ සහන කාල", "කලින් ගෙවීම්, වෙනස්වන පොලී සහ ණය දෙන්නාගේ දින ගණන් හෝ වටයීමේ නීති", "ණය අනුමැතිය, දැරිය හැකි බව ඇගයීම හෝ මූල්‍ය උපදෙස්"],
    commonMistakes: ["ණය කාලය මාස වෙනුවට අවුරුදුවලින් ඇතුළත් කිරීම", "ණය දෙන්නා සඳහන් කළ නාමික අනුපාතය වෙනුවට ඵලදායී වාර්ෂික අනුපාතයක් භාවිත කිරීම", "EMI පිටත ගාස්තු සහ රක්ෂණ නොසලකා ණය සසඳීම"],
    faqs: [
      { question: "ගණනය කළ EMI එක ණය දෙන්නාගේ මිල ගණනක්ද?", answer: "නැත. මෙය ඔබ ඇතුළත් කරන මුදල, අනුපාතය සහ කාලය මත පමණක් පදනම් වූ ඇස්තමේන්තුවකි. ණය දෙන්නා ගාස්තු, රක්ෂණ හෝ වෙනත් නීති යෙදිය හැක." },
      { question: "අවසාන වාරිකය සුළු වශයෙන් වෙනස් වන්නේ ඇයි?", answer: "සාමාන්‍ය වාරික ශත දක්වා වටයයි. පෙන්වන වාරික එකතුව පෙන්වන මුළු ආපසු ගෙවීමට හරියටම ගැළපීමට අවසාන වාරිකය සකසයි." },
      { question: "අඩු EMI එකක් සෑම විටම ලාභදායී ණයක්ද?", answer: "නැත. දිගු කාලයක් මාසික වාරිකය අඩු කළත් මුළු පොලිය වැඩි කළ හැක. මාසික වාරිකය සහ මුළු ආපසු ගෙවීම දෙකම සසඳන්න." },
    ],
    relatedCalculatorKeys: ["loan-affordability", "compound-interest"],
    reviewedAt: "2026-08-14",
    reviewedBy: "LankaCalc ගණනය කිරීමේ පිරිවිතරය",
  },
  ta: {
    directAnswer: "கடன் EMI என்பது நிலையான வட்டி வீதத்தில் தேர்ந்தெடுத்த காலத்திற்குள் கடனைத் திருப்பிச் செலுத்தத் தேவையான நிலையான மாதாந்தத் தவணையாகும். இந்தக் கணிப்பான் வழக்கமான தவணை, சீரமைக்கப்பட்ட இறுதித் தவணை, மொத்த வட்டி மற்றும் மொத்தத் திருப்பிச் செலுத்தலை மதிப்பிடுகிறது. கடன் வழங்குநரின் கட்டணங்கள், காப்புறுதி, வரிகள் அல்லது மாறும் வட்டி இதில் சேர்க்கப்படவில்லை.",
    instructions: ["கடனாகப் பெறத் திட்டமிடும் தொகையை இலங்கை ரூபாயில் உள்ளிடுங்கள்.", "கடன் வழங்குநர் குறிப்பிட்ட பெயரளவு ஆண்டு வட்டி வீதத்தை உள்ளிடுங்கள்.", "முழுத் திருப்பிச் செலுத்தும் காலத்தை மாதங்களில் உள்ளிட்டு முடிவைக் கணக்கிடுங்கள்."],
    formula: {
      expression: "EMI = P x i x (1 + i)^N / ((1 + i)^N - 1)",
      explanation: "மாத வட்டி வீதத்தைப் பெற ஆண்டு சதவீத வீதம் 12-ஆல் பிரிக்கப்படுகிறது. வட்டி வீதம் பூச்சியமாக இருந்தால், கடன் தொகை மாதங்களின் எண்ணிக்கையால் பிரிக்கப்படும்.",
      variables: [{ symbol: "P", meaning: "கடன் முதல்தொகை" }, { symbol: "i", meaning: "மாத வட்டி வீதம்: ஆண்டு வீதம் / 100 / 12" }, { symbol: "N", meaning: "மாதாந்தத் தவணைகளின் எண்ணிக்கை" }],
    },
    workedExample: {
      title: "உதாரணம்: ரூ. 1,000,000, 12 மாதங்கள், 12% வட்டி",
      input: "ரூ. 1,000,000 முதல்தொகை, 12% பெயரளவு ஆண்டு வீதம் மற்றும் 12 மாதக் காலத்திற்கு மாத வட்டி வீதம் 1% ஆகும்.",
      result: "வழக்கமான தவணை ரூ. 88,848.79, சீரமைக்கப்பட்ட இறுதித் தவணை ரூ. 88,848.77, மொத்த வட்டி ரூ. 66,185.46, மொத்தத் திருப்பிச் செலுத்தல் ரூ. 1,066,185.46 ஆகும்.",
    },
    assumptions: ["முழுக் காலத்திலும் வட்டி வீதம் நிலையாக இருக்கும்.", "ஒவ்வொரு மாதத்தின் முடிவிலும் தவணை செலுத்தப்படும்.", "பெயரளவு ஆண்டு வீதம் 12-ஆல் பிரிக்கப்படும்."],
    exclusions: ["கடன் வழங்குநரின் கட்டணங்கள், காப்புறுதி, வரிகள், அபராதங்கள் மற்றும் சலுகைக் காலங்கள்", "முன்கூட்டிய கொடுப்பனவுகள், மாறும் வட்டி மற்றும் கடன் வழங்குநரின் நாள் கணக்கு அல்லது முழுமையாக்க விதிகள்", "கடன் அனுமதி, செலுத்தக்கூடிய தன்மை மதிப்பீடு அல்லது நிதி ஆலோசனை"],
    commonMistakes: ["கடன் காலத்தை மாதங்களுக்குப் பதிலாக ஆண்டுகளில் உள்ளிடுதல்", "கடன் வழங்குநர் குறிப்பிட்ட பெயரளவு வீதத்திற்குப் பதிலாக பயனுறு ஆண்டு வீதத்தைப் பயன்படுத்துதல்", "EMI-க்கு வெளியேயுள்ள கட்டணங்களையும் காப்புறுதியையும் சேர்க்காமல் கடன்களை ஒப்பிடுதல்"],
    faqs: [
      { question: "கணக்கிடப்பட்ட EMI கடன் வழங்குநரின் விலை முன்மொழிவா?", answer: "இல்லை. இது நீங்கள் உள்ளிட்ட தொகை, வீதம் மற்றும் காலத்தை மட்டும் பயன்படுத்தும் மதிப்பீடு. கடன் வழங்குநர் கட்டணங்கள், காப்புறுதி அல்லது வேறு நிபந்தனைகளைச் சேர்க்கலாம்." },
      { question: "இறுதித் தவணை ஏன் சிறிது மாறலாம்?", answer: "வழக்கமான தவணைகள் சதம் வரை முழுமையாக்கப்படுகின்றன. காட்டப்படும் தவணைகளின் கூட்டுத்தொகை மொத்தத் திருப்பிச் செலுத்தலுடன் சரியாகப் பொருந்த இறுதித் தவணை சீரமைக்கப்படுகிறது." },
      { question: "குறைந்த EMI எப்போதும் மலிவான கடனைக் குறிக்குமா?", answer: "இல்லை. நீண்ட காலம் மாதத் தவணையைக் குறைத்தாலும் மொத்த வட்டியை அதிகரிக்கலாம். மாதத் தவணையையும் மொத்தத் திருப்பிச் செலுத்தலையும் ஒப்பிடுங்கள்." },
    ],
    relatedCalculatorKeys: ["loan-affordability", "compound-interest"],
    reviewedAt: "2026-08-14",
    reviewedBy: "LankaCalc கணக்கீட்டு விவரக்குறிப்பு",
  },
};

const contentByCalculator = {
  "loan-emi": loanEmiContent,
} satisfies Record<string, Record<Locale, CalculatorContent>>;

export function getCalculatorContent(key: string, locale: Locale): CalculatorContent | undefined {
  return contentByCalculator[key as keyof typeof contentByCalculator]?.[locale];
}

export function getCalculatorContentKeys(): string[] {
  return Object.keys(contentByCalculator);
}
