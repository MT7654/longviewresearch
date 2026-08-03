import Link from "next/link";
import { ArrowRight, Binary, Database, FileCheck2, Scale, ShieldCheck } from "lucide-react";

const policies = [
  {
    icon: <Database />,
    title: "Source before synthesis",
    text: "Material claims must be attributable. Primary company disclosures and official data are preferred; secondary sources are identified; frozen demonstration inputs are never presented as live evidence.",
  },
  {
    icon: <Binary />,
    title: "Code owns the arithmetic",
    text: "Valuation, risk and factor outputs are calculated by deterministic TypeScript. A language model cannot set canonical inputs, silently fill missing values or alter the standardised opinion.",
  },
  {
    icon: <Scale />,
    title: "Publish the counter-case",
    text: "Every Educational Opinion Piece includes a thesis, counter-thesis, strongest supporting evidence, strongest challenging evidence, limitations and unresolved questions.",
  },
  {
    icon: <ShieldCheck />,
    title: "Generic education only",
    text: "Longview does not collect suitability information, recommend transactions, determine portfolio allocations, propose position sizes or tell a reader when to enter or exit a security.",
  },
  {
    icon: <FileCheck2 />,
    title: "No paid influence",
    text: "The hackathon publication accepts no issuer-sponsored coverage, broker referrals, affiliate commissions, pay-for-ranking or security-linked commercial consideration.",
  },
];

export default function EditorialPolicyPage() {
  return (
    <main className="policy-page">
      <section className="policy-hero">
        <span>LONGVIEW RESEARCH / GOVERNANCE</span>
        <h1>Editorial independence is a product feature.</h1>
        <p>Longview is designed as an independent public quant-literacy publication. This policy explains how it separates facts, calculations, source interpretation and model opinion.</p>
      </section>

      <section className="policy-content">
        <div className="policy-index">
          <span>POLICY VERSION 1.0</span>
          <p>Effective 3 August 2026</p>
          <nav>
            <a href="#mission">Mission</a>
            <a href="#layers">Editorial layers</a>
            <a href="#ai">AI use</a>
            <a href="#conflicts">Conflicts</a>
            <a href="#corrections">Corrections</a>
            <a href="#boundary">Educational boundary</a>
          </nav>
        </div>

        <article className="policy-article">
          <section id="mission">
            <span>01 / MISSION</span>
            <h2>Teach the process, not the transaction.</h2>
            <p>Longview helps a reader understand how institutional equity researchers and quant analysts frame questions, examine evidence, translate price into assumptions, stress models and communicate uncertainty.</p>
            <p>The publication’s success metric is whether a reader can challenge an analytical opinion—not whether they act on it.</p>
          </section>

          <section id="layers">
            <span>02 / EDITORIAL LAYERS</span>
            <h2>Every conclusion carries a label.</h2>
            <div className="policy-layer-list">
              <p><strong>Observed fact</strong><i>Directly attributable information or a clearly labelled frozen demonstration value.</i></p>
              <p><strong>Deterministic calculation</strong><i>A reproducible mathematical output from displayed inputs.</i></p>
              <p><strong>Source interpretation</strong><i>An explanation or claim made by an identified source.</i></p>
              <p><strong>Longview model opinion</strong><i>Generic editorial commentary produced from the standardised evidence and model record.</i></p>
            </div>
          </section>

          <section>
            <span>03 / OPERATING RULES</span>
            <h2>Five commitments govern every piece.</h2>
            <div className="policy-card-grid">
              {policies.map((policy) => <div key={policy.title}>{policy.icon}<h3>{policy.title}</h3><p>{policy.text}</p></div>)}
            </div>
          </section>

          <section id="ai">
            <span>04 / AI USE</span>
            <h2>Gemini may teach. It may not own the facts.</h2>
            <p>The optional tutor receives only non-personal model inputs and calculated outputs. It can produce a bounded plain-language critique. The complete application remains usable without an API call.</p>
            <ul>
              <li>No personal financial information is intentionally sent to the model.</li>
              <li>No generated number becomes a canonical financial input.</li>
              <li>No model output can create a buy, sell or hold conclusion.</li>
              <li>Rate limits degrade to a deterministic local tutor rather than breaking the lesson.</li>
            </ul>
          </section>

          <section id="conflicts">
            <span>05 / CONFLICTS & COMMERCIAL INFLUENCE</span>
            <h2>Coverage cannot be bought.</h2>
            <p>Every opinion includes an interests declaration. The hackathon build declares no issuer compensation, sponsored coverage, broker referral, model-specific advertising or security-linked consideration.</p>
            <p>Any future subscription model, partnership or monetisation would require a new conflict review and Singapore legal review before release.</p>
          </section>

          <section id="corrections">
            <span>06 / CORRECTIONS & VERSIONS</span>
            <h2>Changed evidence should leave a trail.</h2>
            <p>Each piece records a data date, source ledger and methodology version. Production versions must display corrections and preserve the reason an opinion changed instead of silently rewriting history.</p>
          </section>

          <section id="boundary">
            <span>07 / EDUCATIONAL BOUNDARY</span>
            <h2>Longview does not know what belongs in your portfolio.</h2>
            <p>The service does not consider objectives, financial situation, holdings, needs, time horizon, loss capacity or risk tolerance. It does not provide position sizes, transaction timing or suitability assessments.</p>
            <p>Model-derived ranges are sensitivity outputs under stated assumptions. They are not recommended target prices or predictions that a security will trade at a displayed value.</p>
          </section>

          <div className="policy-legal-note">
            <ShieldCheck />
            <p>This policy is a design control, not a legal opinion or regulatory approval. Singapore-qualified legal review is required before commercial release of arbitrary live-security model opinions.</p>
          </div>

          <Link className="policy-action" href="/research/NVDA">See the policy applied to a sample <ArrowRight /></Link>
        </article>
      </section>
    </main>
  );
}
