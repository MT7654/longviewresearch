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

        <article>
          <header><Binary /><span>05 / CONDITIONAL VOLATILITY</span></header>
          <h2>GARCH(1,1)</h2>
          <code>σ²ₜ = ω + αε²ₜ₋₁ + βσ²ₜ₋₁</code>
          <p>The app fits a variance-targeted Gaussian GARCH model to the available return series. It reports current conditional volatility and persistence, while warning that a simple specification can understate jumps, asymmetry and heavy tails.</p>
          <aside><strong>Best question</strong><span>Do volatility shocks appear to persist?</span></aside>
        </article>

        <article>
          <header><Scale /><span>06 / TAIL RISK</span></header>
          <h2>Historical VaR and expected shortfall</h2>
          <code>VaR₉₅ = −Q₀.₀₅(r) · ES₉₅ = −E[r | r ≤ Q₀.₀₅]</code>
          <p>Historical VaR estimates a loss threshold from observed returns; expected shortfall averages the observations beyond it. Longview reports percentage market risk only, never a user’s personal exposure or an appropriate position size.</p>
          <aside><strong>Best question</strong><span>What did the poorer observed tail look like?</span></aside>
        </article>

        <article>
          <header><FlaskConical /><span>07 / MARKET-RISK SIMULATION</span></header>
          <h2>Seeded return Monte Carlo</h2>
          <code>5,000 paths · zero drift · GARCH or sample volatility</code>
          <p>This simulation estimates a fixed-horizon return distribution. It is deliberately separated from valuation Monte Carlo: one varies market returns, while the other varies DCF assumptions.</p>
          <aside><strong>Best question</strong><span>How sensitive is the loss distribution to the fitted process?</span></aside>
        </article>

        <article>
          <header><Braces /><span>08 / MODEL ELIGIBILITY</span></header>
          <h2>Options, factors and specialist valuation</h2>
          <code>BSM · binomial · Heston · CAPM · Fama–French · residual income</code>
          <p>These are real models, but they require different data and answer different questions. Options models need contract or option-surface inputs; factor regressions need aligned benchmark and factor returns; bank residual-income models need book value, ROE, capital and credit inputs.</p>
          <aside><strong>Best question</strong><span>Does this model fit the security, data and analytical question?</span></aside>
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
