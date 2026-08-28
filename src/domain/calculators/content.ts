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

const tileQuantityContent: Record<Locale, CalculatorContent> = {
  en: {
    directAnswer: "The tile quantity calculator estimates the whole number of tiles needed for a rectangular floor or wall area. It accounts for the entered tile dimensions, a uniform joint, and a wastage percentage, rounding both the base count and final count upward. It is an arithmetic estimate, not a layout, engineering, or purchasing specification.",
    instructions: ["Enter the rectangular area's length and width and select their unit.", "Enter each tile's length and width in millimetres and the uniform joint width.", "Enter a wastage percentage, then calculate the estimated whole-tile counts."],
    formula: {
      expression: "T = ceil(ceil(A / ((L + J) x (W + J))) x (1 + R / 100))",
      explanation: "The area dimensions are converted to metres. Tile dimensions and the joint are converted from millimetres to metres. The base count is rounded up before the wastage percentage is applied, and the final count is rounded up again.",
      variables: [{ symbol: "T", meaning: "tiles after wastage" }, { symbol: "A", meaning: "rectangular area in square metres" }, { symbol: "L", meaning: "tile length in metres" }, { symbol: "W", meaning: "tile width in metres" }, { symbol: "J", meaning: "uniform joint width in metres" }, { symbol: "R", meaning: "wastage percentage" }],
    },
    workedExample: {
      title: "Example: 4 m by 3 m area with 600 mm square tiles",
      input: "For a 4 m by 3 m rectangular area, 600 mm by 600 mm tiles, no joint, and no wastage, the floor area is 12.000 m2.",
      result: "Dividing 12 m2 by 0.36 m2 per tile gives 33.33, which rounds up to 34 tiles before wastage and 34 tiles after wastage.",
      fixture: { input: { length: 4, width: 3, unit: "metre", tileLength: 600, tileWidth: 600, jointMillimetres: 0, wastagePercent: 0 }, expectedResult: { floorArea: "12.000", tilesBeforeWastage: 34, tilesAfterWastage: 34 } },
    },
    assumptions: ["The area is a flush rectangle measured using one selected unit.", "Tiles are laid edge to edge with the same joint width on all four sides.", "The entered wastage percentage is applied after the base tile count is rounded up."],
    exclusions: ["Borders, diagonal layouts, patterns, thresholds, openings, and fixture cut-outs", "Tile thickness, substrate, adhesive, grout, labour, prices, and pack sizes", "Structural, engineering, layout, installation, or procurement advice"],
    commonMistakes: ["Entering tile dimensions in centimetres instead of millimetres", "Using room dimensions in a unit different from the selected unit", "Assuming the estimate includes extra tiles required by a patterned or diagonal layout"],
    faqs: [
      { question: "Why is the tile count rounded up twice?", answer: "A fraction of a tile in the base calculation requires a whole tile. The wastage percentage is then applied to that whole base count, and any final fraction is also rounded up." },
      { question: "Does the joint width reduce the estimated tile count?", answer: "A larger entered joint increases the effective length and width assigned to each tile, so the arithmetic estimate can decrease. The calculator assumes a uniform joint throughout." },
      { question: "Does this tell me exactly how many tiles to buy?", answer: "No. Cuts, breakage, batch matching, patterns, pack sizes, and site conditions can change actual needs. The result is only a rectangular-area estimate." },
    ],
    relatedCalculatorKeys: ["paint", "concrete"],
    reviewedAt: "2026-08-28",
    reviewedBy: "LankaCalc tile quantity calculator specification",
  },
  si: {
    directAnswer: "ටයිල් ප්‍රමාණ ගණකය සෘජුකෝණාස්‍රාකාර බිමකට හෝ බිත්තියකට අවශ්‍ය සම්පූර්ණ ටයිල් ගණන ඇස්තමේන්තු කරයි. ඇතුළත් කළ ටයිල් මාන, ඒකාකාර සන්ධි පළල සහ අපතේ යාමේ ප්‍රතිශතය සලකා මූලික ගණනත් අවසාන ගණනත් ඉහළ සම්පූර්ණ අගයට වටයයි. මෙය සැලසුම්, ඉංජිනේරු හෝ මිලදී ගැනීමේ පිරිවිතරයක් නොව ගණිතමය ඇස්තමේන්තුවකි.",
    instructions: ["සෘජුකෝණාස්‍රාකාර ප්‍රදේශයේ දිග හා පළල ඇතුළත් කර ඒවායේ ඒකකය තෝරන්න.", "එක් ටයිලයක දිග හා පළල මිලිමීටරවලින් සහ ඒකාකාර සන්ධි පළල ඇතුළත් කරන්න.", "අපතේ යාමේ ප්‍රතිශතය ඇතුළත් කර සම්පූර්ණ ටයිල් ගණන් ගණනය කරන්න."],
    formula: {
      expression: "T = ceil(ceil(A / ((L + J) x (W + J))) x (1 + R / 100))",
      explanation: "ප්‍රදේශයේ මාන මීටරවලටත් ටයිල් මාන සහ සන්ධිය මිලිමීටරවලින් මීටරවලටත් පරිවර්තනය කරයි. අපතේ යාමේ ප්‍රතිශතය යෙදීමට පෙර මූලික ගණන ඉහළට වටයා, අවසාන ගණන නැවත ඉහළට වටයයි.",
      variables: [{ symbol: "T", meaning: "අපතේ යාම ඇතුළත් ටයිල් ගණන" }, { symbol: "A", meaning: "වර්ග මීටරවලින් සෘජුකෝණාස්‍ර ප්‍රදේශය" }, { symbol: "L", meaning: "මීටරවලින් ටයිල් දිග" }, { symbol: "W", meaning: "මීටරවලින් ටයිල් පළල" }, { symbol: "J", meaning: "මීටරවලින් ඒකාකාර සන්ධි පළල" }, { symbol: "R", meaning: "අපතේ යාමේ ප්‍රතිශතය" }],
    },
    workedExample: {
      title: "උදාහරණය: මීටර් 4 x 3 ප්‍රදේශයක් සහ මි.මී. 600 හතරැස් ටයිල්",
      input: "මීටර් 4 x 3 ප්‍රදේශයක්, මි.මී. 600 x 600 ටයිල්, ශූන්‍ය සන්ධියක් සහ ශූන්‍ය අපතේ යාමක් සඳහා බිම් ප්‍රදේශය වර්ග මීටර් 12.000කි.",
      result: "වර්ග මීටර් 12 එක් ටයිලයක වර්ග මීටර් 0.36න් බෙදූ විට 33.33 ලැබෙන අතර එය අපතේ යාමට පෙර ටයිල් 34කටත් පසුව ටයිල් 34කටත් වටයයි.",
      fixture: { input: { length: 4, width: 3, unit: "metre", tileLength: 600, tileWidth: 600, jointMillimetres: 0, wastagePercent: 0 }, expectedResult: { floorArea: "12.000", tilesBeforeWastage: 34, tilesAfterWastage: 34 } },
    },
    assumptions: ["ප්‍රදේශය එක් තෝරාගත් ඒකකයකින් මනින ලද සෘජුකෝණාස්‍රයකි.", "සෑම ටයිලයකම පැති හතරට එකම සන්ධි පළලක් සහිතව ටයිල් අතුරයි.", "මූලික ටයිල් ගණන ඉහළට වටයා පසුව අපතේ යාමේ ප්‍රතිශතය යොදයි."],
    exclusions: ["මායිම්, විකර්ණ රටා, වෙනත් රටා, දොර එළිපත්, විවර සහ සවිකිරීම් කැපුම්", "ටයිල් ඝනකම, යටි පෘෂ්ඨය, ඇලවුම් ද්‍රව්‍ය, සන්ධි ද්‍රව්‍ය, ශ්‍රමය, මිල සහ ඇසුරුම් ප්‍රමාණ", "ව්‍යුහාත්මක, ඉංජිනේරු, අතුරන සැලසුම්, ස්ථාපන හෝ මිලදී ගැනීමේ උපදෙස්"],
    commonMistakes: ["ටයිල් මාන මිලිමීටර වෙනුවට සෙන්ටිමීටරවලින් ඇතුළත් කිරීම", "කාමර මාන තෝරාගත් ඒකකයට වෙනස් ඒකකයකින් ඇතුළත් කිරීම", "රටා සහිත හෝ විකර්ණ අතුරීමකට අවශ්‍ය අමතර ටයිල් ඇස්තමේන්තුවට ඇතුළත් යැයි සිතීම"],
    faqs: [
      { question: "ටයිල් ගණන දෙවරක් ඉහළට වටයන්නේ ඇයි?", answer: "මූලික ගණනයේ ටයිලයක කොටසක් ලැබුණත් සම්පූර්ණ ටයිලයක් අවශ්‍ය වේ. එම සම්පූර්ණ මූලික ගණනට අපතේ යාම යොදා අවසාන කොටසද ඉහළට වටයයි." },
      { question: "සන්ධි පළල වැඩි කළ විට ඇස්තමේන්තු ගණන අඩු වේද?", answer: "වැඩි සන්ධියක් එක් ටයිලයකට අදාළ ඵලදායී දිග හා පළල වැඩි කරන නිසා ගණිතමය ඇස්තමේන්තුව අඩු විය හැක. ගණකය මුළු ප්‍රදේශයටම ඒකාකාර සන්ධියක් උපකල්පනය කරයි." },
      { question: "මිලදී ගත යුතු නිශ්චිත ටයිල් ගණන මෙය පෙන්වයිද?", answer: "නැත. කැපුම්, බිඳීම්, වර්ණ කාණ්ඩ ගැළපීම, රටා, ඇසුරුම් ප්‍රමාණ සහ ස්ථාන තත්ත්ව සැබෑ අවශ්‍යතාව වෙනස් කළ හැක. මෙය සෘජුකෝණාස්‍ර ප්‍රදේශයක ඇස්තමේන්තුවක් පමණි." },
    ],
    relatedCalculatorKeys: ["paint", "concrete"],
    reviewedAt: "2026-08-28",
    reviewedBy: "LankaCalc ටයිල් ප්‍රමාණ ගණක පිරිවිතරය",
  },
  ta: {
    directAnswer: "ஓடு அளவுக் கணிப்பான் ஒரு செவ்வகத் தரை அல்லது சுவருக்குத் தேவையான முழு ஓடுகளின் எண்ணிக்கையை மதிப்பிடுகிறது. உள்ளிட்ட ஓட்டு அளவுகள், சீரான இணைப்பு அகலம் மற்றும் கழிவுச் சதவீதத்தைக் கொண்டு அடிப்படை எண்ணிக்கையையும் இறுதி எண்ணிக்கையையும் மேலுள்ள முழு எண்ணாகச் சுற்றுகிறது. இது அமைப்பு, பொறியியல் அல்லது கொள்முதல் விவரக்குறிப்பு அல்ல; ஓர் எண்கணித மதிப்பீடு மட்டுமே.",
    instructions: ["செவ்வகப் பகுதியின் நீளத்தையும் அகலத்தையும் உள்ளிட்டு அவற்றின் அலகைத் தேர்ந்தெடுங்கள்.", "ஒவ்வோர் ஓட்டின் நீளத்தையும் அகலத்தையும் மில்லிமீட்டரில், சீரான இணைப்பு அகலத்துடன் உள்ளிடுங்கள்.", "கழிவுச் சதவீதத்தை உள்ளிட்டு மதிப்பிடப்பட்ட முழு ஓட்டு எண்ணிக்கைகளைக் கணக்கிடுங்கள்."],
    formula: {
      expression: "T = ceil(ceil(A / ((L + J) x (W + J))) x (1 + R / 100))",
      explanation: "பகுதியின் அளவுகள் மீட்டருக்கும், ஓட்டு அளவுகளும் இணைப்பும் மில்லிமீட்டரிலிருந்து மீட்டருக்கும் மாற்றப்படுகின்றன. கழிவுச் சதவீதம் பயன்படுத்தப்படுமுன் அடிப்படை எண்ணிக்கை மேலே சுற்றப்பட்டு, இறுதி எண்ணிக்கையும் மீண்டும் மேலே சுற்றப்படுகிறது.",
      variables: [{ symbol: "T", meaning: "கழிவுக்குப் பிந்தைய ஓட்டு எண்ணிக்கை" }, { symbol: "A", meaning: "சதுர மீட்டரில் செவ்வகப் பரப்பளவு" }, { symbol: "L", meaning: "மீட்டரில் ஓட்டு நீளம்" }, { symbol: "W", meaning: "மீட்டரில் ஓட்டு அகலம்" }, { symbol: "J", meaning: "மீட்டரில் சீரான இணைப்பு அகலம்" }, { symbol: "R", meaning: "கழிவுச் சதவீதம்" }],
    },
    workedExample: {
      title: "உதாரணம்: 4 மீ x 3 மீ பகுதியும் 600 மிமீ சதுர ஓடுகளும்",
      input: "4 மீ x 3 மீ செவ்வகப் பகுதி, 600 மிமீ x 600 மிமீ ஓடுகள், இணைப்பு மற்றும் கழிவு இரண்டும் பூச்சியம் எனில் தரைப் பரப்பளவு 12.000 சதுர மீட்டர்.",
      result: "12 சதுர மீட்டரை ஓர் ஓட்டின் 0.36 சதுர மீட்டரால் வகுத்தால் 33.33 கிடைக்கிறது; இது கழிவுக்கு முன் 34 ஓடுகளாகவும் கழிவுக்குப் பின் 34 ஓடுகளாகவும் மேலே சுற்றப்படுகிறது.",
      fixture: { input: { length: 4, width: 3, unit: "metre", tileLength: 600, tileWidth: 600, jointMillimetres: 0, wastagePercent: 0 }, expectedResult: { floorArea: "12.000", tilesBeforeWastage: 34, tilesAfterWastage: 34 } },
    },
    assumptions: ["பகுதி ஒரே தேர்ந்தெடுத்த அலகில் அளக்கப்பட்ட செவ்வகம்.", "ஒவ்வோர் ஓட்டின் நான்கு பக்கங்களிலும் ஒரே இணைப்பு அகலத்துடன் ஓடுகள் அமைக்கப்படுகின்றன.", "அடிப்படை ஓட்டு எண்ணிக்கை மேலே சுற்றப்பட்ட பின்னரே கழிவுச் சதவீதம் பயன்படுத்தப்படுகிறது."],
    exclusions: ["எல்லைகள், குறுக்கு அமைப்புகள், வடிவங்கள், வாசற்படிகள், திறப்புகள் மற்றும் பொருத்துக் கருவி வெட்டுகள்", "ஓட்டு தடிமன், அடித்தளம், பசை, இணைப்புப் பொருள், உழைப்பு, விலை மற்றும் பொதியளவுகள்", "கட்டமைப்பு, பொறியியல், அமைப்பு, நிறுவல் அல்லது கொள்முதல் ஆலோசனை"],
    commonMistakes: ["ஓட்டு அளவுகளை மில்லிமீட்டருக்குப் பதிலாக சென்டிமீட்டரில் உள்ளிடுதல்", "தேர்ந்தெடுத்த அலகிலிருந்து மாறுபட்ட அலகில் அறை அளவுகளை உள்ளிடுதல்", "வடிவ அல்லது குறுக்கு அமைப்புக்கான மேலதிக ஓடுகள் மதிப்பீட்டில் உள்ளதாகக் கருதுதல்"],
    faqs: [
      { question: "ஓட்டு எண்ணிக்கை ஏன் இருமுறை மேலே சுற்றப்படுகிறது?", answer: "அடிப்படைக் கணக்கில் ஓட்டின் ஒரு பகுதி கிடைத்தாலும் முழு ஓடு தேவை. அந்த முழு அடிப்படை எண்ணிக்கைக்கு கழிவு பயன்படுத்தப்பட்டு இறுதிப் பகுதியும் மேலே சுற்றப்படுகிறது." },
      { question: "இணைப்பு அகலம் மதிப்பிடப்பட்ட ஓட்டு எண்ணிக்கையைக் குறைக்குமா?", answer: "பெரிய இணைப்பு ஒவ்வோர் ஓட்டுக்கும் ஒதுக்கப்படும் பயனுறு நீளத்தையும் அகலத்தையும் அதிகரிப்பதால் எண்கணித மதிப்பீடு குறையலாம். கணிப்பான் முழுவதும் சீரான இணைப்பைக் கருதுகிறது." },
      { question: "வாங்க வேண்டிய துல்லியமான ஓட்டு எண்ணிக்கையை இது கூறுமா?", answer: "இல்லை. வெட்டுகள், உடைதல், தொகுதி நிறப் பொருத்தம், வடிவங்கள், பொதியளவுகள் மற்றும் தளநிலை உண்மையான தேவையை மாற்றலாம். இது செவ்வகப் பகுதியின் மதிப்பீடு மட்டுமே." },
    ],
    relatedCalculatorKeys: ["paint", "concrete"],
    reviewedAt: "2026-08-28",
    reviewedBy: "LankaCalc ஓடு அளவுக் கணிப்பான் விவரக்குறிப்பு",
  },
};

