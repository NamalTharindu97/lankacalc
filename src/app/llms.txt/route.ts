import { getLaunchCalculators } from "@/i18n/catalog";
import { getTrustPage, trustPageSlugs } from "@/i18n/trust-content";
import { absoluteUrl, siteDescription, siteName } from "@/lib/site";

export function GET() {
  const calculators = getLaunchCalculators("en");
  const lines = [
    `# ${siteName}`,
    "",
    `> ${siteDescription}`,
    "",
    "LankaCalc publishes transparent browser-based calculators with visible formulas, worked examples, assumptions, exclusions, and review dates. Calculator pages and executable code remain authoritative; this file is only a navigation index.",
    "",
    "## Calculators",
    "",
    ...calculators.map(calculator => `- [${calculator.name}](${absoluteUrl(`/en/calculators/${calculator.key}`)}): ${calculator.summary}`),
    "",
    "## Trust and policies",
    "",
    ...trustPageSlugs.map(slug => {
      const page = getTrustPage("en", slug);
      return `- [${page.title}](${absoluteUrl(`/en/${slug}`)}): ${page.description}`;
    }),
    "",
    "Sinhala and Tamil pages exist but require native-speaker editorial review before public indexing is enabled.",
  ];

  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
