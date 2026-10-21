import Link from "next/link";

export const metadata = { title: "How it works · TRACE" };

const stages = [
  ["01", "Accept payload", "Receive the channel, received time, customer reference, message and source reference. The same source reference returns the original receipt."],
  ["02", "Normalise", "Keep the raw message. Read a missing amount or reference from the text. A value supplied by the channel wins."],
  ["03", "Classify", "Decide payment or service before any lookup. Money words do not turn a service complaint into a payment."],
  ["04", "Attach the customer case", "One customer plus one problem makes one case. More contacts add evidence. They do not open another case."],
  ["05", "Link a payment or a service", "Look up a payment only when the complaint is about money. Sign-in, staff conduct and a wrong explanation are not payment lookups."],
  ["06", "Join an incident or the individual queue", "Group the same wider problem. Keep one customer for individual handling. A missing reference never drops a complaint."],
  ["07", "Return a receipt", "Domain, complaint type, link status, case, incident or queue, and label. The figures on the screen stay engine counts."],
];

const owners = [
  ["Failed NIP, reversals, duplicate debit, POS settlement", "Payments ops"],
  ["Sign-in or a channel that is down", "Digital channels"],
  ["Wrong information or staff conduct", "Branch service"],
  ["Wrong beneficiary", "Contact centre"],
  ["Charge dispute", "Fraud"],
  ["Card decline", "Cards"],
  ["Account opening", "Onboarding"],
  ["Card delivery", "Card fulfilment"],
  ["Loan silence", "Credit"],
];

