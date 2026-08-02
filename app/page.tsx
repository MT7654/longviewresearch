import Link from "next/link";
import { ArrowDown, Binary, BookOpen, Braces, ChartNoAxesCombined, CircleCheck, Database, FlaskConical, ShieldCheck } from "lucide-react";
import { SecuritySearch } from "@/components/security-search";

const samples = [
  { symbol: "NVDA", name: "NVIDIA", market: "NASDAQ · USD", tag: "Full model" },
  { symbol: "D05.SI", name: "DBS Group", market: "SGX · SGD", tag: "Model boundary" },
  { symbol: "0700.HK", name: "Tencent", market: "HKEX · HKD", tag: "Full model" },
  { symbol: "ASML.AS", name: "ASML", market: "EURONEXT · EUR", tag: "Full model" },
];

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="eyebrow"><span>GLOBAL EQUITY LEARNING AGENT</span><i>Life Agent · Singapore 2026</i></div>
            <h1>Understand what a stock price <em>assumes.</em></h1>
            <p>Longview turns institutional valuation methods into an inspectable learning experience—without pretending there is one correct target price.</p>
            <SecuritySearch />
            <div className="search-hints">
              <span><CircleCheck size={14} /> Global listings</span>
              <span><CircleCheck size={14} /> Deterministic math</span>
              <span><CircleCheck size={14} /> No account required</span>
            </div>
          </div>
          <div className="hero-terminal" aria-label="Illustrative valuation terminal">
            <header><span>LONGVIEW / MODEL DISAGREEMENT</span><i>ILLUSTRATIVE</i></header>
            <div className="terminal-security">
              <span>NVDA · NASDAQ · USD</span>
              <strong>Not one target.<br />A range of assumptions.</strong>
            </div>
            <div className="valuation-lines">
              <div><span>Reverse DCF</span><i style={{ width: "79%" }} /><b>Growth implied</b></div>
              <div><span>Scenario DCF</span><i style={{ width: "62%" }} /><b>$128–$214</b></div>
              <div><span>Relative value</span><i style={{ width: "71%" }} /><b>$115–$216</b></div>
              <div><span>Monte Carlo</span><i style={{ width: "67%" }} /><b>P10–P90</b></div>
            </div>
            <footer><Braces size={18} /><span>Every output traces back to a visible input and formula.</span></footer>
          </div>
        </div>
        <a className="scroll-cue" href="#methodology"><ArrowDown /> Explore the method</a>
      </section>

      <section className="trust-row">
        <span>BUILT FOR SCEPTICAL LEARNERS</span>
        <div><Database />Source-aware</div><div><Binary />Calculation-first</div><div><ShieldCheck />Non-personal</div><div><BookOpen />Designed to teach</div>
      </section>

      <section className="method-section" id="methodology">
        <div className="section-heading">
          <span>01 / THE METHOD</span>
          <h2>Four lenses. No false precision.</h2>
          <p>A price target is only the output of assumptions. Longview opens those assumptions up so you can test them.</p>
        </div>
        <div className="method-grid">
          <article><span>01</span><Braces /><h3>Reverse DCF</h3><p>Solve backwards from today’s price to reveal the cash-flow growth the market may already expect.</p><small>Expectation mapping</small></article>
          <article><span>02</span><FlaskConical /><h3>Scenario valuation</h3><p>Adjust growth, discount rates and terminal assumptions. Watch the range move as the thesis changes.</p><small>Intrinsic-value model</small></article>
          <article><span>03</span><ChartNoAxesCombined /><h3>Monte Carlo</h3><p>Run seeded simulations across uncertain inputs and inspect a distribution instead of a single answer.</p><small>Uncertainty modelling</small></article>
          <article><span>04</span><Binary /><h3>Factor lens</h3><p>Learn how value, quality, momentum and volatility describe historical characteristics—not destiny.</p><small>Systematic investing</small></article>
        </div>
      </section>

      <section className="agent-section">
        <div className="agent-copy">
          <span>02 / THE AGENT</span>
          <h2>An agent that shows its work.</h2>
          <p>Gemini helps plan, challenge and teach. It never owns the arithmetic. When free-tier inference is unavailable, the deterministic research desk remains fully usable.</p>
          <Link href="/research/NVDA">See the workflow in action <ArrowDown size={16} /></Link>
        </div>
        <ol className="agent-steps">
          <li><b>RESOLVE</b><span>Confirm listing, exchange and currency</span><i>01</i></li>
          <li><b>MODEL</b><span>Calculate reproducible valuation ranges</span><i>02</i></li>
          <li><b>CHALLENGE</b><span>Stress-test fragile assumptions</span><i>03</i></li>
          <li><b>TEACH</b><span>Explain the method and its limits</span><i>04</i></li>
        </ol>
      </section>

      <section className="samples-section" id="samples">
        <div className="section-heading">
          <span>03 / GLOBAL SAMPLE DESK</span>
          <h2>Start with a model-ready case.</h2>
          <p>Frozen, clearly labelled examples keep the judging path reliable while demonstrating exchange and currency handling.</p>
        </div>
        <div className="sample-grid">
          {samples.map((sample) => (
            <Link href={`/research/${sample.symbol}`} key={sample.symbol}>
              <header><strong>{sample.symbol}</strong><i>{sample.tag}</i></header>
              <h3>{sample.name}</h3><p>{sample.market}</p><span>OPEN RESEARCH DESK ↗</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="final-cta">
        <span>LESS CERTAINTY. BETTER QUESTIONS.</span>
        <h2>What does the price assume?</h2>
        <SecuritySearch />
      </section>
    </main>
  );
}
