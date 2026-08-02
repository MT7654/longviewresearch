"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle, Binary, BookOpen, BrainCircuit, Check,
  CircleHelp, Database, FileDown, FlaskConical, Gauge, LoaderCircle, RefreshCcw, ShieldCheck, Sparkles,
} from "lucide-react";
import { SecuritySearch } from "@/components/security-search";
import type { SecurityResearch, TutorResponse, ValuationAssumptions } from "@/lib/domain";
import { dcfPerShare, factorLens, monteCarloValuation, relativeValue, reverseDcfGrowth, riskMetrics } from "@/lib/quant";

const fallbackAssumptions: ValuationAssumptions = {
  fcfPerShare: 0,
  forecastYears: 5,
  growthRate: 0.12,
  discountRate: 0.1,
  terminalGrowth: 0.03,
  netDebtPerShare: 0,
  eps: 0,
  targetPe: 25,
};

export function ResearchWorkspace({ symbol }: { symbol: string }) {
  const [research, setResearch] = useState<SecurityResearch | null>(null);
  const [assumptions, setAssumptions] = useState(fallbackAssumptions);
  const [tutor, setTutor] = useState<TutorResponse | null>(null);
  const [tutorLoading, setTutorLoading] = useState(false);
  const [quiz, setQuiz] = useState<Record<number, number>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`/api/securities?symbol=${encodeURIComponent(symbol)}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "The security could not be loaded.");
        return body as SecurityResearch;
      })
      .then((body) => {
        if (!alive) return;
        setResearch(body);
        setAssumptions({
          fcfPerShare: body.fundamentals.fcfPerShare ?? 0,
          forecastYears: 5,
          growthRate: body.fundamentals.revenueGrowth ?? 0.12,
          discountRate: 0.1,
          terminalGrowth: 0.03,
          netDebtPerShare: body.fundamentals.netDebtPerShare ?? 0,
          eps: body.fundamentals.eps ?? 0,
          targetPe: body.fundamentals.peerPeMedian ?? 25,
        });
      })
      .catch((caught) => alive && setError(caught instanceof Error ? caught.message : "The security could not be loaded."));
    return () => { alive = false; };
  }, [symbol]);

  const valuation = useMemo(() => dcfPerShare(assumptions), [assumptions]);
  const reverseGrowth = useMemo(() => research?.price ? reverseDcfGrowth(research.price, assumptions) : null, [research, assumptions]);
  const relative = useMemo(() => relativeValue(assumptions.eps, assumptions.targetPe), [assumptions.eps, assumptions.targetPe]);
  const simulation = useMemo(() => monteCarloValuation(assumptions), [assumptions]);
  const factors = useMemo(
    () => research ? factorLens(research.price, assumptions, research.fundamentals.roic, research.fundamentals.operatingMargin, research.priceHistory) : [],
    [research, assumptions],
  );
  const risk = useMemo(() => research ? riskMetrics(research.priceHistory) : null, [research]);

  async function askTutor() {
    if (!research) return;
    setTutorLoading(true);
    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          symbol: research.identity.symbol,
          price: research.price,
          dcfValue: valuation,
          growthRate: assumptions.growthRate,
          discountRate: assumptions.discountRate,
          terminalGrowth: assumptions.terminalGrowth,
          fcfPerShare: assumptions.fcfPerShare,
          coverage: research.coverage,
        }),
      });
      if (!response.ok) throw new Error("Tutor unavailable");
      setTutor(await response.json() as TutorResponse);
    } catch {
      setTutor({
        mode: "deterministic",
        summary: "The calculation desk remains available, but the optional model challenger is temporarily unavailable.",
        pressurePoints: ["Check the source behind free cash flow per share.", "Test a wider discount-rate range.", "Compare how much of the result comes from terminal value."],
        lesson: "A robust valuation is a range supported by traceable assumptions—not an answer produced by one model.",
      });
    } finally {
      setTutorLoading(false);
    }
  }

  if (error) return <main className="workspace-shell"><div className="fatal-card"><AlertTriangle /><h1>Research desk unavailable</h1><p>{error}</p><SecuritySearch compact /></div></main>;
  if (!research) return <main className="workspace-shell"><div className="loading-desk"><LoaderCircle className="spin" /><span>RESOLVING GLOBAL SECURITY</span><h1>Checking listing, exchange and available evidence…</h1></div></main>;

  const priceChange = research.price && research.previousClose ? research.price / research.previousClose - 1 : null;
  const currency = research.identity.currency === "—" ? "" : research.identity.currency;
  const formatMoney = (value: number | null) => value === null || !Number.isFinite(value) ? "Unavailable" : `${currency} ${value.toFixed(value >= 100 ? 0 : 2)}`;
  const scored = Object.keys(quiz).length === 3 ? Number(quiz[0] === 1) + Number(quiz[1] === 2) + Number(quiz[2] === 0) : null;

  return (
    <main className="workspace-shell">
      <div className="workspace-top">
        <SecuritySearch compact />
        <button onClick={() => window.print()} className="quiet-button"><FileDown /> Export learning report</button>
      </div>

      <section className="security-hero">
        <div className="security-title">
          <span className="listing-code">{research.identity.symbol}</span>
          <div><p>{research.identity.exchange} · {research.identity.country} · {research.identity.currency}</p><h1>{research.identity.name}</h1></div>
        </div>
        <div className="price-block">
          <small>REFERENCE PRICE</small>
          <strong>{research.price === null ? "—" : formatMoney(research.price)}</strong>
          {priceChange !== null && <span className={priceChange >= 0 ? "positive" : "negative"}>{priceChange >= 0 ? "+" : ""}{(priceChange * 100).toFixed(2)}% vs previous close</span>}
          <i>{research.asOf}</i>
        </div>
        <div className="mode-stamp"><span>{research.mode === "sample" ? "SAMPLE CASE" : research.mode === "live" ? "LIVE PUBLIC PRICE" : "UNVERIFIED"}</span><small>{research.note}</small></div>
      </section>

      <nav className="desk-nav" aria-label="Research desk sections">
        <a href="#overview">Overview</a><a href="#expectations">Expectations</a><a href="#valuation">Valuation lab</a><a href="#factors">Factor lens</a><a href="#sources">Sources</a><a href="#learn">What you learned</a>
      </nav>

      <section className="desk-section" id="overview">
        <header className="desk-heading"><span>01 / COVERAGE</span><div><h2>Know what the model knows.</h2><p>Longview checks coverage before calculating. Missing inputs disable a method instead of being silently invented.</p></div></header>
        <div className="coverage-grid">
          <Coverage label="Security identity" ready={research.coverage.identity} detail={`${research.identity.symbol} · ${research.identity.exchange}`} />
          <Coverage label="Price reference" ready={research.coverage.price} detail={research.asOf} />
          <Coverage label="Price history" ready={research.coverage.history} detail={`${research.priceHistory.length} monthly observations`} />
          <Coverage label="Fundamentals" ready={research.coverage.fundamentals} detail={research.coverage.fundamentals ? "Model-ready demo inputs" : "Manual sourced inputs required"} />
          <Coverage label="Peer context" ready={research.coverage.peers} detail={research.coverage.peers ? "Illustrative comparison band" : "Relative range unavailable"} />
        </div>
        <div className="workflow-ribbon">
          {["Resolve", "Validate", "Model", "Challenge", "Teach"].map((step, index) => <div key={step}><span>0{index + 1}</span><strong>{step}</strong><i>{index < 2 ? "Complete" : "Ready"}</i></div>)}
        </div>
      </section>

      <section className="desk-section dark-section" id="expectations">
        <header className="desk-heading"><span>02 / MARKET-IMPLIED EXPECTATIONS</span><div><h2>Work backwards from the price.</h2><p>Reverse DCF asks what constant free-cash-flow growth would make today’s reference price mathematically consistent with your other assumptions.</p></div></header>
        <div className="expectation-grid">
          <div className="big-reading">
            <small>IMPLIED ANNUAL FCF GROWTH</small>
            <strong>{reverseGrowth === null ? "—" : `${(reverseGrowth * 100).toFixed(1)}%`}</strong>
            <p>{reverseGrowth === null ? "Add positive free cash flow per share and a reference price to unlock this calculation." : `For ${assumptions.forecastYears} forecast years, with a ${(assumptions.discountRate * 100).toFixed(1)}% discount rate and ${(assumptions.terminalGrowth * 100).toFixed(1)}% terminal growth.`}</p>
          </div>
          <div className="formula-card">
            <span>MODEL / REVERSE DCF</span>
            <code>Price = Σ FCFₜ / (1+r)ᵗ + TV / (1+r)ⁿ − net debt/share</code>
            <p>Longview solves for growth <b>g</b>. It does not claim the company will achieve it.</p>
            <div><Gauge /><span><strong>Interpretation</strong> Higher implied growth means more future execution may already be reflected in the reference price.</span></div>
          </div>
        </div>
      </section>

      <section className="desk-section" id="valuation">
        <header className="desk-heading"><span>03 / VALUATION LAB</span><div><h2>Change the assumptions. Watch the range move.</h2><p>Inputs are editable because valuation is conditional. Use dated, sourced figures before treating any output as informative.</p></div></header>
        {!research.coverage.fundamentals && (
          <div className="boundary-banner"><AlertTriangle /><div><strong>Partial-data mode</strong><p>Public price history loaded, but canonical fundamentals are unavailable. Enter a sourced FCF/share and EPS below to explore the mechanics.</p></div></div>
        )}
        <div className="valuation-layout">
          <aside className="assumption-panel">
            <header><FlaskConical /><div><strong>MODEL ASSUMPTIONS</strong><small>Values apply to this browser session only</small></div></header>
            <NumberField label="FCF per share" value={assumptions.fcfPerShare} step={0.1} onChange={(value) => setAssumptions({ ...assumptions, fcfPerShare: value })} />
            <RangeField label="Forecast growth" value={assumptions.growthRate} min={-0.1} max={0.4} step={0.005} percent onChange={(value) => setAssumptions({ ...assumptions, growthRate: value })} />
            <RangeField label="Discount rate" value={assumptions.discountRate} min={0.06} max={0.18} step={0.005} percent onChange={(value) => setAssumptions({ ...assumptions, discountRate: value })} />
            <RangeField label="Terminal growth" value={assumptions.terminalGrowth} min={0} max={0.06} step={0.0025} percent onChange={(value) => setAssumptions({ ...assumptions, terminalGrowth: value })} />
            <RangeField label="Forecast years" value={assumptions.forecastYears} min={3} max={10} step={1} onChange={(value) => setAssumptions({ ...assumptions, forecastYears: value })} />
            <NumberField label="Net debt / share" value={assumptions.netDebtPerShare} step={0.1} onChange={(value) => setAssumptions({ ...assumptions, netDebtPerShare: value })} />
            <div className="field-pair">
              <NumberField label="EPS" value={assumptions.eps} step={0.1} onChange={(value) => setAssumptions({ ...assumptions, eps: value })} />
              <NumberField label="Comparison P/E" value={assumptions.targetPe} step={1} onChange={(value) => setAssumptions({ ...assumptions, targetPe: value })} />
            </div>
            <button className="reset-button" onClick={() => setAssumptions({
              ...fallbackAssumptions,
              fcfPerShare: research.fundamentals.fcfPerShare ?? 0,
              eps: research.fundamentals.eps ?? 0,
              growthRate: research.fundamentals.revenueGrowth ?? 0.12,
              netDebtPerShare: research.fundamentals.netDebtPerShare ?? 0,
              targetPe: research.fundamentals.peerPeMedian ?? 25,
            })}><RefreshCcw /> Reset model</button>
          </aside>

          <div className="valuation-output">
            <div className="model-cards">
              <ModelCard label="Scenario DCF" value={formatMoney(valuation)} note="Present value of modelled per-share cash flows" active={valuation !== null} />
              <ModelCard label="Relative value" value={formatMoney(relative)} note={`${assumptions.targetPe.toFixed(1)}× entered comparison multiple`} active={relative !== null} />
              <ModelCard label="Monte Carlo median" value={formatMoney(valuation === null ? null : simulation.median)} note={valuation === null ? "Requires positive FCF/share" : `${formatMoney(simulation.p10)} – ${formatMoney(simulation.p90)} P10–P90`} active={valuation !== null} />
            </div>

            <article className="chart-card">
              <header><div><span>VALUATION DISTRIBUTION</span><h3>1,600 seeded simulations</h3></div><small>Not a forecast probability</small></header>
              {valuation === null ? <EmptyModel /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={simulation.buckets}>
                    <defs><linearGradient id="simulationFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c7ff4a" stopOpacity={0.65} /><stop offset="100%" stopColor="#c7ff4a" stopOpacity={0.03} /></linearGradient></defs>
                    <CartesianGrid stroke="#27312e" vertical={false} />
                    <XAxis dataKey="label" stroke="#788680" tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: "#111916", border: "1px solid #34423d", color: "#fff" }} />
                    {research.price && <ReferenceLine x={String(Math.round(research.price))} stroke="#ffb36b" />}
                    <Area type="monotone" dataKey="count" stroke="#c7ff4a" fill="url(#simulationFill)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              <footer><span><i className="dot lime" /> Simulated model values</span><span><i className="dot amber" /> Reference price may fall between buckets</span></footer>
            </article>

            <article className="sensitivity-card">
              <header><div><span>SENSITIVITY MATRIX</span><h3>Growth × discount rate</h3></div><small>{currency} / share</small></header>
              <SensitivityMatrix assumptions={assumptions} />
            </article>
          </div>
        </div>
      </section>

      <section className="desk-section factor-section" id="factors">
        <header className="desk-heading"><span>04 / FACTOR LENS</span><div><h2>Describe characteristics, not destiny.</h2><p>These transparent proxies borrow from systematic investing. They are descriptive rankings—not a Fama–French regression and not a trading signal.</p></div></header>
        <div className="factor-layout">
          <div className="factor-list">
            {factors.map((factor) => (
              <div key={factor.label}><header><strong>{factor.label}</strong><span>{factor.score.toFixed(0)} / 100</span></header><i><b style={{ width: `${factor.score}%` }} /></i><p>{factor.detail}</p></div>
            ))}
          </div>
          <div className="risk-panel">
            <span>HISTORICAL RISK SNAPSHOT</span>
            <div className="risk-readings">
              <div><small>Annualised return*</small><strong>{risk ? `${(risk.annualReturn * 100).toFixed(1)}%` : "—"}</strong></div>
              <div><small>Annualised volatility</small><strong>{risk ? `${(risk.volatility * 100).toFixed(1)}%` : "—"}</strong></div>
              <div><small>Return / volatility</small><strong>{risk ? risk.sharpe.toFixed(2) : "—"}</strong></div>
              <div><small>Maximum drawdown</small><strong>{risk ? `${(risk.maxDrawdown * 100).toFixed(1)}%` : "—"}</strong></div>
            </div>
            {research.priceHistory.length > 2 && (
              <ResponsiveContainer width="100%" height={170}>
                <LineChart data={research.priceHistory}>
                  <XAxis dataKey="date" hide /><YAxis hide /><Tooltip contentStyle={{ background: "#111916", border: "1px solid #34423d", color: "#fff" }} />
                  <Line dataKey="close" type="monotone" dot={false} stroke="#8bd4ff" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
            <small>*Arithmetic annualisation of monthly observations. Past behaviour does not predict future outcomes.</small>
          </div>
        </div>
      </section>

      <section className="desk-section challenge-section">
        <header className="desk-heading"><span>05 / MODEL CHALLENGER</span><div><h2>Ask the agent to attack the assumptions.</h2><p>One bounded Gemini call critiques the model. Free-tier limits are respected; a deterministic tutor takes over if inference is unavailable.</p></div></header>
        <div className="challenge-box">
          <div className="challenge-intro"><BrainCircuit /><div><strong>QUANT TUTOR</strong><p>Uses public company context and non-personal assumptions only.</p></div><button disabled={tutorLoading} onClick={askTutor}>{tutorLoading ? <><LoaderCircle className="spin" /> Challenging…</> : <><Sparkles /> Challenge this model</>}</button></div>
          {tutor ? (
            <div className="tutor-output">
              <span>{tutor.mode === "gemini" ? `GEMINI · ${tutor.model}` : "DETERMINISTIC FALLBACK"}</span>
              <h3>{tutor.summary}</h3>
              <ul>{tutor.pressurePoints.map((point) => <li key={point}>{point}</li>)}</ul>
              <p><BookOpen /> {tutor.lesson}</p>
            </div>
          ) : <div className="challenge-placeholder"><Binary /><span>The arithmetic is already complete. The optional tutor adds critique—not numbers.</span></div>}
        </div>
      </section>

      <section className="desk-section" id="sources">
        <header className="desk-heading"><span>06 / SOURCE & ASSUMPTION LEDGER</span><div><h2>Trace the evidence boundary.</h2><p>Sample inputs are deliberately labelled. Live public price history never pretends to include fundamentals it does not have.</p></div></header>
        <div className="source-table">
          <header><span>INPUT / SOURCE</span><span>PUBLISHER</span><span>AS OF</span><span>TYPE</span></header>
          {research.sources.length ? research.sources.map((source) => (
            <a href={source.url} key={`${source.label}-${source.url}`} target={source.url.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
              <span><Database />{source.label}</span><span>{source.publisher}</span><span>{source.asOf}</span><span>{source.kind.toUpperCase()} ↗</span>
            </a>
          )) : <div className="no-sources"><AlertTriangle /> No source records are available for this unresolved symbol.</div>}
        </div>
        <div className="assumption-ledger">
          <span>USER-CONTROLLED MODEL INPUTS</span>
          <div>{Object.entries({
            "FCF / share": assumptions.fcfPerShare,
            "Growth": `${(assumptions.growthRate * 100).toFixed(1)}%`,
            "Discount": `${(assumptions.discountRate * 100).toFixed(1)}%`,
            "Terminal growth": `${(assumptions.terminalGrowth * 100).toFixed(1)}%`,
            "Net debt / share": assumptions.netDebtPerShare,
            "EPS": assumptions.eps,
            "Comparison P/E": assumptions.targetPe,
          }).map(([label, value]) => <p key={label}><small>{label}</small><strong>{value}</strong></p>)}</div>
        </div>
      </section>

      <section className="desk-section learn-section" id="learn">
        <header className="desk-heading"><span>07 / LEARNING CHECK</span><div><h2>Can you challenge the output?</h2><p>The Life Agent outcome is understanding—not acceptance of a number.</p></div></header>
        <div className="quiz-grid">
          <QuizQuestion number={0} question="What does reverse DCF estimate?" options={["Tomorrow’s price", "Growth implied by a price", "The correct portfolio weight"]} answer={quiz[0]} onAnswer={(answer) => setQuiz({ ...quiz, 0: answer })} />
          <QuizQuestion number={1} question="What does the Monte Carlo range mean?" options={["Guaranteed outcomes", "Market consensus", "Outputs under sampled assumptions"]} answer={quiz[1]} onAnswer={(answer) => setQuiz({ ...quiz, 1: answer })} />
          <QuizQuestion number={2} question="What should happen when fundamentals are missing?" options={["Disable affected models", "Let AI estimate them invisibly", "Use the last company’s data"]} answer={quiz[2]} onAnswer={(answer) => setQuiz({ ...quiz, 2: answer })} />
        </div>
        {scored !== null && <div className="quiz-result"><ShieldCheck /><div><strong>{scored}/3 concepts understood</strong><p>{scored === 3 ? "You are reading the model as a sceptical analyst." : "Review the highlighted method notes, then try again."}</p></div></div>}
      </section>

      <section className="regulatory-close">
        <ShieldCheck />
        <div><span>GENERAL-CIRCULATION EDUCATIONAL INFORMATION</span><h2>This research desk does not know whether an investment is suitable for you.</h2><p>It does not consider your objectives, financial situation, holdings or needs. Outputs are assumption-driven illustrations, not recommendations, offers or predictions. Consult a licensed financial adviser before making an investment decision.</p></div>
      </section>
    </main>
  );
}

function Coverage({ label, ready, detail }: { label: string; ready: boolean; detail: string }) {
  return <article className={ready ? "ready" : "limited"}><span>{ready ? <Check /> : <AlertTriangle />}{ready ? "AVAILABLE" : "LIMITED"}</span><h3>{label}</h3><p>{detail}</p></article>;
}

function RangeField({ label, value, min, max, step, percent = false, onChange }: { label: string; value: number; min: number; max: number; step: number; percent?: boolean; onChange: (value: number) => void }) {
  return <label className="range-field"><span>{label}<strong>{percent ? `${(value * 100).toFixed(1)}%` : value}</strong></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function NumberField({ label, value, step, onChange }: { label: string; value: number; step: number; onChange: (value: number) => void }) {
  return <label className="number-field"><span>{label}</span><input type="number" value={value} step={step} onChange={(event) => onChange(Number(event.target.value) || 0)} /></label>;
}

function ModelCard({ label, value, note, active }: { label: string; value: string; note: string; active: boolean }) {
  return <article className={active ? "" : "inactive"}><span>{label}</span><strong>{value}</strong><p>{note}</p></article>;
}

function EmptyModel() {
  return <div className="empty-model"><CircleHelp /><strong>Model waiting for a valid input</strong><p>Enter positive free cash flow per share and keep the discount rate above terminal growth.</p></div>;
}

function SensitivityMatrix({ assumptions }: { assumptions: ValuationAssumptions }) {
  const growthRates = [-0.04, -0.02, 0, 0.02, 0.04].map((offset) => assumptions.growthRate + offset);
  const discountRates = [-0.02, -0.01, 0, 0.01, 0.02].map((offset) => Math.max(assumptions.terminalGrowth + 0.015, assumptions.discountRate + offset));
  return (
    <div className="matrix">
      <div className="matrix-row matrix-head"><i /><span>G −4%</span><span>G −2%</span><span>BASE G</span><span>G +2%</span><span>G +4%</span></div>
      {discountRates.map((discount, row) => (
        <div className="matrix-row" key={discount}>
          <i>R {(discount * 100).toFixed(1)}%</i>
          {growthRates.map((growth, column) => {
            const value = dcfPerShare({ ...assumptions, growthRate: growth, discountRate: discount });
            return <span className={row === 2 && column === 2 ? "base-cell" : ""} key={growth}>{value === null ? "—" : value.toFixed(value >= 100 ? 0 : 1)}</span>;
          })}
        </div>
      ))}
    </div>
  );
}

function QuizQuestion({ number, question, options, answer, onAnswer }: { number: number; question: string; options: string[]; answer?: number; onAnswer: (answer: number) => void }) {
  return <article><span>0{number + 1}</span><h3>{question}</h3><div>{options.map((option, index) => <button className={answer === index ? "selected" : ""} onClick={() => onAnswer(index)} key={option}>{answer === index && <Check />}{option}</button>)}</div></article>;
}
