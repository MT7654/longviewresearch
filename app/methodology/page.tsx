import Link from "next/link";
import { ArrowRight, Binary, Braces, FlaskConical, Scale, ShieldCheck } from "lucide-react";

export default function MethodologyPage() {
  return (
    <main className="policy-page methodology-page">
      <section className="policy-hero">
        <span>LONGVIEW RESEARCH / METHODOLOGY</span>
        <h1>Every number should be reproducible.</h1>
        <p>Longview uses deterministic models to teach how assumptions become analytical outputs. No method is presented as a complete description of future value.</p>
      </section>

      <section className="methodology-content">
        <article>
          <header><Braces /><span>01 / EXPECTATIONS MAPPING</span></header>
          <h2>Reverse discounted cash flow</h2>
          <code>Price = Σ FCFₜ / (1+r)ᵗ + TV / (1+r)ⁿ − net debt/share</code>
          <p>Longview solves backwards for a constant forecast-period growth rate. The result describes what the reference price requires under the other displayed assumptions. It is not a forecast that the company will achieve that growth.</p>
          <aside><strong>Best question</strong><span>What appears to be priced in?</span></aside>
        </article>

        <article>
          <header><FlaskConical /><span>02 / CONDITIONAL VALUATION</span></header>
          <h2>Scenario DCF and sensitivity grid</h2>
          <code>Value = PV(forecast cash flows) + PV(terminal value) − net debt/share</code>
          <p>The default model varies growth, discount rate and terminal growth. A sensitivity grid demonstrates how quickly outputs move when assumptions change. Company types such as banks are withheld from the generic industrial-company DCF.</p>
          <aside><strong>Best question</strong><span>Which assumption dominates the output?</span></aside>
        </article>

        <article>
          <header><Binary /><span>03 / UNCERTAINTY</span></header>
          <h2>Seeded Monte Carlo simulation</h2>
          <code>1,600 runs · deterministic seed · P10 / median / P90</code>
          <p>Longview samples bounded variations in cash flow, growth, discount rate and terminal growth. The seed makes every run reproducible. Percentiles describe the sampled model distribution, not real-world probabilities for a future share price.</p>
          <aside><strong>Best question</strong><span>How wide is model uncertainty?</span></aside>
        </article>

        <article>
          <header><Scale /><span>04 / SYSTEMATIC CHARACTERISTICS</span></header>
          <h2>Transparent factor proxies</h2>
          <code>Value · Quality · Momentum · Low volatility</code>
          <p>Value uses earnings and free-cash-flow yields. Quality uses return on capital, operating margin and a leverage penalty. Momentum uses trailing price behaviour, while low volatility inverts realised volatility. These are educational proxies—not a complete factor regression or trading signal.</p>
          <aside><strong>Best question</strong><span>Which historical characteristics describe this security?</span></aside>
        </article>
      </section>

      <section className="method-boundaries">
        <span>METHOD BOUNDARIES</span>
        <h2>Withholding a model is sometimes the most rigorous result.</h2>
        <div>
          <p><strong>Banks and insurers</strong><span>Require balance-sheet-aware approaches such as residual income and capital analysis.</span></p>
          <p><strong>Negative cash flow</strong><span>May require operating scenarios or relative comparisons rather than a conventional DCF.</span></p>
          <p><strong>Missing fundamentals</strong><span>Disable affected outputs instead of using AI-generated substitutions.</span></p>
          <p><strong>Public chart data</strong><span>Supports descriptive statistics but is not a licensed production market-data feed.</span></p>
        </div>
      </section>

      <section className="methodology-close">
        <ShieldCheck />
        <div><span>EDUCATIONAL USE</span><h2>A model output is conditional—not a recommended target.</h2><p>Longview displays data dates, assumptions and limitations next to each calculation so readers can challenge the method rather than rely on a number.</p></div>
        <Link href="/research/NVDA">Open the automatic Quant Lab <ArrowRight /></Link>
      </section>
    </main>
  );
}
