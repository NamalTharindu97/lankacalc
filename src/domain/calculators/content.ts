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
    fixture: {
      input: Record<string, string | number>;
      expectedResult: Record<string, string | number>;
    };
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
      fixture: { input: { principal: 1000000, annualRatePercent: 12, termMonths: 12 }, expectedResult: { monthlyPayment: "88848.79", finalPayment: "88848.77", totalPayment: "1066185.46", totalInterest: "66185.46" } },
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
      fixture: { input: { principal: 1000000, annualRatePercent: 12, termMonths: 12 }, expectedResult: { monthlyPayment: "88848.79", finalPayment: "88848.77", totalPayment: "1066185.46", totalInterest: "66185.46" } },
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
      fixture: { input: { principal: 1000000, annualRatePercent: 12, termMonths: 12 }, expectedResult: { monthlyPayment: "88848.79", finalPayment: "88848.77", totalPayment: "1066185.46", totalInterest: "66185.46" } },
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

const loanAffordabilityContent: Record<Locale, CalculatorContent> = {
  en: {
    directAnswer: "Loan affordability estimates a possible new monthly payment from income, living expenses, existing debts, and a debt-to-income cap you choose. It then converts that payment into a maximum fixed-rate loan and shows a higher-rate stress case. The result is an estimate, not loan approval, a credit decision, or financial advice.",
    instructions: ["Enter monthly take-home income, living expenses, and existing debt payments in whole rupees.", "Choose the maximum share of income that total debt payments may use.", "Enter the proposed term, expected annual rate, and a stress premium to compare a higher-rate case."],
    formula: {
      expression: "payment = max(0, min(Y - E - D, Y x R - D))",
      explanation: "The smaller of the available monthly surplus and debt-to-income allowance limits the new payment. That payment is inverted through the fixed-rate EMI formula to estimate loan size at the entered and stressed rates.",
      variables: [{ symbol: "Y", meaning: "monthly take-home income" }, { symbol: "E", meaning: "monthly living expenses" }, { symbol: "D", meaning: "existing monthly debt payments" }, { symbol: "R", meaning: "chosen debt-to-income cap as a decimal" }],
    },
    workedExample: {
      title: "Example: LKR 200,000 monthly income with a 35% debt cap",
      input: "With LKR 200,000 income, LKR 80,000 living expenses, LKR 20,000 existing debt, a 35% cap, 60 months, a 12% rate, and a 2% stress premium, the debt cap limits the new payment to LKR 50,000.",
      result: "The estimated maximum loan is LKR 2,247,751.92 at 12% and LKR 2,148,850.82 at 14%, a reduction of LKR 98,901.10 in the stress case.",
      fixture: { input: { monthlyIncome: 200000, monthlyLivingExpenses: 80000, existingMonthlyDebtPayments: 20000, affordabilityRatioPercent: 35, loanTermMonths: 60, annualRatePercent: 12, stressRatePremiumPercent: 2 }, expectedResult: { verdict: "debt-ratio-limited", affordableNewPayment: "50000.00", maxLoanAtEnteredRate: "2247751.92", maxLoanAtStressedRate: "2148850.82", stressImpact: "-98901.10" } },
    },
    assumptions: ["All income, expense, debt, and rate values are entered by the user.", "The debt-to-income cap is a personal convention, not a statutory or universal lender rule.", "The loan uses a fixed rate and equal monthly installments for the full term."],
    exclusions: ["Credit scores, collateral, lender underwriting, and income eligibility rules", "Fees, insurance, taxes, prepayments, and lender-specific rounding", "Loan approval, a lender quotation, or financial advice"],
    commonMistakes: ["Entering gross salary instead of dependable take-home income", "Leaving out credit-card minimums or other scheduled debts", "Treating the selected debt cap as a guaranteed lender policy"],
    faqs: [
      { question: "Does this calculator show how much a bank will approve?", answer: "No. Banks and finance companies use their own income definitions, credit checks, collateral requirements, ratios, and underwriting rules." },
      { question: "Why is the stressed maximum loan smaller?", answer: "The affordable monthly payment is held constant while the interest rate rises. More of each payment goes to interest, so the same payment supports a smaller principal." },
      { question: "What debt-to-income cap should I use?", answer: "Use a cautious value that reflects your budget and the lender you are considering. The calculator does not prescribe a statutory or universal percentage." },
    ],
    relatedCalculatorKeys: ["loan-emi", "compound-interest"],
    reviewedAt: "2026-08-15",
    reviewedBy: "LankaCalc loan affordability candidate specification",
  },
  si: {
    directAnswer: "ණය දැරිය හැකි බව, ඔබ ඇතුළත් කරන ආදායම, ජීවන වියදම්, දැනට පවතින ණය සහ තෝරාගත් ආදායමට සාපේක්ෂ ණය සීමාව මත නව මාසික වාරිකයක් ඇස්තමේන්තු කරයි. එම වාරිකය ස්ථාවර පොලී ණය මුදලකට පරිවර්තනය කර වැඩි පොලී අවස්ථාවක්ද පෙන්වයි. මෙය ණය අනුමැතියක් හෝ මූල්‍ය උපදෙසක් නොවේ.",
    instructions: ["මාසික අතට ලැබෙන ආදායම, ජීවන වියදම් සහ දැනට පවතින ණය වාරික සම්පූර්ණ රුපියල්වලින් ඇතුළත් කරන්න.", "මුළු ණය වාරික සඳහා භාවිත කළ හැකි උපරිම මාසික ආදායම් ප්‍රතිශතය තෝරන්න.", "යෝජිත කාලය, අපේක්ෂිත වාර්ෂික පොලිය සහ වැඩි පොලී පරීක්ෂාව සඳහා අමතර ප්‍රතිශතය ඇතුළත් කරන්න."],
    formula: {
      expression: "වාරිකය = max(0, min(Y - E - D, Y x R - D))",
      explanation: "මාසික ඉතිරිය සහ ආදායමට සාපේක්ෂ ණය ඉඩ අතර කුඩා අගය නව වාරිකය සීමා කරයි. එම වාරිකය ස්ථාවර EMI සූත්‍රය ප්‍රතිවර්තනය කර ණය මුදල ඇස්තමේන්තු කරයි.",
      variables: [{ symbol: "Y", meaning: "අතට ලැබෙන මාසික ආදායම" }, { symbol: "E", meaning: "මාසික ජීවන වියදම්" }, { symbol: "D", meaning: "දැනට පවතින මාසික ණය වාරික" }, { symbol: "R", meaning: "තෝරාගත් ආදායමට සාපේක්ෂ ණය සීමාව" }],
    },
    workedExample: {
      title: "උදාහරණය: රු. 200,000ක මාසික ආදායමක් සහ 35% ණය සීමාවක්",
      input: "රු. 200,000 ආදායමක්, රු. 80,000 ජීවන වියදම්, රු. 20,000 දැනට පවතින ණය, 35% සීමාවක්, මාස 60ක්, 12% පොලියක් සහ 2% වැඩි පොලී පරීක්ෂාවක් ඇති විට නව වාරිකය රු. 50,000කට සීමා වේ.",
      result: "12% පොලියට උපරිම ණය ඇස්තමේන්තුව රු. 2,247,751.92ක් වන අතර 14% පොලියට එය රු. 2,148,850.82කි. වැඩි පොලී අවස්ථාවේ අඩුවීම රු. 98,901.10කි.",
      fixture: { input: { monthlyIncome: 200000, monthlyLivingExpenses: 80000, existingMonthlyDebtPayments: 20000, affordabilityRatioPercent: 35, loanTermMonths: 60, annualRatePercent: 12, stressRatePremiumPercent: 2 }, expectedResult: { verdict: "debt-ratio-limited", affordableNewPayment: "50000.00", maxLoanAtEnteredRate: "2247751.92", maxLoanAtStressedRate: "2148850.82", stressImpact: "-98901.10" } },
    },
    assumptions: ["සියලු ආදායම්, වියදම්, ණය සහ පොලී අගයන් පරිශීලකයා ඇතුළත් කරයි.", "ආදායමට සාපේක්ෂ ණය සීමාව පුද්ගලික උපකල්පනයක් මිස පොදු නීතිමය සීමාවක් නොවේ.", "මුළු කාලය පුරා ස්ථාවර පොලිය සහ සමාන මාසික වාරික භාවිත කරයි."],
    exclusions: ["ණය ලකුණු, ඇප, ණය දෙන්නාගේ ඇගයීම සහ ආදායම් සුදුසුකම්", "ගාස්තු, රක්ෂණ, බදු, කලින් ගෙවීම් සහ විශේෂ වටයීම්", "ණය අනුමැතියක්, ණය මිල ගණනක් හෝ මූල්‍ය උපදෙසක්"],
    commonMistakes: ["විශ්වාසදායක අතට ලැබෙන ආදායම වෙනුවට දළ වැටුප ඇතුළත් කිරීම", "ක්‍රෙඩිට් කාඩ් අවම ගෙවීම් හෝ වෙනත් නියමිත ණය අත්හැරීම", "තෝරාගත් ණය සීමාව ණය දෙන්නාගේ සහතික කළ ප්‍රතිපත්තියක් ලෙස සැලකීම"],
    faqs: [
      { question: "මෙය බැංකුව අනුමත කරන ණය මුදල පෙන්වයිද?", answer: "නැත. බැංකු සහ මූල්‍ය සමාගම් තමන්ගේ ආදායම් නිර්වචන, ණය පරීක්ෂණ, ඇප, අනුපාත සහ ඇගයීමේ නීති භාවිත කරයි." },
      { question: "වැඩි පොලී අවස්ථාවේ ණය මුදල අඩු වන්නේ ඇයි?", answer: "දැරිය හැකි මාසික වාරිකය වෙනස් නොකර පොලිය වැඩි කරයි. එවිට වාරිකයෙන් වැඩි කොටසක් පොලියට යන නිසා ලබාගත හැකි මූලික මුදල අඩු වේ." },
      { question: "කුමන ආදායමට සාපේක්ෂ ණය සීමාවක් භාවිත කළ යුතුද?", answer: "ඔබේ අයවැය සහ සලකා බලන ණය දෙන්නාට ගැළපෙන සැලකිලිමත් අගයක් භාවිත කරන්න. මෙම ගණකය පොදු නීතිමය ප්‍රතිශතයක් නියම නොකරයි." },
    ],
    relatedCalculatorKeys: ["loan-emi", "compound-interest"],
    reviewedAt: "2026-08-15",
    reviewedBy: "LankaCalc ණය දැරිය හැකි බවේ අපේක්ෂක පිරිවිතරය",
  },
  ta: {
    directAnswer: "கடன் பெறும் திறன் கணிப்பான், நீங்கள் உள்ளிட்ட வருமானம், வாழ்க்கைச் செலவுகள், தற்போதைய கடன்கள் மற்றும் தேர்ந்தெடுத்த கடன்-வருமான வரம்பிலிருந்து புதிய மாதத் தவணையை மதிப்பிடுகிறது. அந்தத் தவணையை நிலையான வட்டிக் கடன் தொகையாக மாற்றி, உயர்ந்த வட்டி நிலைமையையும் காட்டுகிறது. இது கடன் அனுமதி, கடன் முடிவு அல்லது நிதி ஆலோசனை அல்ல.",
    instructions: ["மாதாந்தக் கையிருப்பு வருமானம், வாழ்க்கைச் செலவுகள் மற்றும் தற்போதைய கடன் கொடுப்பனவுகளை முழு ரூபாயில் உள்ளிடுங்கள்.", "மொத்தக் கடன் கொடுப்பனவுகளுக்குப் பயன்படுத்தக்கூடிய மாத வருமானத்தின் அதிகபட்ச சதவீதத்தைத் தேர்ந்தெடுங்கள்.", "கடன் காலம், எதிர்பார்க்கும் ஆண்டு வட்டி மற்றும் உயர்ந்த வட்டிச் சோதனைக்கான மேலதிக வீதத்தை உள்ளிடுங்கள்."],
    formula: {
      expression: "தவணை = max(0, min(Y - E - D, Y x R - D))",
      explanation: "மாதாந்த மீதித்தொகை மற்றும் கடன்-வருமான இடம் ஆகியவற்றில் சிறிய மதிப்பு புதிய தவணையை வரையறுக்கிறது. அந்தத் தவணை நிலையான EMI சூத்திரத்தில் பின்னோக்கிக் கணக்கிடப்பட்டு கடன் தொகை மதிப்பிடப்படுகிறது.",
      variables: [{ symbol: "Y", meaning: "மாதாந்தக் கையிருப்பு வருமானம்" }, { symbol: "E", meaning: "மாதாந்த வாழ்க்கைச் செலவுகள்" }, { symbol: "D", meaning: "தற்போதைய மாதாந்தக் கடன் கொடுப்பனவுகள்" }, { symbol: "R", meaning: "தேர்ந்தெடுத்த கடன்-வருமான வரம்பு" }],
    },
    workedExample: {
      title: "உதாரணம்: ரூ. 200,000 மாத வருமானமும் 35% கடன் வரம்பும்",
      input: "ரூ. 200,000 வருமானம், ரூ. 80,000 வாழ்க்கைச் செலவு, ரூ. 20,000 தற்போதைய கடன், 35% வரம்பு, 60 மாதங்கள், 12% வட்டி மற்றும் 2% உயர்வு ஆகியவற்றில் புதிய தவணை ரூ. 50,000 ஆக வரையறுக்கப்படுகிறது.",
      result: "12% வீதத்தில் மதிப்பிடப்பட்ட அதிகபட்சக் கடன் ரூ. 2,247,751.92; 14% வீதத்தில் ரூ. 2,148,850.82. உயர்ந்த வட்டி நிலைமையில் குறைவு ரூ. 98,901.10.",
      fixture: { input: { monthlyIncome: 200000, monthlyLivingExpenses: 80000, existingMonthlyDebtPayments: 20000, affordabilityRatioPercent: 35, loanTermMonths: 60, annualRatePercent: 12, stressRatePremiumPercent: 2 }, expectedResult: { verdict: "debt-ratio-limited", affordableNewPayment: "50000.00", maxLoanAtEnteredRate: "2247751.92", maxLoanAtStressedRate: "2148850.82", stressImpact: "-98901.10" } },
    },
    assumptions: ["அனைத்து வருமானம், செலவு, கடன் மற்றும் வட்டி மதிப்புகளும் பயனரால் உள்ளிடப்படுகின்றன.", "கடன்-வருமான வரம்பு தனிப்பட்ட அனுமானம்; சட்டபூர்வ அல்லது எல்லா கடன் வழங்குநர்களுக்கும் பொதுவான விதி அல்ல.", "முழுக் காலத்திலும் நிலையான வட்டியும் சமமான மாதத் தவணைகளும் பயன்படுத்தப்படுகின்றன."],
    exclusions: ["கடன் மதிப்பெண், பிணை, கடன் வழங்குநரின் மதிப்பாய்வு மற்றும் வருமானத் தகுதி விதிகள்", "கட்டணங்கள், காப்புறுதி, வரிகள், முன்கூட்டிய கொடுப்பனவுகள் மற்றும் தனிப்பட்ட முழுமையாக்கம்", "கடன் அனுமதி, கடன் விலை முன்மொழிவு அல்லது நிதி ஆலோசனை"],
    commonMistakes: ["நம்பகமான கையிருப்பு வருமானத்திற்குப் பதிலாக மொத்தச் சம்பளத்தை உள்ளிடுதல்", "கடனட்டை குறைந்தபட்சக் கொடுப்பனவுகள் அல்லது பிற திட்டமிட்ட கடன்களைத் தவிர்த்தல்", "தேர்ந்தெடுத்த கடன் வரம்பைக் கடன் வழங்குநரின் உறுதியான கொள்கையாகக் கருதுதல்"],
    faqs: [
      { question: "வங்கி அனுமதிக்கும் கடன் தொகையை இது காட்டுமா?", answer: "இல்லை. வங்கிகளும் நிதி நிறுவனங்களும் தமது வருமான வரையறைகள், கடன் சோதனைகள், பிணை, விகிதங்கள் மற்றும் மதிப்பாய்வு விதிகளைப் பயன்படுத்துகின்றன." },
      { question: "உயர்ந்த வட்டி நிலையில் கடன் தொகை ஏன் குறைகிறது?", answer: "செலுத்தக்கூடிய மாதத் தவணை மாறாமல் வட்டி மட்டும் உயர்கிறது. தவணையின் அதிக பகுதி வட்டிக்குச் செல்வதால் அதே தவணை குறைந்த முதல்தொகையையே ஆதரிக்கும்." },
      { question: "எந்தக் கடன்-வருமான வரம்பைப் பயன்படுத்த வேண்டும்?", answer: "உங்கள் வரவு செலவுத் திட்டத்திற்கும் பரிசீலிக்கும் கடன் வழங்குநருக்கும் ஏற்ற எச்சரிக்கையான மதிப்பைப் பயன்படுத்துங்கள். இந்தக் கணிப்பான் பொதுவான சட்டபூர்வ சதவீதத்தை நிர்ணயிக்காது." },
    ],
    relatedCalculatorKeys: ["loan-emi", "compound-interest"],
    reviewedAt: "2026-08-15",
    reviewedBy: "LankaCalc கடன் பெறும் திறன் வேட்பாளர் விவரக்குறிப்பு",
  },
};