const paintContent: Record<Locale, CalculatorContent> = {
  en: {
    directAnswer: "The paint quantity calculator estimates whole litres for an entered surface area, number of coats, coverage per litre, and wastage percentage. It converts square feet when selected, calculates the litres before wastage, applies wastage, and rounds the quantity to buy upward to a whole litre. It is not a professional paint or purchasing specification.",
    instructions: ["Enter the surface area and select square metres or square feet.", "Enter the number of full coats and the paint coverage in square metres per litre.", "Enter a wastage percentage, then calculate the estimated litres."],
    formula: {
      expression: "B = ceil((A x C / V) x (1 + R / 100))",
      explanation: "The surface area is converted to square metres and multiplied by the number of coats. Dividing by coverage gives raw litres; wastage is applied to that unrounded value before the result is rounded up to a whole litre.",
      variables: [{ symbol: "B", meaning: "whole litres to buy" }, { symbol: "A", meaning: "surface area in square metres" }, { symbol: "C", meaning: "number of coats" }, { symbol: "V", meaning: "coverage in square metres per litre" }, { symbol: "R", meaning: "wastage percentage" }],
    },
    workedExample: {
      title: "Example: 40 m2, two coats, and 10 m2/L coverage",
      input: "For 40 m2, two coats, coverage of 10 m2/L, and 10% wastage, the total area to cover is 80 m2 and the exact paint need before wastage is 8.0 litres.",
      result: "After the 10% allowance, 8.8 litres rounds up to 9 whole litres to buy. The displayed difference from the exact pre-wastage amount is 1.0 litre.",
      fixture: { input: { surfaceArea: 40, unit: "square-metre", coats: 2, coveragePerLitre: 10, wastagePercent: 10 }, expectedResult: { surfaceAreaSquareMetres: "40", areaToCover: "80", exactLitres: "8.0", litresToBuy: 9, wastageLitres: "1.0" } },
    },
    assumptions: ["Every coat covers the full entered surface area.", "Coverage is a user-supplied flat rate; the 10 m2/L default represents smooth, primed masonry rather than a brand claim.", "Wastage and rounding to a whole litre cover cutting in, touch-ups, roller loss, and paint left in the container."],
    exclusions: ["Primer, undercoat, ceilings, trim, woodwork, and gloss unless their areas are entered separately", "Surface repairs, texture, porosity, colour changes, product instructions, prices, and container sizes", "Professional coating, application, or procurement advice"],
    commonMistakes: ["Entering wall length instead of the already calculated surface area", "Using a coverage figure for one coat while entering an area that already includes multiple coats", "Assuming the default coverage applies equally to rough, porous, or unprimed surfaces"],
    faqs: [
      { question: "Why does the calculator round up to a whole litre?", answer: "It applies wastage to the unrounded paint need and then rounds upward because the calculator reports a whole-litre quantity. Actual products may use different container sizes." },
      { question: "Should doors and windows be deducted?", answer: "The calculator uses exactly the surface area entered. Deduct or retain openings when measuring according to the estimate you want; it does not make that decision automatically." },
      { question: "Is 10 m2 per litre correct for every paint?", answer: "No. It is a general default for emulsion on smooth, primed masonry. Use the coverage stated for the chosen product and surface when available." },
    ],
    relatedCalculatorKeys: ["tile-quantity", "concrete"],
    reviewedAt: "2026-08-28",
    reviewedBy: "LankaCalc paint quantity calculator specification",
  },
  si: {
    directAnswer: "තීන්ත ප්‍රමාණ ගණකය ඇතුළත් කළ පෘෂ්ඨ වර්ගඵලය, ආලේපන වාර ගණන, ලීටරයක ආවරණය සහ අපතේ යාමේ ප්‍රතිශතය අනුව සම්පූර්ණ ලීටර් ගණන ඇස්තමේන්තු කරයි. වර්ග අඩි තෝරා ඇත්නම් ඒවා පරිවර්තනය කර, අපතේ යාමට පෙර ලීටර් ගණනය කර, අපතේ යාම යොදා අවසාන අගය සම්පූර්ණ ලීටරයට ඉහළට වටයයි. මෙය වෘත්තීය තීන්ත හෝ මිලදී ගැනීමේ පිරිවිතරයක් නොවේ.",
    instructions: ["පෘෂ්ඨ වර්ගඵලය ඇතුළත් කර වර්ග මීටර් හෝ වර්ග අඩි තෝරන්න.", "සම්පූර්ණ ආලේපන වාර ගණන සහ ලීටරයකට වර්ග මීටර්වලින් තීන්ත ආවරණය ඇතුළත් කරන්න.", "අපතේ යාමේ ප්‍රතිශතය ඇතුළත් කර ඇස්තමේන්තු ලීටර් ගණනය කරන්න."],
    formula: {
      expression: "B = ceil((A x C / V) x (1 + R / 100))",
      explanation: "පෘෂ්ඨ වර්ගඵලය වර්ග මීටරවලට පරිවර්තනය කර ආලේපන වාර ගණනින් ගුණ කරයි. ආවරණයෙන් බෙදා ලැබෙන නොවටයූ ලීටර් අගයට අපතේ යාම යොදා පසුව සම්පූර්ණ ලීටරයට ඉහළට වටයයි.",
      variables: [{ symbol: "B", meaning: "මිලදී ගැනීමට සම්පූර්ණ ලීටර්" }, { symbol: "A", meaning: "වර්ග මීටරවලින් පෘෂ්ඨ වර්ගඵලය" }, { symbol: "C", meaning: "ආලේපන වාර ගණන" }, { symbol: "V", meaning: "ලීටරයකට වර්ග මීටර්වලින් ආවරණය" }, { symbol: "R", meaning: "අපතේ යාමේ ප්‍රතිශතය" }],
    },
    workedExample: {
      title: "උදාහරණය: වර්ග මීටර් 40ක්, ආලේපන දෙකක් සහ වර්ග මීටර් 10/L ආවරණයක්",
      input: "වර්ග මීටර් 40ක්, ආලේපන දෙකක්, ලීටරයකට වර්ග මීටර් 10ක ආවරණයක් සහ 10% අපතේ යාමක් සඳහා මුළු ආවරණ ප්‍රදේශය වර්ග මීටර් 80ක් සහ අපතේ යාමට පෙර අවශ්‍ය තීන්ත ලීටර් 8.0කි.",
      result: "10% දීමනාවෙන් පසු ලීටර් 8.8 සම්පූර්ණ ලීටර් 9කට ඉහළට වටයයි. අපතේ යාමට පෙර නිශ්චිත අගය සමඟ පෙන්වන වෙනස ලීටර් 1.0කි.",
      fixture: { input: { surfaceArea: 40, unit: "square-metre", coats: 2, coveragePerLitre: 10, wastagePercent: 10 }, expectedResult: { surfaceAreaSquareMetres: "40", areaToCover: "80", exactLitres: "8.0", litresToBuy: 9, wastageLitres: "1.0" } },
    },
    assumptions: ["සෑම ආලේපනයක්ම ඇතුළත් කළ මුළු පෘෂ්ඨය ආවරණය කරයි.", "ආවරණය පරිශීලකයා දෙන ස්ථාවර අගයකි; පෙරනිමි 10 m2/L අගය සුමට, ප්‍රයිමර් යෙදූ ගඩොල් පෘෂ්ඨයකට සාමාන්‍ය අගයක් මිස වෙළඳ නාම ප්‍රකාශයක් නොවේ.", "අපතේ යාම සහ සම්පූර්ණ ලීටරයට වටයීම දාර තීන්ත කිරීම, නැවත ස්පර්ශ, රෝලර් අලාභ සහ බඳුනේ ඉතිරිවීම ආවරණය කරයි."],
    exclusions: ["වෙනම වර්ගඵල ඇතුළත් නොකළ ප්‍රයිමර්, යටි ආලේපන, සිවිලිම්, අලංකාර දාර, ලී වැඩ සහ දිලිසෙන ආලේපන", "පෘෂ්ඨ අලුත්වැඩියා, රළු බව, සිදුරු සහිත බව, වර්ණ වෙනස්කම්, නිෂ්පාදන උපදෙස්, මිල සහ බඳුන් ප්‍රමාණ", "වෘත්තීය ආලේපන, යෙදීම හෝ මිලදී ගැනීමේ උපදෙස්"],
    commonMistakes: ["දැනටමත් ගණනය කළ පෘෂ්ඨ වර්ගඵලය වෙනුවට බිත්තියේ දිග පමණක් ඇතුළත් කිරීම", "ආලේපන කිහිපයක් ඇතුළත් වර්ගඵලයක් සමඟ එක් ආලේපනයක ආවරණ අගයක් නැවත ගුණ කිරීම", "පෙරනිමි ආවරණය රළු, සිදුරු සහිත හෝ ප්‍රයිමර් නොයෙදූ පෘෂ්ඨවලටද සමාන යැයි සිතීම"],
    faqs: [
      { question: "ගණකය සම්පූර්ණ ලීටරයට ඉහළට වටයන්නේ ඇයි?", answer: "නොවටයූ තීන්ත අවශ්‍යතාවට අපතේ යාම යොදා ගණකය සම්පූර්ණ ලීටර් ගණනක් වාර්තා කරන නිසා ඉහළට වටයයි. සැබෑ නිෂ්පාදන වෙනත් බඳුන් ප්‍රමාණවල තිබිය හැක." },
      { question: "දොරවල් සහ ජනෙල් අඩු කළ යුතුද?", answer: "ගණකය ඔබ ඇතුළත් කරන පෘෂ්ඨ වර්ගඵලයම භාවිත කරයි. ඔබට අවශ්‍ය ඇස්තමේන්තුව අනුව මැනීමේදී විවර අඩු කිරීම හෝ තබා ගැනීම ඔබ තීරණය කළ යුතුය." },
      { question: "ලීටරයකට වර්ග මීටර් 10 සෑම තීන්තකටම නිවැරදිද?", answer: "නැත. එය සුමට, ප්‍රයිමර් යෙදූ ගඩොල් පෘෂ්ඨයක ඉමල්ෂන් සඳහා සාමාන්‍ය පෙරනිමියකි. හැකි විට තෝරාගත් නිෂ්පාදනය සහ පෘෂ්ඨය සඳහා සඳහන් ආවරණය භාවිත කරන්න." },
    ],
    relatedCalculatorKeys: ["tile-quantity", "concrete"],
    reviewedAt: "2026-08-28",
    reviewedBy: "LankaCalc තීන්ත ප්‍රමාණ ගණක පිරිවිතරය",
  },
  ta: {
    directAnswer: "வண்ணப்பூச்சு அளவுக் கணிப்பான் உள்ளிட்ட மேற்பரப்பு, பூச்சுகளின் எண்ணிக்கை, ஒரு லீட்டருக்கான பரவல் மற்றும் கழிவுச் சதவீதத்திலிருந்து முழு லீட்டர்களை மதிப்பிடுகிறது. சதுர அடியைத் தேர்ந்தெடுத்தால் அதை மாற்றி, கழிவுக்கு முந்தைய லீட்டரைக் கணக்கிட்டு, கழிவைச் சேர்த்து வாங்கும் அளவை முழு லீட்டராக மேலே சுற்றுகிறது. இது தொழில்முறை வண்ணப்பூச்சு அல்லது கொள்முதல் விவரக்குறிப்பு அல்ல.",
    instructions: ["மேற்பரப்பை உள்ளிட்டு சதுர மீட்டர் அல்லது சதுர அடியைத் தேர்ந்தெடுங்கள்.", "முழுப் பூச்சுகளின் எண்ணிக்கையையும் ஒரு லீட்டருக்கு சதுர மீட்டரில் வண்ணப்பூச்சின் பரவலையும் உள்ளிடுங்கள்.", "கழிவுச் சதவீதத்தை உள்ளிட்டு மதிப்பிடப்பட்ட லீட்டர்களைக் கணக்கிடுங்கள்."],
    formula: {
      expression: "B = ceil((A x C / V) x (1 + R / 100))",
      explanation: "மேற்பரப்பு சதுர மீட்டருக்கு மாற்றப்பட்டு பூச்சுகளின் எண்ணிக்கையால் பெருக்கப்படுகிறது. பரவலால் வகுத்துச் கிடைக்கும் சுற்றப்படாத லீட்டருக்குக் கழிவு பயன்படுத்தப்பட்ட பின்னர் முழு லீட்டராக மேலே சுற்றப்படுகிறது.",
      variables: [{ symbol: "B", meaning: "வாங்குவதற்கான முழு லீட்டர்கள்" }, { symbol: "A", meaning: "சதுர மீட்டரில் மேற்பரப்பு" }, { symbol: "C", meaning: "பூச்சுகளின் எண்ணிக்கை" }, { symbol: "V", meaning: "ஒரு லீட்டருக்கு சதுர மீட்டரில் பரவல்" }, { symbol: "R", meaning: "கழிவுச் சதவீதம்" }],
    },
    workedExample: {
      title: "உதாரணம்: 40 சதுர மீட்டர், இரண்டு பூச்சுகள், 10 m2/L பரவல்",
      input: "40 சதுர மீட்டர், இரண்டு பூச்சுகள், 10 m2/L பரவல் மற்றும் 10% கழிவு எனில் பூச வேண்டிய மொத்தப் பரப்பு 80 சதுர மீட்டர்; கழிவுக்கு முந்தைய துல்லியத் தேவை 8.0 லீட்டர்.",
      result: "10% ஒதுக்கீட்டுக்குப் பின் 8.8 லீட்டர், வாங்குவதற்கான 9 முழு லீட்டராக மேலே சுற்றப்படுகிறது. கழிவுக்கு முந்தைய துல்லிய அளவிலிருந்து காட்டப்படும் வேறுபாடு 1.0 லீட்டர்.",
      fixture: { input: { surfaceArea: 40, unit: "square-metre", coats: 2, coveragePerLitre: 10, wastagePercent: 10 }, expectedResult: { surfaceAreaSquareMetres: "40", areaToCover: "80", exactLitres: "8.0", litresToBuy: 9, wastageLitres: "1.0" } },
    },
    assumptions: ["ஒவ்வொரு பூச்சும் உள்ளிட்ட முழு மேற்பரப்பையும் மூடுகிறது.", "பரவல் பயனர் வழங்கும் நிலையான மதிப்பு; இயல்புநிலை 10 m2/L என்பது மிருதுவான, அடிப்பூச்சிட்ட கற்சுவருக்கான பொதுவான மதிப்பே தவிர வணிகக் குறி கூற்று அல்ல.", "கழிவும் முழு லீட்டராகச் சுற்றுவதும் ஓரப்பூச்சு, திருத்தம், உருளை இழப்பு மற்றும் கொள்கலனில் எஞ்சுவதை உள்ளடக்குகின்றன."],
    exclusions: ["தனியாகப் பரப்பை உள்ளிடாத அடிப்பூச்சு, கீழ்ப்பூச்சு, கூரை, விளிம்பு, மரவேலை மற்றும் மினுமினுப்புப் பூச்சு", "மேற்பரப்புத் திருத்தம், சொரசொரப்பு, நுண்துளை, நிறமாற்றம், தயாரிப்பு வழிமுறைகள், விலை மற்றும் கொள்கலன் அளவுகள்", "தொழில்முறை பூச்சு, பயன்படுத்தல் அல்லது கொள்முதல் ஆலோசனை"],
    commonMistakes: ["ஏற்கெனவே கணக்கிட்ட மேற்பரப்புக்குப் பதிலாக சுவரின் நீளத்தை மட்டும் உள்ளிடுதல்", "பல பூச்சுகளை ஏற்கெனவே கொண்ட பரப்புடன் ஒரு பூச்சின் பரவலை மீண்டும் பெருக்குதல்", "இயல்புநிலைப் பரவல் சொரசொரப்பான, நுண்துளை கொண்ட அல்லது அடிப்பூச்சிடாத மேற்பரப்புக்கும் பொருந்தும் எனக் கருதுதல்"],
    faqs: [
      { question: "கணிப்பான் ஏன் முழு லீட்டராக மேலே சுற்றுகிறது?", answer: "சுற்றப்படாத தேவைக்குக் கழிவைப் பயன்படுத்திய பின் கணிப்பான் முழு லீட்டர் அளவை அறிவிப்பதால் மேலே சுற்றுகிறது. உண்மையான தயாரிப்புகள் வேறு கொள்கலன் அளவுகளில் இருக்கலாம்." },
      { question: "கதவுகளையும் சாளரங்களையும் கழிக்க வேண்டுமா?", answer: "கணிப்பான் உள்ளிட்ட மேற்பரப்பை அப்படியே பயன்படுத்துகிறது. நீங்கள் விரும்பும் மதிப்பீட்டிற்கு ஏற்ப அளக்கும்போது திறப்புகளைக் கழிப்பதா வைத்திருப்பதா என்பதை நீங்களே தீர்மானிக்க வேண்டும்." },
      { question: "ஒரு லீட்டருக்கு 10 சதுர மீட்டர் எல்லா வண்ணப்பூச்சுக்கும் சரியா?", answer: "இல்லை. அது மிருதுவான, அடிப்பூச்சிட்ட கற்சுவரில் குழம்புப் பூச்சுக்கான பொதுவான இயல்புநிலை. கிடைக்கும்போது தேர்ந்தெடுத்த தயாரிப்புக்கும் மேற்பரப்புக்கும் குறிப்பிடப்பட்ட பரவலைப் பயன்படுத்துங்கள்." },
    ],
    relatedCalculatorKeys: ["tile-quantity", "concrete"],
    reviewedAt: "2026-08-28",
    reviewedBy: "LankaCalc வண்ணப்பூச்சு அளவுக் கணிப்பான் விவரக்குறிப்பு",
  },
};

