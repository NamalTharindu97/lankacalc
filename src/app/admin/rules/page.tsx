import type { Metadata } from "next";
import Link from "next/link";

import { RulePlatformConsole } from "@/components/rule-platform-console";

export const metadata: Metadata = {
  title: "Rule desk",
  description: "Protected administration for LankaCalc sources and effective-dated rules.",
  robots: { index: false, follow: false },
};

export default function RulePlatformAdminPage() {
  return (
    <div className="rule-admin-page">
      <Link className="back-link" href="/">&lt;- Public calculators</Link>
      <RulePlatformConsole />
    </div>
  );
}