const compoundInterestContent: Record<Locale, CalculatorContent> = {
  en: {
    directAnswer: "Compound interest adds each period's interest to the balance, so later interest is earned on both the original principal and earlier interest. This calculator projects a final amount and total interest using a fixed nominal annual rate, duration, and annual, quarterly, monthly, or daily compounding.",
    instructions: ["Enter the starting principal in Sri Lankan rupees.", "Enter the nominal annual interest rate and investment duration.", "Select how often interest compounds, then calculate the projection."],
    formula: {
      expression: "A = P x (1 + r / n)^(n x t)",
      explanation: "The nominal annual rate is divided by the number of compounding periods per year. Interest is reinvested after every period, and total interest equals the final amount minus principal.",
      variables: [{ symbol: "A", meaning: "final amount" }, { symbol: "P", meaning: "starting principal" }, { symbol: "r", meaning: "annual rate as a decimal" }, { symbol: "n", meaning: "compounding periods per year" }, { symbol: "t", meaning: "duration in years" }],
    },
    workedExample: {
      title: "Example: LKR 100,000 for one year at 10%, compounded monthly",
      input: "For LKR 100,000 at a 10% nominal annual rate compounded 12 times over one year, the monthly periodic rate is 10% / 12.",
      result: "The projected final amount is LKR 110,471.31 and the interest earned is LKR 10,471.31.",
      fixture: { input: { principal: 100000, annualRatePercent: 10, years: 1, compoundsPerYear: 12 }, expectedResult: { finalAmount: "110471.31", totalInterest: "10471.31" } },
    },
    assumptions: ["The nominal rate and compounding frequency remain fixed.", "All interest is reinvested for the full duration.", "LKR is only the display denomination; no currency conversion occurs."],
    exclusions: ["Taxes, fees, inflation, deposits, and withdrawals", "Institution-specific posting dates and day-count conventions", "A guaranteed or quoted investment return"],
    commonMistakes: ["Confusing a nominal annual rate with an effective annual rate", "Selecting monthly compounding when the product compounds annually", "Ignoring taxes, fees, inflation, or additional deposits when comparing outcomes"],
    faqs: [
      { question: "Does more frequent compounding increase the final amount?", answer: "At the same nominal annual rate, more frequent compounding usually produces a slightly higher final amount because interest is added to the balance sooner." },
      { question: "Is the entered rate an effective annual rate?", answer: "No. The calculator treats it as a nominal annual rate and divides it by the selected compounding frequency." },
      { question: "Can I include regular deposits or withdrawals?", answer: "No. This version projects one starting principal without additional deposits or withdrawals." },
    ],
    relatedCalculatorKeys: ["loan-emi", "loan-affordability"],
    reviewedAt: "2026-08-14",
    reviewedBy: "LankaCalc calculation specification",
  },
  si: {
    directAnswer: "චක්‍රවර්ධී පොලියේදී සෑම කාලයකම පොලිය ශේෂයට එකතු වන නිසා පසුව මූලික මුදලටත් පෙර ලැබුණු පොලියටත් පොලිය ලැබේ. මෙම ගණකය ස්ථාවර නාමික වාර්ෂික අනුපාතයක්, කාලයක් සහ වාර්ෂික, ත්‍රෛමාසික, මාසික හෝ දෛනික පොලී එකතු කිරීමක් භාවිත කර අවසාන මුදල සහ මුළු පොලිය පෙන්වයි.",
    instructions: ["ආරම්භක මූලික මුදල ශ්‍රී ලංකා රුපියල්වලින් ඇතුළත් කරන්න.", "නාමික වාර්ෂික පොලී අනුපාතය සහ ආයෝජන කාලය ඇතුළත් කරන්න.", "පොලිය එකතු වන වාර ගණන තෝරා ප්‍රතිඵලය ගණනය කරන්න."],
    formula: {
      expression: "A = P x (1 + r / n)^(n x t)",
      explanation: "නාමික වාර්ෂික අනුපාතය වසරකට පොලිය එකතු වන වාර ගණනින් බෙදයි. සෑම වාරයකම පොලිය නැවත ආයෝජනය කරන අතර මුළු පොලිය අවසාන මුදලෙන් මූලික මුදල අඩු කළ අගයයි.",
      variables: [{ symbol: "A", meaning: "අවසාන මුදල" }, { symbol: "P", meaning: "ආරම්භක මූලික මුදල" }, { symbol: "r", meaning: "දශමයක් ලෙස වාර්ෂික අනුපාතය" }, { symbol: "n", meaning: "වසරකට පොලිය එකතු වන වාර ගණන" }, { symbol: "t", meaning: "අවුරුදුවලින් කාලය" }],
    },
    workedExample: {
      title: "උදාහරණය: රු. 100,000ක් වසරකට 10% පොලියට මාසිකව එකතු කිරීම",
      input: "රු. 100,000ක්, 10% නාමික වාර්ෂික අනුපාතයක් සහ වසරක් තුළ පොලිය 12 වරක් එකතු වන විට මාසික අනුපාතය 10% / 12 වේ.",
      result: "අවසාන මුදල රු. 110,471.31ක් සහ ලැබුණු පොලිය රු. 10,471.31ක් ලෙස ඇස්තමේන්තු වේ.",
      fixture: { input: { principal: 100000, annualRatePercent: 10, years: 1, compoundsPerYear: 12 }, expectedResult: { finalAmount: "110471.31", totalInterest: "10471.31" } },
    },
    assumptions: ["නාමික අනුපාතය සහ පොලිය එකතු වන වාර ගණන ස්ථාවරව පවතී.", "මුළු කාලය පුරා සියලු පොලිය නැවත ආයෝජනය කරයි.", "LKR පෙන්වීමේ මුදල් ඒකකය පමණි; මුදල් පරිවර්තනයක් සිදු නොවේ."],
    exclusions: ["බදු, ගාස්තු, උද්ධමනය, අමතර තැන්පතු සහ මුදල් ආපසු ගැනීම්", "ආයතනයට විශේෂිත බැර කරන දිනයන් සහ දින ගණන් ක්‍රම", "සහතික කළ හෝ උපුටා දුන් ආයෝජන ප්‍රතිලාභයක්"],
    commonMistakes: ["නාමික වාර්ෂික අනුපාතය ඵලදායී වාර්ෂික අනුපාතය සමඟ පටලවා ගැනීම", "නිෂ්පාදනය වාර්ෂිකව පොලිය එකතු කරන විට මාසික වාරය තේරීම", "ප්‍රතිඵල සසඳන විට බදු, ගාස්තු, උද්ධමනය හෝ අමතර තැන්පතු නොසලකා හැරීම"],
    faqs: [
      { question: "නිතර පොලිය එකතු කිරීමෙන් අවසාන මුදල වැඩි වේද?", answer: "එකම නාමික වාර්ෂික අනුපාතයකදී පොලිය ඉක්මනින් ශේෂයට එකතු වන නිසා නිතර එකතු කිරීම සාමාන්‍යයෙන් සුළු වශයෙන් වැඩි අවසාන මුදලක් ලබා දෙයි." },
      { question: "ඇතුළත් කරන අනුපාතය ඵලදායී වාර්ෂික අනුපාතයක්ද?", answer: "නැත. ගණකය එය නාමික වාර්ෂික අනුපාතයක් ලෙස සලකා තෝරාගත් වාර ගණනින් බෙදයි." },
      { question: "නිතිපතා තැන්පතු හෝ මුදල් ආපසු ගැනීම් ඇතුළත් කළ හැකිද?", answer: "නැත. මෙම අනුවාදය අමතර තැන්පතු හෝ මුදල් ආපසු ගැනීම් නොමැති එක් ආරම්භක මුදලක් පමණක් ගණනය කරයි." },
    ],
    relatedCalculatorKeys: ["loan-emi", "loan-affordability"],
    reviewedAt: "2026-08-14",
    reviewedBy: "LankaCalc ගණනය කිරීමේ පිරිවිතරය",
  },
  ta: {
    directAnswer: "கூட்டு வட்டியில் ஒவ்வொரு காலத்தின் வட்டியும் இருப்புடன் சேர்க்கப்படுவதால், பின்னர் ஆரம்ப முதல்தொகைக்கும் ஏற்கனவே கிடைத்த வட்டிக்கும் வட்டி கிடைக்கும். இந்தக் கணிப்பான் நிலையான பெயரளவு ஆண்டு வீதம், காலம் மற்றும் ஆண்டு, காலாண்டு, மாத அல்லது தினசரி கூட்டு வட்டி இடைவெளியைப் பயன்படுத்தி இறுதித் தொகையையும் மொத்த வட்டியையும் மதிப்பிடுகிறது.",
    instructions: ["ஆரம்ப முதல்தொகையை இலங்கை ரூபாயில் உள்ளிடுங்கள்.", "பெயரளவு ஆண்டு வட்டி வீதத்தையும் முதலீட்டுக் காலத்தையும் உள்ளிடுங்கள்.", "வட்டி கூட்டப்படும் இடைவெளியைத் தேர்ந்தெடுத்து முடிவைக் கணக்கிடுங்கள்."],
    formula: {
      expression: "A = P x (1 + r / n)^(n x t)",
      explanation: "பெயரளவு ஆண்டு வீதம் ஆண்டுக்கு வட்டி கூட்டப்படும் எண்ணிக்கையால் பிரிக்கப்படுகிறது. ஒவ்வொரு காலத்திற்குப் பின்னரும் வட்டி மீண்டும் முதலீடு செய்யப்படும்; மொத்த வட்டி என்பது இறுதித் தொகையிலிருந்து முதல்தொகையைக் கழித்த மதிப்பு.",
      variables: [{ symbol: "A", meaning: "இறுதித் தொகை" }, { symbol: "P", meaning: "ஆரம்ப முதல்தொகை" }, { symbol: "r", meaning: "தசமமாக ஆண்டு வீதம்" }, { symbol: "n", meaning: "ஆண்டுக்கு வட்டி கூட்டப்படும் தடவைகள்" }, { symbol: "t", meaning: "ஆண்டுகளில் காலம்" }],
    },
    workedExample: {
      title: "உதாரணம்: ரூ. 100,000, ஒரு ஆண்டு, 10%, மாதாந்தக் கூட்டு வட்டி",
      input: "ரூ. 100,000 முதல்தொகை, 10% பெயரளவு ஆண்டு வீதம் மற்றும் ஓராண்டில் 12 தடவை வட்டி கூட்டப்படும்போது மாத வீதம் 10% / 12 ஆகும்.",
      result: "மதிப்பிடப்பட்ட இறுதித் தொகை ரூ. 110,471.31; கிடைத்த வட்டி ரூ. 10,471.31.",
      fixture: { input: { principal: 100000, annualRatePercent: 10, years: 1, compoundsPerYear: 12 }, expectedResult: { finalAmount: "110471.31", totalInterest: "10471.31" } },
    },
    assumptions: ["பெயரளவு வீதமும் கூட்டு வட்டி இடைவெளியும் மாறாது.", "முழுக் காலத்திலும் கிடைக்கும் வட்டி மீண்டும் முதலீடு செய்யப்படும்.", "LKR காட்சிக்கான நாணயம் மட்டுமே; நாணய மாற்றம் செய்யப்படாது."],
    exclusions: ["வரிகள், கட்டணங்கள், பணவீக்கம், மேலதிக வைப்புகள் மற்றும் பணம் மீளப்பெறுதல்", "நிறுவனத்திற்குரிய பதிவு தேதிகளும் நாள் கணக்கு முறைகளும்", "உத்தரவாதம் அளிக்கப்பட்ட அல்லது மேற்கோள் காட்டப்பட்ட முதலீட்டு வருமானம்"],
    commonMistakes: ["பெயரளவு ஆண்டு வீதத்தையும் பயனுறு ஆண்டு வீதத்தையும் குழப்புதல்", "தயாரிப்பு ஆண்டுதோறும் வட்டி கூட்டும்போது மாதாந்த இடைவெளியைத் தேர்ந்தெடுத்தல்", "முடிவுகளை ஒப்பிடும்போது வரி, கட்டணம், பணவீக்கம் அல்லது மேலதிக வைப்புகளைத் தவிர்த்தல்"],
    faqs: [
      { question: "அடிக்கடி வட்டி கூட்டப்படுவது இறுதித் தொகையை அதிகரிக்குமா?", answer: "ஒரே பெயரளவு ஆண்டு வீதத்தில் வட்டி விரைவாக இருப்புடன் சேர்வதால், அடிக்கடி கூட்டப்படுவது பொதுவாகச் சற்றே அதிக இறுதித் தொகையை அளிக்கும்." },
      { question: "உள்ளிடும் வீதம் பயனுறு ஆண்டு வீதமா?", answer: "இல்லை. கணிப்பான் அதை பெயரளவு ஆண்டு வீதமாகக் கருதி தேர்ந்தெடுத்த கூட்டு வட்டி இடைவெளியால் பிரிக்கிறது." },
      { question: "வழக்கமான வைப்புகள் அல்லது பணம் மீளப்பெறுதலைச் சேர்க்கலாமா?", answer: "இல்லை. இந்தப் பதிப்பு மேலதிக வைப்புகள் அல்லது பணம் மீளப்பெறுதல் இல்லாத ஓர் ஆரம்ப முதல்தொகையை மட்டும் கணிக்கிறது." },
    ],
    relatedCalculatorKeys: ["loan-emi", "loan-affordability"],
    reviewedAt: "2026-08-14",
    reviewedBy: "LankaCalc கணக்கீட்டு விவரக்குறிப்பு",
  },
};

const contentByCalculator = {
  "compound-interest": compoundInterestContent,
  "loan-affordability": loanAffordabilityContent,
  "loan-emi": loanEmiContent,
} satisfies Record<string, Record<Locale, CalculatorContent>>;

export function getCalculatorContent(key: string, locale: Locale): CalculatorContent | undefined {
  return contentByCalculator[key as keyof typeof contentByCalculator]?.[locale];
}

export function getCalculatorContentKeys(): string[] {
  return Object.keys(contentByCalculator);
}