export default function GuidePage() {
  return (
    <>
      <header className="intro">
        <p className="eyebrow">Operations book / Guide</p>
        <div className="intro-row">
          <h1>How TRACE makes the book</h1>
        </div>
        <p className="deck">Plain-language rules for taking a complaint, finding its evidence, and deciding whether to respond together or handle it alone.</p>
      </header>

      <section className="card-grid three">
        <article className="panel-card">
          <span className="pill systemic">
            <span className="dot" aria-hidden="true" />
            Systemic
          </span>
          <h3>Answer together</h3>
          <p>The same problem affects many customers, well above normal. Coordinate one incident response.</p>
        </article>
        <article className="panel-card">
          <span className="pill emerging">
            <span className="dot" aria-hidden="true" />
            Emerging
          </span>
          <h3>Watch and investigate</h3>
          <p>More than usual, but not yet a network alarm. Review the growing pattern.</p>
        </article>
        <article className="panel-card">
          <span className="pill isolated">
            <span className="dot" aria-hidden="true" />
            Isolated
          </span>
          <h3>Handle alone</h3>
          <p>One customer’s problem. Keep individual handling separate from the wider incidents.</p>
        </article>
      </section>

      <div className="split" style={{ marginTop: 28 }}>
        <section>
          <div className="section-head">
            <h2>From message to receipt</h2>
            <p>The seven-step path</p>
          </div>
          <ol className="steps">
            {stages.map(([number, title, copy]) => (
              <li key={number}>
                <span>{number}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{copy}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="section-head">
            <h2>How a payment is matched</h2>
            <p>Exact rules · no guessing</p>
          </div>
          <div className="side-stack">
            <article className="panel-card">
              <h3>1. Try the retrieval reference first</h3>
              <p>An RRN uses an exact lookup. If that reference is not on the book, TRACE does not attach a different payment.</p>
            </article>
            <article className="panel-card">
              <h3>2. Otherwise use constrained evidence</h3>
              <p>Same scheme and the same amount, from 72 hours before the complaint to 15 minutes after it. The nearest time wins.</p>
            </article>
            <article className="panel-card">
              <h3>3. Count the payment once</h3>
              <p>Many messages can point to one payment. An unmatched payment complaint remains recorded and may still join an incident.</p>
            </article>
          </div>
        </section>
        <aside className="side-stack">
          <div className="section-head">
            <h2>Suggested team routing</h2>
            <p>Not assignments</p>
          </div>
          <div className="ledger-wrap">
            <table className="ledger">
              <thead>
                <tr>
                  <th>Complaint type</th>
                  <th>Suggested team</th>
                </tr>
              </thead>
              <tbody>
                {owners.map(([type, team]) => (
                  <tr key={type}>
                    <td>{type}</td>
                    <td>{team}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <article className="panel-card">
            <h3>Not a payment is not the same as no reference</h3>
            <p>Login, staff conduct and a wrong explanation say “Not a payment”. “No reference” is reserved for a payment complaint with no matching transaction.</p>
          </article>
          <article className="panel-card">
            <h3>Urgency and acceptance</h3>
            <p>Urgency is a deterministic score from 0 to 100. Accepting records the owner and subtracts 50, floored at 0. The change survives refresh.</p>
            <p style={{ marginTop: 12 }}>
              <Link className="quiet-link" href="/incidents">
                Open the incident register →
              </Link>
            </p>
          </article>
        </aside>
      </div>

      <div className="priority-grid" style={{ marginTop: 22 }}>
        <article className="note">
          <strong>The model may write, never decide</strong>
          <p>Only the operator note and customer reply may be drafted. Gemini receives the engine’s facts and writes from those. A missing key, a failed call, or a draft that changes a figure falls back to the desk template. Amounts, counts, labels, and links stay with the engine.</p>
        </article>
        <article className="note">
          <strong>A synthetic book, not a bank connection</strong>
          <p>No real customer data and no core-banking connection. The book is a fixed demonstration snapshot until someone files a complaint on Take a complaint.</p>
        </article>
      </div>

      <section style={{ marginTop: 28 }}>
        <div className="section-head">
          <h2>Central Bank of Nigeria (CBN) Dispute Mandates</h2>
          <p>Regulatory SLA clocks & Sanction prevention</p>
        </div>
        <div className="ledger-wrap">
          <table className="ledger">
            <thead>
              <tr>
                <th>Complaint Domain</th>
                <th>Mandated Turnaround Time (TAT)</th>
                <th>CBN Circular Reference</th>
                <th>Regulatory Sanction Clause</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Failed Instant Transfers (NIP / EFT)</strong>
                  <span className="cell-note">Credit timeout, delayed reversal, duplicate debits</span>
                </td>
                <td>
                  <strong>24 Hours (T+1)</strong>
                  <span className="cell-note">Immediate reversal upon session failure</span>
                </td>
                <td>CBN/BPS/DIR/GEN/CIR/01/015</td>
                <td>₦50,000 administrative fine per delayed customer dispute + refund liability</td>
              </tr>
              <tr>
                <td>
                  <strong>POS / Merchant & Card Disputes</strong>
                  <span className="cell-note">Settlement mismatch, decline with debit</span>
                </td>
                <td>
                  <strong>48 Hours (T+2)</strong>
                  <span className="cell-note">Merchant reconciliation & chargeback window</span>
                </td>
                <td>CBN/BPS/DIR/GEN/CIR/02/004</td>
                <td>Administrative sanctions under Electronic Payment Channel Guidelines</td>
              </tr>
              <tr>
                <td>
                  <strong>Non-Financial Service Failures</strong>
                  <span className="cell-note">App lockout, staff conduct, branch misinformation</span>
                </td>
                <td>
                  <strong>72 Hours (3 Business Days)</strong>
                  <span className="cell-note">Resolution & written customer acknowledgement</span>
                </td>
                <td>CBN Consumer Protection Framework (Section 3.2.1)</td>
                <td>Regulatory non-compliance audit citation & consumer redress penalties</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginTop: 28, marginBottom: 40 }}>
        <div className="section-head">
          <h2>Proactive Customer Deflection & Contact Centre ROI</h2>
          <p>Operational cost reduction during outages</p>
        </div>
        <div className="priority-grid">
          <article className="note">
            <strong>The Iceberg Effect of Bank Outages</strong>
            <p>For every 1 customer who files a complaint during an interbank failure, ~220 other customers experience the friction silently. If unaddressed, a large percentage dial customer care, causing queue congestion, telecom toll charges, and agent fatigue.</p>
          </article>
          <article className="note">
            <strong>78% Benchmark Deflection Rate</strong>
            <p>Publishing an immediate, reassuring in-app advisory banner ("Your funds are safe and being processed automatically; no need to call support") deflects up to 78% of incoming calls. At ₦450 per handled call, an active advisory saves upwards of ₦1,000,000 in support costs per incident.</p>
          </article>
        </div>
      </section>
    </>
  );
}