const concreteContent: Record<Locale, CalculatorContent> = {
  en: {
    directAnswer: "The concrete quantity calculator estimates fresh concrete volume for a rectangular slab, footing, form, or excavation from its length, width, and depth. It converts all three dimensions from the selected unit to metres, calculates cubic metres, and adds the entered wastage percentage. It does not determine concrete mix, strength, structural dimensions, or an amount to purchase.",
    instructions: ["Enter the rectangular length, width, and depth or thickness.", "Select the single unit used for all three dimensions.", "Enter a wastage percentage, then calculate the base, wastage, and total volumes in cubic metres."],
    formula: {
      expression: "Q = L x W x D x (1 + R / 100)",
      explanation: "Length, width, and depth are converted to metres before multiplication. The wastage volume is the base cubic-metre volume multiplied by the entered percentage, and the total is serialized to up to four decimal places.",
      variables: [{ symbol: "Q", meaning: "total fresh concrete volume in cubic metres" }, { symbol: "L", meaning: "length in metres" }, { symbol: "W", meaning: "width in metres" }, { symbol: "D", meaning: "depth or thickness in metres" }, { symbol: "R", meaning: "wastage percentage" }],
    },
    workedExample: {
      title: "Example: 5 m by 4 m by 0.15 m with 5% wastage",
      input: "For dimensions of 5 m, 4 m, and 0.15 m, the base rectangular volume is 3 cubic metres. A 5% wastage allowance is 0.15 cubic metres.",
      result: "The calculator reports a base volume of 3 m3, a wastage volume of 0.15 m3, and a total fresh concrete volume of 3.15 m3.",
      fixture: { input: { length: 5, width: 4, depth: 0.15, unit: "metre", wastagePercent: 5 }, expectedResult: { volume: "3", wastageVolume: "0.15", totalVolume: "3.15" } },
    },
    assumptions: ["All three dimensions use the selected unit and describe one rectangular volume.", "Dimensions represent the formwork or excavation faces exactly as entered.", "The wastage percentage is user-selected; the 5% default is a general allowance, not a supplier figure."],
    exclusions: ["Concrete strength, grade, mix design, and cement, sand, aggregate, or water quantities", "Reinforcement, formwork, curing, joints, pumping, hauling, labour, prices, and supplier minimums", "Structural sizing, engineering assessment, construction method, or procurement advice"],
    commonMistakes: ["Entering depth in centimetres while the selected unit is metres", "Using area rather than entering three linear dimensions", "Treating the fresh concrete volume as a dry-material mix calculation"],
    faqs: [
      { question: "Can I enter depth in a different unit from length and width?", answer: "No. The selected unit applies to all three dimensions. Convert every dimension to the same unit before entering it." },
      { question: "Does the result show cement, sand, and aggregate quantities?", answer: "No. It reports only fresh concrete volume and makes no assumption about grade, mix proportions, moisture, bulking, or dry volume." },
      { question: "Is the default 5% wastage required?", answer: "No. It is an editable general allowance. The calculator does not recommend a project-specific percentage or supplier order quantity." },
    ],
    relatedCalculatorKeys: ["tile-quantity", "paint"],
    reviewedAt: "2026-08-28",
    reviewedBy: "LankaCalc concrete quantity calculator specification",
  },
  si: {
    directAnswer: "කොන්ක්‍රීට් ප්‍රමාණ ගණකය සෘජුකෝණාස්‍රාකාර පුවරුවක්, පාදමක්, ආකෘතියක් හෝ කැණීමක් සඳහා දිග, පළල සහ ගැඹුර අනුව නැවුම් කොන්ක්‍රීට් පරිමාව ඇස්තමේන්තු කරයි. මාන තුනම තෝරාගත් ඒකකයෙන් මීටරවලට පරිවර්තනය කර ඝන මීටර් ගණනය කර ඇතුළත් කළ අපතේ යාමේ ප්‍රතිශතය එකතු කරයි. කොන්ක්‍රීට් මිශ්‍රණය, ශක්තිය, ව්‍යුහාත්මක මාන හෝ මිලදී ගත යුතු ප්‍රමාණයක් මෙය තීරණය නොකරයි.",
    instructions: ["සෘජුකෝණාස්‍රයේ දිග, පළල සහ ගැඹුර හෝ ඝනකම ඇතුළත් කරන්න.", "මාන තුනටම භාවිත කළ එකම ඒකකය තෝරන්න.", "අපතේ යාමේ ප්‍රතිශතය ඇතුළත් කර මූලික, අපතේ යාමේ සහ මුළු පරිමාව ඝන මීටරවලින් ගණනය කරන්න."],
    formula: {
      expression: "Q = L x W x D x (1 + R / 100)",
      explanation: "දිග, පළල සහ ගැඹුර ගුණ කිරීමට පෙර මීටරවලට පරිවර්තනය කරයි. අපතේ යාමේ පරිමාව මූලික ඝන මීටර් පරිමාව ඇතුළත් ප්‍රතිශතයෙන් ගුණ කළ අගය වන අතර මුළු අගය දශම ස්ථාන හතරක් දක්වා පෙන්වයි.",
      variables: [{ symbol: "Q", meaning: "ඝන මීටරවලින් මුළු නැවුම් කොන්ක්‍රීට් පරිමාව" }, { symbol: "L", meaning: "මීටරවලින් දිග" }, { symbol: "W", meaning: "මීටරවලින් පළල" }, { symbol: "D", meaning: "මීටරවලින් ගැඹුර හෝ ඝනකම" }, { symbol: "R", meaning: "අපතේ යාමේ ප්‍රතිශතය" }],
    },
    workedExample: {
      title: "උදාහරණය: මීටර් 5 x 4 x 0.15 සහ 5% අපතේ යාම",
      input: "මීටර් 5, 4 සහ 0.15 මාන සඳහා මූලික සෘජුකෝණාස්‍ර පරිමාව ඝන මීටර් 3කි. 5% අපතේ යාමේ දීමනාව ඝන මීටර් 0.15කි.",
      result: "ගණකය මූලික පරිමාව ඝන මීටර් 3ක්, අපතේ යාමේ පරිමාව ඝන මීටර් 0.15ක් සහ මුළු නැවුම් කොන්ක්‍රීට් පරිමාව ඝන මීටර් 3.15ක් ලෙස පෙන්වයි.",
      fixture: { input: { length: 5, width: 4, depth: 0.15, unit: "metre", wastagePercent: 5 }, expectedResult: { volume: "3", wastageVolume: "0.15", totalVolume: "3.15" } },
    },
    assumptions: ["මාන තුනම තෝරාගත් ඒකකය භාවිත කර එක් සෘජුකෝණාස්‍ර පරිමාවක් විස්තර කරයි.", "මාන ඇතුළත් කළ පරිදි ආකෘති හෝ කැණීම් මුහුණු නිරූපණය කරයි.", "අපතේ යාමේ ප්‍රතිශතය පරිශීලකයා තෝරයි; පෙරනිමි 5% සාමාන්‍ය දීමනාවක් මිස සැපයුම්කරුගේ අගයක් නොවේ."],
    exclusions: ["කොන්ක්‍රීට් ශක්තිය, ශ්‍රේණිය, මිශ්‍රණ සැලසුම සහ සිමෙන්ති, වැලි, ගල් හෝ ජල ප්‍රමාණ", "වානේ සවි කිරීම, ආකෘති, තෙත් තබා සුව කිරීම, සන්ධි, පොම්ප කිරීම, ප්‍රවාහනය, ශ්‍රමය, මිල සහ සැපයුම්කරුගේ අවම ප්‍රමාණ", "ව්‍යුහාත්මක මාන නියම කිරීම, ඉංජිනේරු ඇගයීම, ඉදිකිරීම් ක්‍රම හෝ මිලදී ගැනීමේ උපදෙස්"],
    commonMistakes: ["තෝරාගත් ඒකකය මීටර් වන විට ගැඹුර සෙන්ටිමීටරවලින් ඇතුළත් කිරීම", "රේඛීය මාන තුනක් ඇතුළත් කිරීම වෙනුවට වර්ගඵලයක් භාවිත කිරීම", "නැවුම් කොන්ක්‍රීට් පරිමාව වියළි ද්‍රව්‍ය මිශ්‍රණ ගණනයක් ලෙස සැලකීම"],
    faqs: [
      { question: "දිග හා පළලට වෙනස් ඒකකයකින් ගැඹුර ඇතුළත් කළ හැකිද?", answer: "නැත. තෝරාගත් ඒකකය මාන තුනටම අදාළ වේ. ඇතුළත් කිරීමට පෙර සියලු මාන එකම ඒකකයට පරිවර්තනය කරන්න." },
      { question: "ප්‍රතිඵලය සිමෙන්ති, වැලි සහ ගල් ප්‍රමාණ පෙන්වයිද?", answer: "නැත. එය නැවුම් කොන්ක්‍රීට් පරිමාව පමණක් පෙන්වන අතර ශ්‍රේණිය, මිශ්‍රණ අනුපාත, තෙතමනය, ප්‍රසාරණය හෝ වියළි පරිමාව ගැන උපකල්පනය නොකරයි." },
      { question: "පෙරනිමි 5% අපතේ යාම අනිවාර්යද?", answer: "නැත. එය වෙනස් කළ හැකි සාමාන්‍ය දීමනාවකි. ගණකය ව්‍යාපෘතියකට විශේෂ ප්‍රතිශතයක් හෝ සැපයුම්කරුගෙන් මිලදී ගත යුතු ප්‍රමාණයක් නිර්දේශ නොකරයි." },
    ],
    relatedCalculatorKeys: ["tile-quantity", "paint"],
    reviewedAt: "2026-08-28",
    reviewedBy: "LankaCalc කොන්ක්‍රීට් ප්‍රමාණ ගණක පිරිවිතරය",
  },
  ta: {
    directAnswer: "கொங்கிறீற்று அளவுக் கணிப்பான் ஒரு செவ்வகத் தளம், அடித்தளம், வார்ப்பு அல்லது அகழ்வின் நீளம், அகலம், ஆழத்திலிருந்து புதிய கொங்கிறீற்றின் கனஅளவை மதிப்பிடுகிறது. மூன்று அளவுகளையும் தேர்ந்தெடுத்த அலகிலிருந்து மீட்டருக்கு மாற்றி கன மீட்டரைக் கணக்கிட்டு உள்ளிட்ட கழிவுச் சதவீதத்தைச் சேர்க்கிறது. இது கலவை, வலிமை, கட்டமைப்பு அளவுகள் அல்லது வாங்க வேண்டிய அளவைத் தீர்மானிப்பதில்லை.",
    instructions: ["செவ்வகத்தின் நீளம், அகலம் மற்றும் ஆழம் அல்லது தடிமனை உள்ளிடுங்கள்.", "மூன்று அளவுகளுக்கும் பயன்படுத்திய ஒரே அலகைத் தேர்ந்தெடுங்கள்.", "கழிவுச் சதவீதத்தை உள்ளிட்டு அடிப்படை, கழிவு மற்றும் மொத்தக் கனஅளவுகளை கன மீட்டரில் கணக்கிடுங்கள்."],
    formula: {
      expression: "Q = L x W x D x (1 + R / 100)",
      explanation: "நீளம், அகலம் மற்றும் ஆழம் பெருக்கப்படுமுன் மீட்டருக்கு மாற்றப்படுகின்றன. கழிவுக் கனஅளவு அடிப்படை கன மீட்டரை உள்ளிட்ட சதவீதத்தால் பெருக்கிய மதிப்பு; மொத்தம் நான்கு தசம இடங்கள் வரை வெளியிடப்படுகிறது.",
      variables: [{ symbol: "Q", meaning: "கன மீட்டரில் மொத்தப் புதிய கொங்கிறீற்று கனஅளவு" }, { symbol: "L", meaning: "மீட்டரில் நீளம்" }, { symbol: "W", meaning: "மீட்டரில் அகலம்" }, { symbol: "D", meaning: "மீட்டரில் ஆழம் அல்லது தடிமன்" }, { symbol: "R", meaning: "கழிவுச் சதவீதம்" }],
    },
    workedExample: {
      title: "உதாரணம்: 5 மீ x 4 மீ x 0.15 மீ மற்றும் 5% கழிவு",
      input: "5 மீ, 4 மீ மற்றும் 0.15 மீ அளவுகளுக்கு அடிப்படை செவ்வகக் கனஅளவு 3 கன மீட்டர். 5% கழிவு ஒதுக்கீடு 0.15 கன மீட்டர்.",
      result: "கணிப்பான் அடிப்படை அளவு 3 m3, கழிவு அளவு 0.15 m3, மொத்தப் புதிய கொங்கிறீற்று அளவு 3.15 m3 எனக் காட்டுகிறது.",
      fixture: { input: { length: 5, width: 4, depth: 0.15, unit: "metre", wastagePercent: 5 }, expectedResult: { volume: "3", wastageVolume: "0.15", totalVolume: "3.15" } },
    },
    assumptions: ["மூன்று அளவுகளும் தேர்ந்தெடுத்த அலகைப் பயன்படுத்தி ஒரு செவ்வகக் கனஅளவை விவரிக்கின்றன.", "அளவுகள் உள்ளிட்டபடி வார்ப்பு அல்லது அகழ்வு முகங்களைக் குறிக்கின்றன.", "கழிவுச் சதவீதம் பயனரால் தேர்ந்தெடுக்கப்படுகிறது; இயல்புநிலை 5% பொதுவான ஒதுக்கீடே தவிர வழங்குநரின் மதிப்பு அல்ல."],
    exclusions: ["கொங்கிறீற்று வலிமை, தரம், கலவை வடிவமைப்பு மற்றும் சீமெந்து, மணல், கல் அல்லது நீர் அளவுகள்", "வலுவூட்டல், வார்ப்பு, பராமரிப்பு, இணைப்புகள், பம்ப், போக்குவரத்து, உழைப்பு, விலை மற்றும் வழங்குநர் குறைந்தபட்சம்", "கட்டமைப்பு அளவிடல், பொறியியல் மதிப்பீடு, கட்டுமான முறை அல்லது கொள்முதல் ஆலோசனை"],
    commonMistakes: ["தேர்ந்தெடுத்த அலகு மீட்டராக இருக்கும்போது ஆழத்தை சென்டிமீட்டரில் உள்ளிடுதல்", "மூன்று நேர்கோட்டு அளவுகளை உள்ளிடுவதற்குப் பதிலாக பரப்பளவைப் பயன்படுத்துதல்", "புதிய கொங்கிறீற்று கனஅளவை உலர் பொருள் கலவைக் கணக்காகக் கருதுதல்"],
    faqs: [
      { question: "நீளம், அகலத்திலிருந்து வேறு அலகில் ஆழத்தை உள்ளிடலாமா?", answer: "இல்லை. தேர்ந்தெடுத்த அலகு மூன்று அளவுகளுக்கும் பொருந்தும். உள்ளிடுமுன் எல்லா அளவுகளையும் ஒரே அலகுக்கு மாற்றுங்கள்." },
      { question: "முடிவு சீமெந்து, மணல் மற்றும் கல் அளவுகளைக் காட்டுமா?", answer: "இல்லை. அது புதிய கொங்கிறீற்று கனஅளவை மட்டும் காட்டுகிறது; தரம், கலவை விகிதம், ஈரப்பதம், பெருக்கம் அல்லது உலர் கனஅளவு குறித்த அனுமானம் இல்லை." },
      { question: "இயல்புநிலை 5% கழிவு கட்டாயமா?", answer: "இல்லை. அது மாற்றக்கூடிய பொதுவான ஒதுக்கீடு. கணிப்பான் திட்டத்திற்குரிய சதவீதத்தையோ வழங்குநரிடம் வாங்க வேண்டிய அளவையோ பரிந்துரைப்பதில்லை." },
    ],
    relatedCalculatorKeys: ["tile-quantity", "paint"],
    reviewedAt: "2026-08-28",
    reviewedBy: "LankaCalc கொங்கிறீற்று அளவுக் கணிப்பான் விவரக்குறிப்பு",
  },
};

