import Link from "next/link";

import { getCalculators } from "@/domain/calculators/registry";

export default function HomePage() {
  const calculators = getCalculators();

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Sri Lankan decision tools</p>
          <h1>Useful numbers.<br />Visible workings.</h1>
          <p className="hero-intro">
            Start with quick everyday calculations. Each result states what went in, how it was
            calculated, and what was left out.
          </p>
          <a className="primary-action" href="#calculators">
            Choose a calculator <span aria-hidden="true">down</span>
          </a>
        </div>
        <aside className="hero-note" aria-label="Current release status">
          <span className="note-index">01</span>
          <p className="note-title">Foundation release</p>
          <p>
            Six static calculators run without an account. Source-backed Sri Lankan salary and
            contribution rules are the next regulated release.
          </p>
        </aside>
      </section>

      <section className="calculator-section" id="calculators">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Available now</p>
            <h2>Pick the question,<br />not the spreadsheet.</h2>
          </div>
          <p>{calculators.length.toString().padStart(2, "0")} calculators in this release</p>
        </div>

        <div className="calculator-grid">
          {calculators.map((calculator, index) => (
            <Link
              className={`calculator-card accent-${calculator.accent}`}
              href={`/calculators/${calculator.key}`}
              key={calculator.key}
            >
              <span className="card-number">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <span className="card-category">{calculator.category}</span>
                <h3>{calculator.shortName}</h3>
                <p>{calculator.summary}</p>
              </div>
              <span className="card-arrow" aria-hidden="true">-&gt;</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="principles" id="principles">
        <div>
          <p className="eyebrow">The standard</p>
          <h2>A result should<br />earn your trust.</h2>
        </div>
        <ol className="principle-list">
          <li>
            <span>01</span>
            <div><strong>Inputs stay visible</strong><p>Results repeat the values and units used.</p></div>
          </li>
          <li>
            <span>02</span>
            <div><strong>Workings are explained</strong><p>Intermediate values reveal how the total was formed.</p></div>
          </li>
          <li>
            <span>03</span>
            <div><strong>Assumptions are named</strong><p>Fees, rules, and exclusions are never silently implied.</p></div>
          </li>
          <li>
            <span>04</span>
            <div><strong>Rules will be dated</strong><p>Regulated calculators will cite official sources and effective versions.</p></div>
          </li>
        </ol>
      </section>
    </>
  );
}
