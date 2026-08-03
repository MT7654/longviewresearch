import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Binary,
  BookOpen,
  Braces,
  CheckCircle2,
  Database,
  FileText,
  FlaskConical,
  Lightbulb,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { SecuritySearch } from "@/components/security-search";

const samples = [
  { symbol: "NVDA", name: "NVIDIA", market: "NASDAQ · USD", tag: "Full learning case", lesson: "Expectations vs. operating strength" },
  { symbol: "D05.SI", name: "DBS Group", market: "SGX · SGD", tag: "Method boundary", lesson: "Why banks need different models" },
  { symbol: "0700.HK", name: "Tencent", market: "HKEX · HKD", tag: "Full learning case", lesson: "Platform quality and uncertainty" },
  { symbol: "ASML.AS", name: "ASML", market: "EURONEXT · EUR", tag: "Full learning case", lesson: "Quality, cyclicality and price" },
];

const journey = [
  { number: "01", icon: <Lightbulb />, title: "Start with your hypothesis", text: "Tell Longview what caught your attention or what you currently believe. “I do not know” is a valid starting point." },
  { number: "02", icon: <Database />, title: "Separate evidence from narrative", text: "See what is observed, calculated, interpreted or missing—and which evidence challenges the opening idea." },
  { number: "03", icon: <Binary />, title: "Run the automatic Quant Lab", text: "Explore reverse DCF, scenario valuation, seeded uncertainty, factor proxies and historical risk without configuring a model." },
  { number: "04", icon: <FileText />, title: "Read an educational opinion", text: "Longview publishes a standardised thesis, counter-thesis and model view with assumptions and uncertainty in plain sight." },
  { number: "05", icon: <BookOpen />, title: "Understand before exporting", text: "A short debrief reconstructs the journey from your first idea to the final opinion and unlocks the complete learning piece." },
];

export default function Home() {
  return (
    <main>
      <section className="publication-hero">
        <div className="publication-hero-copy">
          <div className="eyebrow"><span>LIFE AGENT · SINGAPORE 2026</span><i>Independent educational publication</i></div>
          <h1>See how a stock opinion is <em>built.</em></h1>
          <p>Longview turns your curiosity about a company into a guided lesson through evidence, market expectations and institutional quant methods—without deciding whether you should invest.</p>
          <SecuritySearch />
          <div className="search-hints">
            <span><CheckCircle2 /> Global security resolution</span>
            <span><CheckCircle2 /> Complete no-LLM path</span>
            <span><CheckCircle2 /> No account required</span>
          </div>
        </div>

        <aside className="publication-cover">
          <header><span>LONGVIEW / EDUCATIONAL OPINION 001</span><i>MODEL VIEW</i></header>
          <div className="cover-company"><small>NVDA · NASDAQ · SAMPLE SNAPSHOT</small><h2>NVIDIA through a quant lens</h2><p>A transparent lesson in separating business strength from the expectations embedded in price.</p></div>
          <div className="cover-layers">
            <div><span>OBSERVED FACT</span><strong>Operating profile</strong><i>01</i></div>
            <div><span>CALCULATION</span><strong>Implied expectations</strong><i>02</i></div>
            <div><span>COUNTER-THESIS</span><strong>Execution required</strong><i>03</i></div>
            <div><span>MODEL OPINION</span><strong>Mixed evidence</strong><i>04</i></div>
          </div>
          <footer><ShieldCheck /><span>Generic educational commentary—not a transaction recommendation.</span></footer>
        </aside>

        <a className="scroll-cue" href="#journey"><ArrowDown /> Follow the learning journey</a>
      </section>

      <section className="trust-row publication-trust">
        <span>BUILT FOR SCEPTICAL LEARNERS</span>
        <div><Database />Source ledger</div>
        <div><Braces />Deterministic math</div>
        <div><Scale />Thesis and counter-thesis</div>
        <div><ShieldCheck />Non-personal by design</div>
      </section>

      <section className="journey-intro" id="journey">
        <header className="section-heading">
          <span>01 / THE JOURNEY</span>
          <h2>Education begins before the first calculation.</h2>
          <p>Your starting idea becomes the thread through the entire lesson. It changes what Longview explains—not the standardised financial opinion.</p>
        </header>
        <div className="journey-home-grid">
          {journey.map((step) => (
            <article key={step.number}>
              <header><span>{step.number}</span>{step.icon}</header>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="editorial-promise">
        <div>
          <span>02 / EDITORIAL ARCHITECTURE</span>
          <h2>Facts are not calculations. Calculations are not opinions.</h2>
          <p>Longview marks every claim by layer so the reader can see exactly where observation ends and interpretation begins.</p>
          <Link href="/editorial-policy">Read the editorial policy <ArrowRight /></Link>
        </div>
        <div className="layer-stack">
          <article><i>01</i><Database /><span>OBSERVED FACT</span><strong>Directly attributable information</strong></article>
          <article><i>02</i><Binary /><span>DETERMINISTIC CALCULATION</span><strong>Reproducible formula output</strong></article>
          <article><i>03</i><BookOpen /><span>SOURCE INTERPRETATION</span><strong>A cited party’s explanation</strong></article>
          <article><i>04</i><Lightbulb /><span>LONGVIEW MODEL OPINION</span><strong>Generic educational commentary</strong></article>
        </div>
      </section>

      <section className="quant-promise">
        <header className="section-heading">
          <span>03 / THE QUANT LAB</span>
          <h2>Institutional methods, translated.</h2>
          <p>The arithmetic runs locally and reproducibly. Gemini can help teach, but it never owns canonical numbers or the model range.</p>
        </header>
        <div className="quant-method-grid">
          <article><span>EXPECTATIONS</span><Braces /><h3>Reverse DCF</h3><p>Solve backwards from price to reveal the cash-flow growth implied by stated assumptions.</p></article>
          <article><span>VALUATION</span><FlaskConical /><h3>Scenario grid</h3><p>Observe how growth and discount rates change a mechanical valuation range.</p></article>
          <article><span>UNCERTAINTY</span><Binary /><h3>Monte Carlo</h3><p>Inspect a seeded distribution across uncertain inputs instead of one confident number.</p></article>
          <article><span>SYSTEMATIC</span><Scale /><h3>Factor lens</h3><p>Learn how value, quality, momentum and volatility describe historical characteristics.</p></article>
        </div>
        <Link className="method-link" href="/methodology">Inspect formulas and model boundaries <ArrowRight /></Link>
      </section>

      <section className="samples-section" id="sample-cases">
        <header className="section-heading">
          <span>04 / TIMESTAMPED CASE DESK</span>
          <h2>Begin with a complete learning case.</h2>
          <p>Frozen, clearly labelled examples keep the hackathon path reliable while demonstrating different exchanges, currencies and model boundaries.</p>
        </header>
        <div className="sample-grid sample-grid-new">
          {samples.map((sample) => (
            <Link href={`/research/${sample.symbol}`} key={sample.symbol}>
              <header><strong>{sample.symbol}</strong><i>{sample.tag}</i></header>
              <h3>{sample.name}</h3>
              <p>{sample.market}</p>
              <small>{sample.lesson}</small>
              <span>BEGIN GUIDED ANALYSIS <ArrowRight /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="final-cta publication-cta">
        <span>FROM CURIOSITY TO QUANT LITERACY</span>
        <h2>What would you like to understand?</h2>
        <SecuritySearch />
        <p>Longview does not ask about your portfolio, finances, objectives or risk tolerance.</p>
      </section>
    </main>
  );
}