const contentByCalculator = {
  "brick-block": {
    en: {
      directAnswer: "The brick and block quantity calculator estimates whole masonry units for a rectangular single-layer wall after deducting openings. It uses the entered unit face dimensions, one mortar joint in each direction, and wastage, rounding each quantity upward. It is not a wall design or purchasing schedule.",
      instructions: ["Enter the wall length and height and select their shared unit.", "Enter the total opening area in square metres, then the brick face dimensions and mortar joint in millimetres.", "Enter a wastage percentage and calculate the estimated whole-unit counts."],
      formula: {
        expression: "B = ceil(ceil((L x H - O) / (((bL + J) / 1000) x ((bH + J) / 1000))) x (1 + R / 100))",
        explanation: "Wall dimensions are converted to metres and openings are deducted. One joint is added to each face dimension; the base count is rounded up before wastage is applied and rounded up again.",
        variables: [{ symbol: "B", meaning: "whole units after wastage" }, { symbol: "L", meaning: "wall length in metres" }, { symbol: "H", meaning: "wall height in metres" }, { symbol: "O", meaning: "opening area in square metres" }, { symbol: "bL", meaning: "brick face length in millimetres" }, { symbol: "bH", meaning: "brick face height in millimetres" }, { symbol: "J", meaning: "mortar joint in millimetres" }, { symbol: "R", meaning: "wastage percentage" }],
      },
      workedExample: {
        title: "Example: 5 m by 3 m wall with common brick dimensions",
        input: "A 5 m by 3 m wall has no openings, 222 mm by 72 mm brick faces, a 10 mm joint, and 5% wastage.",
        result: "The wall area is 15 m2 and the rate is 52.57 bricks per m2. The calculator rounds to 789 bricks before wastage and 829 after wastage.",
        fixture: { input: { length: 5, height: 3, unit: "metre", openingArea: 0, brickLength: 222, brickHeight: 72, jointMillimetres: 10, wastagePercent: 5 }, expectedResult: { wallArea: "15", bricksPerSquareMetre: "52.57", bricksBeforeWastage: 789, bricksAfterWastage: 829 } },
      },
      assumptions: ["The wall is a single-layer, half-brick wall and each unit contributes its entered face dimensions plus one joint.", "Openings are fully deducted by their entered area without adding units for reveals.", "The entered dimensions, joint, and wastage describe the intended estimate."],
      exclusions: ["Hollow-block bonds, multi-leaf walls, reveals, lintels, tie beams, copings, columns, and mortar quantities", "Structural design, masonry design, engineering assessment, construction method, and procurement advice", "Supplier dimensions, pack quantities, prices, product tolerances, and product-specific coverage or suitability"],
      commonMistakes: ["Entering the opening dimensions instead of their combined area in square metres", "Entering brick dimensions in centimetres rather than millimetres", "Using this single-layer model for hollow-block, multi-leaf, or different-bond walls"],
      faqs: [
        { question: "Why is one mortar joint added to both brick dimensions?", answer: "The estimate assigns each unit its face length and height plus a uniform joint, producing the effective wall face area per unit." },
        { question: "Does the opening deduction include reveals or lintels?", answer: "No. It subtracts only the entered square-metre area and does not estimate surrounding reveals, lintels, or other detailing." },
        { question: "Can I use this result as an order quantity?", answer: "No. Confirm the actual bond, unit dimensions, tolerances, breakage, packs, and site details with the designer and supplier." },
      ],
      relatedCalculatorKeys: ["concrete", "paint"], reviewedAt: "2026-08-28", reviewedBy: "LankaCalc brick and block quantity calculator specification",
    },
    si: {
      directAnswer: "ගඩොල් සහ බ්ලොක් ප්‍රමාණ ගණකය සෘජුකෝණාස්‍රාකාර තනි ස්තර බිත්තියකින් විවර අඩු කර අවශ්‍ය සම්පූර්ණ පෙදරේරු ඒකක ගණන ඇස්තමේන්තු කරයි. ඇතුළත් කළ ඒකක මුහුණතේ මාන, දෙදිශාවටම එක් බදාම සන්ධියක් සහ අපතේ යාම භාවිත කර ගණන් ඉහළට වටයයි. මෙය බිත්ති සැලසුමක් හෝ මිලදී ගැනීමේ ලේඛනයක් නොවේ.",
      instructions: ["බිත්තියේ දිග හා උස ඇතුළත් කර ඒවාට පොදු ඒකකය තෝරන්න.", "විවරවල මුළු වර්ගඵලය වර්ග මීටරවලින්ද ගඩොල් මුහුණතේ මාන සහ බදාම සන්ධිය මිලිමීටරවලින්ද ඇතුළත් කරන්න.", "අපතේ යාමේ ප්‍රතිශතය ඇතුළත් කර සම්පූර්ණ ඒකක ගණන් ගණනය කරන්න."],
      formula: { expression: "B = ceil(ceil((L x H - O) / (((bL + J) / 1000) x ((bH + J) / 1000))) x (1 + R / 100))", explanation: "බිත්ති මාන මීටරවලට පරිවර්තනය කර විවර අඩු කරයි. මුහුණතේ එක් එක් මානයට සන්ධියක් එකතු කර මූලික ගණන ඉහළට වටයා, අපතේ යාම යොදා නැවත ඉහළට වටයයි.", variables: [{ symbol: "B", meaning: "අපතේ යාමෙන් පසු සම්පූර්ණ ඒකක" }, { symbol: "L", meaning: "මීටරවලින් බිත්ති දිග" }, { symbol: "H", meaning: "මීටරවලින් බිත්ති උස" }, { symbol: "O", meaning: "වර්ග මීටරවලින් විවර වර්ගඵලය" }, { symbol: "bL", meaning: "මිලිමීටරවලින් ගඩොල් මුහුණතේ දිග" }, { symbol: "bH", meaning: "මිලිමීටරවලින් ගඩොල් මුහුණතේ උස" }, { symbol: "J", meaning: "මිලිමීටරවලින් බදාම සන්ධිය" }, { symbol: "R", meaning: "අපතේ යාමේ ප්‍රතිශතය" }] },
      workedExample: { title: "උදාහරණය: මීටර් 5 x 3 බිත්තියක් සහ සාමාන්‍ය ගඩොල් මාන", input: "මීටර් 5 x 3 බිත්තියට විවර නැත; ගඩොල් මුහුණත මි.මී. 222 x 72, සන්ධිය මි.මී. 10 සහ අපතේ යාම 5%කි.", result: "බිත්ති වර්ගඵලය වර්ග මීටර් 15ක් සහ වර්ග මීටරයකට ගඩොල් 52.57කි. අපතේ යාමට පෙර ගඩොල් 789ක් සහ පසුව 829ක් ලැබේ.", fixture: { input: { length: 5, height: 3, unit: "metre", openingArea: 0, brickLength: 222, brickHeight: 72, jointMillimetres: 10, wastagePercent: 5 }, expectedResult: { wallArea: "15", bricksPerSquareMetre: "52.57", bricksBeforeWastage: 789, bricksAfterWastage: 829 } } },
      assumptions: ["බිත්තිය තනි ස්තර අඩ ගඩොල් බිත්තියක් වන අතර එක් ඒකකයට එහි මුහුණතේ මාන සහ එක් සන්ධියක් අදාළ වේ.", "විවරවල ඇතුළත් වර්ගඵලය සම්පූර්ණයෙන් අඩු කරන අතර පැති මුහුණු සඳහා ඒකක එකතු නොකරයි.", "ඇතුළත් මාන, සන්ධිය සහ අපතේ යාම අවශ්‍ය ඇස්තමේන්තුව විස්තර කරයි."],
      exclusions: ["හිස් බ්ලොක් බැඳීම්, බහු ස්තර බිත්ති, පැති මුහුණු, ලින්ටල්, බැඳුම් බාල්ක, මුදුන්, කණු සහ බදාම ප්‍රමාණ", "ව්‍යුහාත්මක හෝ පෙදරේරු සැලසුම්, ඉංජිනේරු ඇගයීම්, ඉදිකිරීම් ක්‍රම සහ මිලදී ගැනීමේ උපදෙස්", "සැපයුම්කරුගේ මාන, ඇසුරුම් ගණන්, මිල, නිෂ්පාදන ඉවසීම් සහ නිෂ්පාදනයට විශේෂ ආවරණය හෝ යෝග්‍යතාව"],
      commonMistakes: ["විවරවල එකතු කළ වර්ග මීටර් අගය වෙනුවට දිග හා පළල ඇතුළත් කිරීම", "ගඩොල් මාන මිලිමීටර වෙනුවට සෙන්ටිමීටරවලින් ඇතුළත් කිරීම", "තනි ස්තර ආකෘතිය හිස් බ්ලොක්, බහු ස්තර හෝ වෙනත් බැඳීමකට භාවිත කිරීම"],
      faqs: [{ question: "ගඩොල් මාන දෙකටම එක් සන්ධියක් එකතු කරන්නේ ඇයි?", answer: "ඒකාකාර සන්ධියක් සමඟ එක් ඒකකයකට අදාළ ඵලදායී බිත්ති මුහුණත ගණනය කිරීමට දිගටත් උසටත් සන්ධිය එකතු කරයි." }, { question: "විවර අඩු කිරීම පැති මුහුණු හෝ ලින්ටල් ඇතුළත් කරයිද?", answer: "නැත. ඇතුළත් වර්ග මීටර් අගය පමණක් අඩු කරන අතර පැති මුහුණු, ලින්ටල් හෝ වෙනත් විස්තර ගණනය නොකරයි." }, { question: "මෙය මිලදී ගැනීමේ ගණනක් ලෙස භාවිත කළ හැකිද?", answer: "නැත. සැබෑ බැඳීම, ඒකක මාන, ඉවසීම්, බිඳීම්, ඇසුරුම් සහ ස්ථාන විස්තර සැලසුම්කරු හා සැපයුම්කරු සමඟ තහවුරු කරන්න." }],
      relatedCalculatorKeys: ["concrete", "paint"], reviewedAt: "2026-08-28", reviewedBy: "LankaCalc ගඩොල් සහ බ්ලොක් ප්‍රමාණ ගණක පිරිවිතරය",
    },
    ta: {
      directAnswer: "செங்கல் மற்றும் கட்டி அளவுக் கணிப்பான் திறப்புகளைக் கழித்த ஒரு செவ்வக ஒற்றை அடுக்குச் சுவருக்கான முழுக் கொத்துக் கட்டுமான அலகுகளை மதிப்பிடுகிறது. உள்ளிட்ட அலகின் முக அளவுகள், இரு திசைகளிலும் ஒரு சாந்து இணைப்பு மற்றும் கழிவைப் பயன்படுத்தி இரு எண்ணிக்கைகளையும் மேலே சுற்றுகிறது. இது சுவர் வடிவமைப்போ கொள்முதல் அட்டவணையோ அல்ல.",
      instructions: ["சுவரின் நீளத்தையும் உயரத்தையும் உள்ளிட்டு அவற்றின் பொதுவான அலகைத் தேர்ந்தெடுங்கள்.", "திறப்புகளின் மொத்தப் பரப்பை சதுர மீட்டரிலும் செங்கல் முக அளவுகளையும் சாந்து இணைப்பையும் மில்லிமீட்டரிலும் உள்ளிடுங்கள்.", "கழிவுச் சதவீதத்தை உள்ளிட்டு முழு அலகுகளின் மதிப்பீட்டைக் கணக்கிடுங்கள்."],
      formula: { expression: "B = ceil(ceil((L x H - O) / (((bL + J) / 1000) x ((bH + J) / 1000))) x (1 + R / 100))", explanation: "சுவர் அளவுகள் மீட்டருக்கு மாற்றப்பட்டுத் திறப்புகள் கழிக்கப்படுகின்றன. முகத்தின் ஒவ்வோர் அளவுக்கும் ஓர் இணைப்பு சேர்த்து அடிப்படை எண்ணிக்கை மேலே சுற்றப்படுகிறது; கழிவு சேர்த்த பின் மீண்டும் மேலே சுற்றப்படுகிறது.", variables: [{ symbol: "B", meaning: "கழிவுக்குப் பிந்தைய முழு அலகுகள்" }, { symbol: "L", meaning: "மீட்டரில் சுவர் நீளம்" }, { symbol: "H", meaning: "மீட்டரில் சுவர் உயரம்" }, { symbol: "O", meaning: "சதுர மீட்டரில் திறப்புப் பரப்பு" }, { symbol: "bL", meaning: "மில்லிமீட்டரில் செங்கல் முக நீளம்" }, { symbol: "bH", meaning: "மில்லிமீட்டரில் செங்கல் முக உயரம்" }, { symbol: "J", meaning: "மில்லிமீட்டரில் சாந்து இணைப்பு" }, { symbol: "R", meaning: "கழிவுச் சதவீதம்" }] },
      workedExample: { title: "உதாரணம்: 5 மீ x 3 மீ சுவரும் பொதுவான செங்கல் அளவுகளும்", input: "5 மீ x 3 மீ சுவரில் திறப்புகள் இல்லை; செங்கல் முகம் 222 மிமீ x 72 மிமீ, இணைப்பு 10 மிமீ, கழிவு 5%.", result: "சுவர் பரப்பு 15 m2; ஒரு சதுர மீட்டருக்கு 52.57 செங்கல்கள். கழிவுக்கு முன் 789 செங்கல்களும் பின் 829 செங்கல்களும் கிடைக்கின்றன.", fixture: { input: { length: 5, height: 3, unit: "metre", openingArea: 0, brickLength: 222, brickHeight: 72, jointMillimetres: 10, wastagePercent: 5 }, expectedResult: { wallArea: "15", bricksPerSquareMetre: "52.57", bricksBeforeWastage: 789, bricksAfterWastage: 829 } } },
      assumptions: ["சுவர் ஒற்றை அடுக்கு அரைச் செங்கல் சுவர்; ஒவ்வோர் அலகும் அதன் முக அளவுகளுடன் ஓர் இணைப்பைப் பங்களிக்கிறது.", "உள்ளிட்ட திறப்புப் பரப்பு முழுவதும் கழிக்கப்படுகிறது; பக்க முகங்களுக்கு அலகுகள் சேர்க்கப்படுவதில்லை.", "உள்ளிட்ட அளவுகள், இணைப்பு மற்றும் கழிவு தேவையான மதிப்பீட்டை விவரிக்கின்றன."],
      exclusions: ["வெற்றுக் கட்டிப் பிணைப்புகள், பல அடுக்குச் சுவர்கள், திறப்புப் பக்கங்கள், உத்திரங்கள், இணைப்புக் கற்றைகள், உச்சிகள், தூண்கள் மற்றும் சாந்து அளவுகள்", "கட்டமைப்பு அல்லது கொத்துக் கட்டுமான வடிவமைப்பு, பொறியியல் மதிப்பீடு, கட்டுமான முறை மற்றும் கொள்முதல் ஆலோசனை", "வழங்குநர் அளவுகள், பொதியளவுகள், விலைகள், தயாரிப்புச் சகிப்புத்தன்மை மற்றும் தயாரிப்புக்குரிய பரவல் அல்லது பொருத்தம்"],
      commonMistakes: ["திறப்புகளின் ஒருங்கிணைந்த சதுர மீட்டருக்குப் பதிலாக அவற்றின் நீள அகலங்களை உள்ளிடுதல்", "செங்கல் அளவுகளை மில்லிமீட்டருக்குப் பதிலாக சென்டிமீட்டரில் உள்ளிடுதல்", "இந்த ஒற்றை அடுக்கு மாதிரியை வெற்றுக் கட்டி, பல அடுக்கு அல்லது வேறு பிணைப்புச் சுவருக்குப் பயன்படுத்துதல்"],
      faqs: [{ question: "இரு செங்கல் அளவுகளுக்கும் ஓர் இணைப்பு ஏன் சேர்க்கப்படுகிறது?", answer: "சீரான இணைப்புடன் ஒவ்வோர் அலகுக்கும் ஒதுக்கப்படும் பயனுறு சுவர் முகப் பரப்பைக் கணக்கிட நீளத்திற்கும் உயரத்திற்கும் இணைப்பு சேர்க்கப்படுகிறது." }, { question: "திறப்புக் கழிப்பு பக்க முகங்களையோ உத்திரங்களையோ கொண்டுள்ளதா?", answer: "இல்லை. உள்ளிட்ட சதுர மீட்டரை மட்டும் கழிக்கிறது; பக்க முகம், உத்திரம் அல்லது வேறு விவரங்களை மதிப்பிடாது." }, { question: "இந்த முடிவை வாங்கும் அளவாகப் பயன்படுத்தலாமா?", answer: "இல்லை. உண்மையான பிணைப்பு, அலகு அளவு, சகிப்புத்தன்மை, உடைப்பு, பொதிகள் மற்றும் தள விவரங்களை வடிவமைப்பாளரிடமும் வழங்குநரிடமும் உறுதிப்படுத்துங்கள்." }],
      relatedCalculatorKeys: ["concrete", "paint"], reviewedAt: "2026-08-28", reviewedBy: "LankaCalc செங்கல் மற்றும் கட்டி அளவுக் கணிப்பான் விவரக்குறிப்பு",
    },
  },
  steel: {
    en: {
      directAnswer: "The steel quantity calculator estimates reinforcement-bar length and weight from a standard diameter, straight bar length, count, and wastage percentage. It uses the conventional d^2/162 kg/m mass formula and carries full precision into totals. It does not size reinforcement or provide a bar schedule or supplier quotation.",
      instructions: ["Select the reinforcement-bar diameter in millimetres.", "Enter the straight length of each bar in metres and the number of bars.", "Enter a wastage percentage and calculate the base, wastage, and total weights."],
      formula: { expression: "T = (n x L x d^2 / 162) x (1 + R / 100)", explanation: "Bar count times length gives total metres. Diameter squared divided by 162 gives estimated kilograms per metre; wastage is applied to the full-precision base weight before results are rounded.", variables: [{ symbol: "T", meaning: "total estimated weight in kilograms" }, { symbol: "n", meaning: "number of bars" }, { symbol: "L", meaning: "length of each bar in metres" }, { symbol: "d", meaning: "bar diameter in millimetres" }, { symbol: "R", meaning: "wastage percentage" }] },
      workedExample: { title: "Example: one hundred 12 mm bars, each 12 m long", input: "For 100 bars of 12 mm diameter and 12 m length with no wastage, total bar length is 1,200 m.", result: "The displayed unit weight is 0.889 kg/m. The base and total weights are both 1,066.67 kg, with 0.00 kg wastage.", fixture: { input: { diameterMillimetres: "12", barLengthMetres: 12, bars: 100, wastagePercent: 0 }, expectedResult: { totalLength: "1200", unitWeightKilogrammesPerMetre: "0.889", weightKilogrammes: "1066.67", wastageKilogrammes: "0.00", totalKilogrammes: "1066.67" } } },
      assumptions: ["The d^2/162 formula estimates reinforcement-steel mass using the conventional 7,850 kg/m3 density.", "Every entered bar is a plain straight length of the selected diameter.", "Bar grade does not change this mass estimate, and wastage is the user's allowance."],
      exclusions: ["Structural design, reinforcement sizing, engineering advice, bending schedules, and procurement advice", "Laps, couplers, anchorage, hooks, spacers, chairs, binding wire, fabrication, and cutting plans", "Supplier dimensions or weights, rolling tolerances, grades, stock lengths, bundles, prices, and availability"],
      commonMistakes: ["Entering total combined length as the length of every bar", "Treating the displayed three-decimal unit weight as the value used to calculate the total", "Using the estimate to choose bar diameter, grade, spacing, or reinforcement quantity"],
      faqs: [{ question: "Why can displayed unit weight times length differ slightly from the total?", answer: "Unit weight is displayed to three decimals, but the calculator carries the full d^2/162 value into the weight calculation before rounding the total." }, { question: "Does steel grade change the calculated mass?", answer: "No. The calculator uses diameter and conventional steel density only; it does not verify grade, strength, or supplier tolerances." }, { question: "Does wastage include laps and bent bars?", answer: "No. Wastage is only the percentage you enter. Laps, hooks, anchorage, bends, couplers, and fabrication details require a proper schedule." }],
      relatedCalculatorKeys: ["concrete", "brick-block"], reviewedAt: "2026-08-28", reviewedBy: "LankaCalc steel quantity calculator specification",
    },
    si: {
      directAnswer: "වානේ ප්‍රමාණ ගණකය සම්මත විෂ්කම්භයක්, සෘජු දණ්ඩ දිගක්, දණ්ඩ ගණනක් සහ අපතේ යාමේ ප්‍රතිශතයක් අනුව ශක්තිමත් කිරීමේ වානේවල මුළු දිග හා බර ඇස්තමේන්තු කරයි. සාම්ප්‍රදායික d^2/162 kg/m සූත්‍රය භාවිත කර මුළු අගයන්ට පූර්ණ නිරවද්‍යතාව රඳවයි. මෙය වානේ මාන නියම කිරීමක්, දණ්ඩ ලේඛනයක් හෝ සැපයුම්කරුගේ මිල ගණනක් නොවේ.",
      instructions: ["වානේ දණ්ඩයේ විෂ්කම්භය මිලිමීටරවලින් තෝරන්න.", "එක් සෘජු දණ්ඩයක දිග මීටරවලින් සහ දණ්ඩ ගණන ඇතුළත් කරන්න.", "අපතේ යාමේ ප්‍රතිශතය ඇතුළත් කර මූලික, අපතේ සහ මුළු බර ගණනය කරන්න."],
      formula: { expression: "T = (n x L x d^2 / 162) x (1 + R / 100)", explanation: "දණ්ඩ ගණන දිගෙන් ගුණ කර මුළු මීටර් ලැබේ. විෂ්කම්භයේ වර්ගය 162න් බෙදා මීටරයක කිලෝග්‍රෑම් ඇස්තමේන්තු කරයි; වටයීමට පෙර පූර්ණ නිරවද්‍ය මූලික බරට අපතේ යාම යොදයි.", variables: [{ symbol: "T", meaning: "කිලෝග්‍රෑම්වලින් මුළු ඇස්තමේන්තු බර" }, { symbol: "n", meaning: "දණ්ඩ ගණන" }, { symbol: "L", meaning: "මීටරවලින් එක් දණ්ඩයක දිග" }, { symbol: "d", meaning: "මිලිමීටරවලින් දණ්ඩ විෂ්කම්භය" }, { symbol: "R", meaning: "අපතේ යාමේ ප්‍රතිශතය" }] },
      workedExample: { title: "උදාහරණය: මි.මී. 12 දණ්ඩ 100ක්, එක් දණ්ඩයක් මීටර් 12යි", input: "මි.මී. 12 විෂ්කම්භයෙන් මීටර් 12 දිග දණ්ඩ 100කට අපතේ යාම ශූන්‍ය නම් මුළු දිග මීටර් 1,200කි.", result: "පෙන්වන ඒකක බර 0.889 kg/mකි. මූලික හා මුළු බර කි.ග්‍රෑ. 1,066.67 බැගින් වන අතර අපතේ බර කි.ග්‍රෑ. 0.00කි.", fixture: { input: { diameterMillimetres: "12", barLengthMetres: 12, bars: 100, wastagePercent: 0 }, expectedResult: { totalLength: "1200", unitWeightKilogrammesPerMetre: "0.889", weightKilogrammes: "1066.67", wastageKilogrammes: "0.00", totalKilogrammes: "1066.67" } } },
      assumptions: ["d^2/162 සූත්‍රය සාම්ප්‍රදායික 7,850 kg/m3 ඝනත්වයෙන් ශක්තිමත් කිරීමේ වානේ බර ඇස්තමේන්තු කරයි.", "ඇතුළත් සෑම දණ්ඩයක්ම තෝරාගත් විෂ්කම්භයේ සෘජු දිගකි.", "වානේ ශ්‍රේණිය මෙම බර ඇස්තමේන්තුව වෙනස් නොකරන අතර අපතේ යාම පරිශීලකයාගේ දීමනාවකි."],
      exclusions: ["ව්‍යුහාත්මක සැලසුම්, වානේ මාන නියම කිරීම, ඉංජිනේරු උපදෙස්, නැමීමේ ලේඛන සහ මිලදී ගැනීමේ උපදෙස්", "අතිච්ඡාදන, කප්ලර්, නැංගුරම්, කොකු, ස්පේසර්, චෙයාර්, බැඳුම් කම්බි, නිෂ්පාදනය සහ කැපුම් සැලසුම්", "සැපයුම්කරුගේ මාන හෝ බර, රෝල් ඉවසීම්, ශ්‍රේණි, තොග දිග, මිටි, මිල සහ ලැබිය හැකි බව"],
      commonMistakes: ["එක් දණ්ඩයක දිග ලෙස සියලු දණ්ඩවල එකතු කළ දිග ඇතුළත් කිරීම", "පෙන්වන දශම තුනේ ඒකක බරම මුළු බරට භාවිත කළ අගය ලෙස සැලකීම", "දණ්ඩ විෂ්කම්භය, ශ්‍රේණිය, පරතරය හෝ වානේ ප්‍රමාණය තෝරා ගැනීමට ඇස්තමේන්තුව භාවිත කිරීම"],
      faqs: [{ question: "පෙන්වන ඒකක බර දිගෙන් ගුණ කළ අගය මුළු බරට සුළු වශයෙන් වෙනස් විය හැක්කේ ඇයි?", answer: "ඒකක බර දශම තුනකට පෙන්වන නමුත් මුළු බර වටයීමට පෙර පූර්ණ d^2/162 අගය භාවිත කරයි." }, { question: "වානේ ශ්‍රේණිය ගණනය කළ බර වෙනස් කරයිද?", answer: "නැත. ගණකය විෂ්කම්භය සහ සාම්ප්‍රදායික වානේ ඝනත්වය පමණක් භාවිත කරන අතර ශ්‍රේණිය, ශක්තිය හෝ සැපයුම් ඉවසීම් තහවුරු නොකරයි." }, { question: "අපතේ යාමට අතිච්ඡාදන සහ නැමූ දණ්ඩ ඇතුළත්ද?", answer: "නැත. එය ඔබ ඇතුළත් කරන ප්‍රතිශතය පමණි. අතිච්ඡාදන, කොකු, නැංගුරම්, නැමීම් සහ කප්ලර් සඳහා නිසි දණ්ඩ ලේඛනයක් අවශ්‍ය වේ." }],
      relatedCalculatorKeys: ["concrete", "brick-block"], reviewedAt: "2026-08-28", reviewedBy: "LankaCalc වානේ ප්‍රමාණ ගණක පිරිවිතරය",
    },
    ta: {
      directAnswer: "உருக்கு அளவுக் கணிப்பான் நிலையான விட்டம், நேரான கம்பி நீளம், கம்பிகளின் எண்ணிக்கை மற்றும் கழிவுச் சதவீதத்திலிருந்து வலுவூட்டும் கம்பிகளின் மொத்த நீளத்தையும் எடையையும் மதிப்பிடுகிறது. வழக்கமான d^2/162 kg/m சூத்திரத்தைப் பயன்படுத்தி மொத்தங்களில் முழுத் துல்லியத்தைக் கொண்டுசெல்கிறது. இது வலுவூட்டல் அளவிடல், கம்பி அட்டவணை அல்லது வழங்குநர் விலை முன்மொழிவு அல்ல.",
      instructions: ["வலுவூட்டும் கம்பியின் விட்டத்தை மில்லிமீட்டரில் தேர்ந்தெடுங்கள்.", "ஒவ்வொரு நேரான கம்பியின் நீளத்தை மீட்டரிலும் கம்பிகளின் எண்ணிக்கையையும் உள்ளிடுங்கள்.", "கழிவுச் சதவீதத்தை உள்ளிட்டு அடிப்படை, கழிவு மற்றும் மொத்த எடைகளைக் கணக்கிடுங்கள்."],
      formula: { expression: "T = (n x L x d^2 / 162) x (1 + R / 100)", explanation: "கம்பி எண்ணிக்கையை நீளத்தால் பெருக்கினால் மொத்த மீட்டர் கிடைக்கும். விட்டத்தின் வர்க்கத்தை 162-ஆல் வகுத்து ஒரு மீட்டருக்கான கிலோகிராம் மதிப்பிடப்படுகிறது; சுற்றுமுன் முழுத் துல்லிய அடிப்படை எடைக்குக் கழிவு சேர்க்கப்படுகிறது.", variables: [{ symbol: "T", meaning: "கிலோகிராமில் மொத்த மதிப்பிடப்பட்ட எடை" }, { symbol: "n", meaning: "கம்பிகளின் எண்ணிக்கை" }, { symbol: "L", meaning: "மீட்டரில் ஒவ்வொரு கம்பியின் நீளம்" }, { symbol: "d", meaning: "மில்லிமீட்டரில் கம்பி விட்டம்" }, { symbol: "R", meaning: "கழிவுச் சதவீதம்" }] },
      workedExample: { title: "உதாரணம்: தலா 12 மீ நீளமான நூறு 12 மிமீ கம்பிகள்", input: "12 மிமீ விட்டமும் 12 மீ நீளமும் கொண்ட 100 கம்பிகளுக்குக் கழிவு பூச்சியம் எனில் மொத்த நீளம் 1,200 மீ.", result: "காட்டப்படும் அலகு எடை 0.889 kg/m. அடிப்படை மற்றும் மொத்த எடை தலா 1,066.67 kg; கழிவு 0.00 kg.", fixture: { input: { diameterMillimetres: "12", barLengthMetres: 12, bars: 100, wastagePercent: 0 }, expectedResult: { totalLength: "1200", unitWeightKilogrammesPerMetre: "0.889", weightKilogrammes: "1066.67", wastageKilogrammes: "0.00", totalKilogrammes: "1066.67" } } },
      assumptions: ["d^2/162 சூத்திரம் வழக்கமான 7,850 kg/m3 அடர்த்தியால் வலுவூட்டும் உருக்கின் எடையை மதிப்பிடுகிறது.", "உள்ளிட்ட ஒவ்வொரு கம்பியும் தேர்ந்தெடுத்த விட்டமுள்ள நேரான நீளம்.", "உருக்குத் தரம் இந்த எடை மதிப்பீட்டை மாற்றாது; கழிவு பயனரின் ஒதுக்கீடு."],
      exclusions: ["கட்டமைப்பு வடிவமைப்பு, வலுவூட்டல் அளவிடல், பொறியியல் ஆலோசனை, வளைப்பு அட்டவணை மற்றும் கொள்முதல் ஆலோசனை", "மேற்பொருத்தம், இணைப்பிகள், நங்கூரம், கொக்கிகள், இடைவெளிப் பொருட்கள், நாற்காலிக் கம்பிகள், கட்டுக் கம்பி, உருவாக்கம் மற்றும் வெட்டுத் திட்டம்", "வழங்குநர் அளவுகள் அல்லது எடைகள், உருட்டுச் சகிப்புத்தன்மை, தரங்கள், இருப்பு நீளங்கள், கட்டுகள், விலை மற்றும் கிடைப்பு"],
      commonMistakes: ["ஒவ்வொரு கம்பியின் நீளமாக எல்லாக் கம்பிகளின் ஒருங்கிணைந்த நீளத்தை உள்ளிடுதல்", "காட்டப்படும் மூன்று தசம அலகு எடையே மொத்தத்தில் பயன்படுத்தப்பட்டதாகக் கருதுதல்", "கம்பி விட்டம், தரம், இடைவெளி அல்லது வலுவூட்டல் அளவைத் தேர்ந்தெடுக்க மதிப்பீட்டைப் பயன்படுத்துதல்"],
      faqs: [{ question: "காட்டப்படும் அலகு எடையை நீளத்தால் பெருக்கியது மொத்தத்திலிருந்து ஏன் சற்று மாறலாம்?", answer: "அலகு எடை மூன்று தசமத்தில் காட்டப்படுகிறது; ஆனால் மொத்தத்தைச் சுற்றுமுன் முழு d^2/162 மதிப்பு பயன்படுத்தப்படுகிறது." }, { question: "உருக்குத் தரம் கணக்கிட்ட எடையை மாற்றுமா?", answer: "இல்லை. விட்டமும் வழக்கமான உருக்கு அடர்த்தியும் மட்டுமே பயன்படுத்தப்படுகின்றன; தரம், வலிமை அல்லது வழங்குநர் சகிப்புத்தன்மை சரிபார்க்கப்படுவதில்லை." }, { question: "கழிவில் மேற்பொருத்தங்களும் வளைந்த கம்பிகளும் உள்ளனவா?", answer: "இல்லை. அது நீங்கள் உள்ளிட்ட சதவீதம் மட்டுமே. மேற்பொருத்தம், கொக்கி, நங்கூரம், வளைவு மற்றும் இணைப்பிகளுக்கு முறையான கம்பி அட்டவணை தேவை." }],
      relatedCalculatorKeys: ["concrete", "brick-block"], reviewedAt: "2026-08-28", reviewedBy: "LankaCalc உருக்கு அளவுக் கணிப்பான் விவரக்குறிப்பு",
    },
  },
  "roof-material": {
    en: {
      directAnswer: "The roof material quantity calculator estimates whole tiles or corrugated sheets for a single sloping plane over a rectangular footprint. It adjusts footprint area by the entered slope, divides by user-entered effective coverage after overlaps, and applies wastage. It is not a roof design, product specification, or order recommendation.",
      instructions: ["Enter the rectangular building length and width and select their shared unit.", "Enter the slope from horizontal, select the material, and verify the effective square-metre coverage per unit after overlaps.", "Enter wastage and calculate the roof area and whole units before and after wastage."],
      formula: { expression: "U = ceil(ceil((L x W / cos(S)) / C) x (1 + R / 100))", explanation: "Footprint dimensions are converted to metres. Dividing footprint area by the cosine of slope gives one-plane surface area; this is divided by effective coverage, rounded up, then wastage is applied and rounded up again.", variables: [{ symbol: "U", meaning: "whole tiles or sheets after wastage" }, { symbol: "L", meaning: "building length in metres" }, { symbol: "W", meaning: "building width in metres" }, { symbol: "S", meaning: "slope angle from horizontal" }, { symbol: "C", meaning: "effective covered square metres per unit after overlaps" }, { symbol: "R", meaning: "wastage percentage" }] },
      workedExample: { title: "Example: flat 10 m by 6 m plane with clay tiles", input: "For a 10 m by 6 m footprint, 0-degree slope, clay tiles covering 0.111 m2 each, and 5% wastage, footprint and roof area are both 60 m2.", result: "The calculator rounds to 541 tiles before wastage and 569 tiles after wastage.", fixture: { input: { length: 10, width: 6, unit: "metre", slopeDegrees: 0, material: "clay-tile", coveragePerUnit: 0.111, wastagePercent: 5 }, expectedResult: { footprintArea: "60", roofArea: "60.00", unitsBeforeWastage: 541, unitsAfterWastage: 569, unitLabel: "tiles" } } },
      assumptions: ["The roof is one sloping plane over one rectangular footprint.", "Slope is measured from horizontal and expands area by 1 / cos(slope).", "Coverage is the user-confirmed effective area after overlaps, and wastage is applied after the base count is rounded up."],
      exclusions: ["Ridges, hips, valleys, flashings, eaves fillers, fascias, gutters, ventilators, openings, and complex roof geometry", "Structural or truss design, rafter or pitch analysis, weatherproofing, installation, engineering, and procurement advice", "Supplier dimensions, sheet or tile weights, pack sizes, prices, brand claims, and product-specific coverage, overlap, suitability, or instructions"],
      commonMistakes: ["Entering physical tile or sheet area instead of effective coverage after overlaps", "Entering rise or pitch ratio instead of degrees measured from horizontal", "Treating a single-plane rectangular estimate as coverage for hips, valleys, multiple planes, or detailing"],
      faqs: [{ question: "Why is roof area larger than footprint area?", answer: "A sloping surface is longer than its horizontal projection. The calculator divides footprint area by the cosine of the entered slope." }, { question: "Is coverage per unit the physical product area?", answer: "No. It must be the effective area covered after side and end overlaps. Confirm it for the selected product and installation." }, { question: "Does the result include ridge caps and flashings?", answer: "No. It estimates only field tiles or sheets on one plane. Ridges, hips, valleys, flashings and other details are excluded." }],
      relatedCalculatorKeys: ["concrete", "brick-block"], reviewedAt: "2026-08-28", reviewedBy: "LankaCalc roof material quantity calculator specification",
    },
    si: {
      directAnswer: "වහල ද්‍රව්‍ය ප්‍රමාණ ගණකය සෘජුකෝණාස්‍රාකාර පා සටහනක් මත එක් බෑවුම් තලයකට අවශ්‍ය සම්පූර්ණ උළු හෝ රැලි තහඩු ගණන ඇස්තමේන්තු කරයි. බෑවුමෙන් පා සටහන් වර්ගඵලය සකසා, අතිච්ඡාදනෙන් පසු පරිශීලකයා ඇතුළත් කළ ඵලදායී ආවරණයෙන් බෙදා අපතේ යාම යොදයි. මෙය වහල සැලසුමක්, නිෂ්පාදන පිරිවිතරයක් හෝ ඇණවුම් නිර්දේශයක් නොවේ.",
      instructions: ["ගොඩනැගිල්ලේ සෘජුකෝණාස්‍ර දිග හා පළල ඇතුළත් කර පොදු ඒකකය තෝරන්න.", "තිරස් රේඛාවෙන් බෑවුම් කෝණය ඇතුළත් කර ද්‍රව්‍යය තෝරා අතිච්ඡාදනෙන් පසු එක් ඒකකයක ඵලදායී වර්ග මීටර් ආවරණය තහවුරු කරන්න.", "අපතේ යාම ඇතුළත් කර වහල වර්ගඵලය සහ පෙර හා පසු සම්පූර්ණ ඒකක ගණනය කරන්න."],
      formula: { expression: "U = ceil(ceil((L x W / cos(S)) / C) x (1 + R / 100))", explanation: "පා සටහන් මාන මීටරවලට පරිවර්තනය කරයි. පා සටහන් වර්ගඵලය බෑවුමේ cosine අගයෙන් බෙදා එක් තලයක වර්ගඵලය ලබා, ඵලදායී ආවරණයෙන් බෙදා ඉහළට වටයා, අපතේ යාම යොදා නැවත ඉහළට වටයයි.", variables: [{ symbol: "U", meaning: "අපතේ යාමෙන් පසු සම්පූර්ණ උළු හෝ තහඩු" }, { symbol: "L", meaning: "මීටරවලින් ගොඩනැගිලි දිග" }, { symbol: "W", meaning: "මීටරවලින් ගොඩනැගිලි පළල" }, { symbol: "S", meaning: "තිරස් රේඛාවෙන් බෑවුම් කෝණය" }, { symbol: "C", meaning: "අතිච්ඡාදනෙන් පසු එක් ඒකකයක ඵලදායී වර්ග මීටර් ආවරණය" }, { symbol: "R", meaning: "අපතේ යාමේ ප්‍රතිශතය" }] },
      workedExample: { title: "උදාහරණය: මීටර් 10 x 6 සමතලයක් සහ මැටි උළු", input: "මීටර් 10 x 6 පා සටහනක්, අංශක 0 බෑවුමක්, එක් උළුවකට වර්ග මීටර් 0.111 ආවරණයක් සහ 5% අපතේ යාමක් සඳහා පා සටහන් හා වහල වර්ගඵල දෙකම වර්ග මීටර් 60කි.", result: "අපතේ යාමට පෙර උළු 541ක් සහ පසුව උළු 569ක් ලෙස ගණකය ඉහළට වටයයි.", fixture: { input: { length: 10, width: 6, unit: "metre", slopeDegrees: 0, material: "clay-tile", coveragePerUnit: 0.111, wastagePercent: 5 }, expectedResult: { footprintArea: "60", roofArea: "60.00", unitsBeforeWastage: 541, unitsAfterWastage: 569, unitLabel: "tiles" } } },
      assumptions: ["වහලය එක් සෘජුකෝණාස්‍ර පා සටහනක් මත එක් බෑවුම් තලයකි.", "බෑවුම තිරස් රේඛාවෙන් මනින අතර වර්ගඵලය 1 / cos(බෑවුම) අනුව වැඩි වේ.", "ආවරණය අතිච්ඡාදනෙන් පසු පරිශීලකයා තහවුරු කළ ඵලදායී අගය වන අතර මූලික ගණන ඉහළට වටයා පසුව අපතේ යාම යොදයි."],
      exclusions: ["මුදුන්, හිප්, නිම්න, ෆ්ලෑෂිං, වාටිය පිරවුම්, ෆැෂියා, පීලි, වාතාශ්‍රය, විවර සහ සංකීර්ණ වහල හැඩ", "ව්‍යුහාත්මක හෝ ට්‍රස් සැලසුම්, පරාල හෝ බෑවුම් විශ්ලේෂණ, ජලාරක්ෂණ, ස්ථාපන, ඉංජිනේරු සහ මිලදී ගැනීමේ උපදෙස්", "සැපයුම්කරුගේ මාන, තහඩු හෝ උළු බර, ඇසුරුම්, මිල, වෙළඳ නාම ප්‍රකාශ සහ නිෂ්පාදනයට විශේෂ ආවරණ, අතිච්ඡාදන, යෝග්‍යතාව හෝ උපදෙස්"],
      commonMistakes: ["අතිච්ඡාදනෙන් පසු ඵලදායී ආවරණය වෙනුවට උළුවේ හෝ තහඩුවේ භෞතික වර්ගඵලය ඇතුළත් කිරීම", "තිරස් රේඛාවෙන් අංශක වෙනුවට උස-දිග අනුපාතයක් ඇතුළත් කිරීම", "එක් තල සෘජුකෝණාස්‍ර ඇස්තමේන්තුව හිප්, නිම්න, තල කිහිපයක් හෝ විස්තර සඳහා භාවිත කිරීම"],
      faqs: [{ question: "වහල වර්ගඵලය පා සටහන් වර්ගඵලයට වඩා වැඩි වන්නේ ඇයි?", answer: "බෑවුම් පෘෂ්ඨයක් එහි තිරස් ප්‍රක්ෂේපණයට වඩා දිගය. ගණකය පා සටහන් වර්ගඵලය ඇතුළත් බෑවුමේ cosine අගයෙන් බෙදයි." }, { question: "එක් ඒකකයක ආවරණය නිෂ්පාදනයේ භෞතික වර්ගඵලයද?", answer: "නැත. එය පැති හා අග අතිච්ඡාදනෙන් පසු සැබෑවට ආවරණය වන වර්ගඵලය විය යුතුය. තෝරාගත් නිෂ්පාදනය හා ස්ථාපනය සඳහා එය තහවුරු කරන්න." }, { question: "ප්‍රතිඵලයට මුදුන් උළු සහ ෆ්ලෑෂිං ඇතුළත්ද?", answer: "නැත. එය එක් තලයක ප්‍රධාන උළු හෝ තහඩු පමණක් ඇස්තමේන්තු කරයි. මුදුන්, හිප්, නිම්න, ෆ්ලෑෂිං සහ වෙනත් විස්තර අඩංගු නොවේ." }],
      relatedCalculatorKeys: ["concrete", "brick-block"], reviewedAt: "2026-08-28", reviewedBy: "LankaCalc වහල ද්‍රව්‍ය ප්‍රමාණ ගණක පිරිවිතරය",
    },
    ta: {
      directAnswer: "கூரைப் பொருள் அளவுக் கணிப்பான் ஒரு செவ்வகத் தடத்தின் மேலுள்ள ஒற்றைச் சாய்வுத் தளத்திற்கான முழு ஓடுகள் அல்லது நெளிதகடுகளை மதிப்பிடுகிறது. உள்ளிட்ட சாய்வால் தடப் பரப்பைச் சரிசெய்து, மேற்பொருத்தத்திற்குப் பிந்தைய பயனுறு பரவலால் வகுத்துக் கழிவைச் சேர்க்கிறது. இது கூரை வடிவமைப்பு, தயாரிப்பு விவரக்குறிப்பு அல்லது வாங்கும் பரிந்துரை அல்ல.",
      instructions: ["கட்டடத்தின் செவ்வக நீளத்தையும் அகலத்தையும் உள்ளிட்டு பொதுவான அலகைத் தேர்ந்தெடுங்கள்.", "கிடைமட்டத்திலிருந்து சாய்வை உள்ளிட்டு பொருளைத் தேர்ந்தெடுத்து மேற்பொருத்தத்திற்குப் பிந்தைய ஓர் அலகின் பயனுறு சதுர மீட்டர் பரவலைச் சரிபாருங்கள்.", "கழிவை உள்ளிட்டு கூரைப் பரப்பையும் கழிவுக்கு முன்னும் பின்னும் முழு அலகுகளையும் கணக்கிடுங்கள்."],
      formula: { expression: "U = ceil(ceil((L x W / cos(S)) / C) x (1 + R / 100))", explanation: "தட அளவுகள் மீட்டருக்கு மாற்றப்படுகின்றன. தடப் பரப்பைச் சாய்வின் cosine-ஆல் வகுத்து ஒற்றைத் தளப் பரப்பு பெறப்படுகிறது; பயனுறு பரவலால் வகுத்து மேலே சுற்றிய பின் கழிவு சேர்த்து மீண்டும் மேலே சுற்றப்படுகிறது.", variables: [{ symbol: "U", meaning: "கழிவுக்குப் பிந்தைய முழு ஓடுகள் அல்லது தகடுகள்" }, { symbol: "L", meaning: "மீட்டரில் கட்டட நீளம்" }, { symbol: "W", meaning: "மீட்டரில் கட்டட அகலம்" }, { symbol: "S", meaning: "கிடைமட்டத்திலிருந்து சாய்வுக் கோணம்" }, { symbol: "C", meaning: "மேற்பொருத்தத்திற்குப் பிந்தைய ஓர் அலகின் பயனுறு சதுர மீட்டர் பரவல்" }, { symbol: "R", meaning: "கழிவுச் சதவீதம்" }] },
      workedExample: { title: "உதாரணம்: 10 மீ x 6 மீ தட்டையான தளமும் களிமண் ஓடுகளும்", input: "10 மீ x 6 மீ தடம், 0 பாகைச் சாய்வு, ஓர் ஓட்டுக்கு 0.111 m2 பரவல் மற்றும் 5% கழிவு எனில் தடமும் கூரைப் பரப்பும் தலா 60 m2.", result: "கழிவுக்கு முன் 541 ஓடுகளாகவும் கழிவுக்குப் பின் 569 ஓடுகளாகவும் கணிப்பான் மேலே சுற்றுகிறது.", fixture: { input: { length: 10, width: 6, unit: "metre", slopeDegrees: 0, material: "clay-tile", coveragePerUnit: 0.111, wastagePercent: 5 }, expectedResult: { footprintArea: "60", roofArea: "60.00", unitsBeforeWastage: 541, unitsAfterWastage: 569, unitLabel: "tiles" } } },
      assumptions: ["கூரை ஒரு செவ்வகத் தடத்தின் மேல் ஒரு சாய்வுத் தளம்.", "சாய்வு கிடைமட்டத்திலிருந்து அளக்கப்பட்டு பரப்பு 1 / cos(சாய்வு) அளவில் விரிகிறது.", "பரவல் மேற்பொருத்தத்திற்குப் பின் பயனர் உறுதிசெய்த பயனுறு மதிப்பு; அடிப்படை எண்ணிக்கையை மேலே சுற்றிய பின்னரே கழிவு சேர்க்கப்படுகிறது."],
      exclusions: ["முகடுகள், இடுப்புகள், பள்ளத்தாக்குகள், ஒளிர்தகடுகள், இறவான நிரப்பிகள், விளிம்புகள், நீர்வடிகால்கள், காற்றோட்டிகள், திறப்புகள் மற்றும் சிக்கலான கூரை வடிவங்கள்", "கட்டமைப்பு அல்லது தூல வடிவமைப்பு, உத்திர அல்லது சாய்வு ஆய்வு, நீர்ப்புகாப்பு, நிறுவல், பொறியியல் மற்றும் கொள்முதல் ஆலோசனை", "வழங்குநர் அளவுகள், தகடு அல்லது ஓட்டு எடைகள், பொதியளவுகள், விலைகள், வணிகக் குறிக் கூற்றுகள் மற்றும் தயாரிப்புக்குரிய பரவல், மேற்பொருத்தம், பொருத்தம் அல்லது வழிமுறைகள்"],
      commonMistakes: ["மேற்பொருத்தத்திற்குப் பிந்தைய பயனுறு பரவலுக்குப் பதிலாக ஓடு அல்லது தகட்டின் உடல் பரப்பை உள்ளிடுதல்", "கிடைமட்டத்திலிருந்து பாகைகளுக்குப் பதிலாக உயர்வு-ஓட்ட விகிதத்தை உள்ளிடுதல்", "ஒற்றைத் தளச் செவ்வக மதிப்பீட்டை இடுப்பு, பள்ளத்தாக்கு, பல தளங்கள் அல்லது விவரங்களுக்குப் பயன்படுத்துதல்"],
      faqs: [{ question: "கூரைப் பரப்பு தடப் பரப்பைவிட ஏன் பெரியது?", answer: "சாய்வான மேற்பரப்பு அதன் கிடைமட்ட வீழலைவிட நீளமானது. கணிப்பான் தடப் பரப்பை உள்ளிட்ட சாய்வின் cosine-ஆல் வகுக்கிறது." }, { question: "ஓர் அலகின் பரவல் தயாரிப்பின் உடல் பரப்பா?", answer: "இல்லை. பக்க மற்றும் முனை மேற்பொருத்தங்களுக்குப் பின் மூடப்படும் பயனுறு பரப்பாக அது இருக்க வேண்டும். தேர்ந்தெடுத்த தயாரிப்புக்கும் நிறுவலுக்கும் அதை உறுதிசெய்யுங்கள்." }, { question: "முடிவில் முகட்டு ஓடுகளும் ஒளிர்தகடுகளும் உள்ளனவா?", answer: "இல்லை. ஒரு தளத்தின் பிரதான ஓடுகள் அல்லது தகடுகள் மட்டுமே மதிப்பிடப்படுகின்றன. முகடு, இடுப்பு, பள்ளத்தாக்கு, ஒளிர்தகடு மற்றும் பிற விவரங்கள் விலக்கப்பட்டுள்ளன." }],
      relatedCalculatorKeys: ["concrete", "brick-block"], reviewedAt: "2026-08-28", reviewedBy: "LankaCalc கூரைப் பொருள் அளவுக் கணிப்பான் விவரக்குறிப்பு",
    },
  },
  concrete: concreteContent,
  "compound-interest": compoundInterestContent,
  "loan-affordability": loanAffordabilityContent,
  "loan-emi": loanEmiContent,
  paint: paintContent,
  "tile-quantity": tileQuantityContent,
} satisfies Record<string, Record<Locale, CalculatorContent>>;

export function getCalculatorContent(key: string, locale: Locale): CalculatorContent | undefined {
  return contentByCalculator[key as keyof typeof contentByCalculator]?.[locale];
}

export function getCalculatorContentKeys(): string[] {
  return Object.keys(contentByCalculator);
}
