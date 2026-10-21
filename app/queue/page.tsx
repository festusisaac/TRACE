import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { LiveDuration } from "@/components/live-duration";
import { Mark } from "@/components/mark";
import { openBook } from "@/lib/desk";
import { assessAllCbnSla } from "@/lib/engine/cbn.ts";
import { ownerFor } from "@/lib/engine/signature.ts";
import { openPatterns } from "@/lib/explain.ts";
import { complaintName, naira } from "@/lib/format.ts";

export const metadata = { title: "Work to do · TRACE" };

async function Queue() {
  await connection();
  const book = await openBook();
  const waiting = openPatterns(book);
  const accepted = book.incidents.filter((incident) => incident.acknowledged).length;
  const cbnAssessments = assessAllCbnSla(book.incidents, book.interactions, new Date().toISOString());

  return (
    <>
      <header className="intro">
        <p className="eyebrow">Operations book / Queue</p>
        <div className="intro-row">
          <h1>Work to do</h1>
        </div>
        <p className="deck">Coordinate the wider problems first, then work the individual complaints. Suggested teams are not recorded owners until someone accepts.</p>
      </header>

      <section className="stat-row three">
        <div className="stat">
          <strong>{waiting.length}</strong>
          <span>Wider problems</span>
          <em>
            {waiting.filter((incident) => incident.label === "systemic").length} Systemic + {waiting.filter((incident) => incident.label === "emerging").length} Emerging
          </em>
        </div>
        <div className="stat">
          <strong>{book.queue.length}</strong>
          <span>Individual complaints</span>
          <em>Separate isolated customer work</em>
        </div>
        <div className="stat">
          <strong>{accepted}</strong>
          <span>Accepted groups</span>
          <em>Acceptance records an owner. It does not close the complaint.</em>
        </div>
      </section>

      <section className="note">
        <strong>Review → accept → investigate → respond</strong>
        <p>Acceptance records an owner. It does not resolve the complaint. New messages about an accepted problem are answered from that incident.</p>
      </section>

      <div className="section-head">
        <h2>Wider response first</h2>
        <p>Systemic + emerging</p>
      </div>
      <div className="ledger-wrap">
        <table className="ledger">
          <thead>
            <tr>
              <th>Problem / reading</th>
              <th>Customer impact</th>
              <th>Money or service impact</th>
              <th>CBN SLA Clock</th>
              <th>Suggested team</th>
              <th>Next action</th>
            </tr>
          </thead>
          <tbody>
            {waiting.map((incident) => {
              const assessment = cbnAssessments.get(incident.id);
              const statusColor =
                assessment?.status === "breached"
                  ? "var(--systemic)"
                  : assessment?.status === "warning"
                    ? "var(--emerging)"
                    : "var(--isolated)";

              return (
                <tr key={incident.id}>
                  <td>
                    <Link href={`/incidents/${incident.id}`}>{incident.title}</Link>
                    <span className="cell-note">
                      <Mark label={incident.label} /> · urgency {incident.priority} / 100
                    </span>
                  </td>
                  <td>
                    {incident.customers} customers
                    <span className="cell-note">{incident.interactionCount} messages</span>
                  </td>
                  <td>{incident.domain === "payment" ? `${naira(incident.valueInFlight)} outstanding` : "Service access · ₦0 exposure"}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: statusColor, fontFamily: "var(--font-mono), monospace" }}>
                      <LiveDuration
                        deadlineAt={assessment?.deadlineAt}
                        fallback={assessment?.statusText ?? "—"}
                        showSeconds={false}
                      />
                    </span>
                    <span className="cell-note">
                      {assessment?.mandatedSlaHours}h mandate · {assessment?.circularRef}
                    </span>
                  </td>
                  <td>{incident.owner}</td>
                  <td>
                    <Link href={`/incidents/${incident.id}`}>Open and accept →</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="section-head">
        <h2>Then handle individual work</h2>
        <p>Isolated · do not merge</p>
      </div>
      <div className="ledger-wrap">
        <table className="ledger">
          <thead>
            <tr>
              <th>Customer / complaint</th>
              <th>Reading</th>
              <th>Evidence</th>
              <th>Suggested team</th>
              <th>Next action</th>
            </tr>
          </thead>
          <tbody>
            {book.queue.map((item) => {
              const messages = book.interactions.filter((interaction) => item.interactionIds.includes(interaction.id));
              const amount = messages.reduce((sum, message) => sum + (message.amount ?? 0), 0);
              return (
                <tr key={item.caseId}>
                  <td>
                    <Link href={`/cases/${item.caseId}`}>{item.customerRef}</Link>
                    <span className="cell-note">{complaintName(item.complaintType)}</span>
                  </td>
                  <td>
                    <Mark label="isolated" />
                  </td>
                  <td>{item.domain === "payment" && amount > 0 ? naira(amount) : "Not a payment"}</td>
                  <td>{ownerFor(item.complaintType)}</td>
                  <td>
                    <Link href={`/cases/${item.caseId}`}>Open customer case →</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="priority-grid" style={{ marginTop: 22 }}>
        <article className="panel-card">
          <h3>Why wider problems come first</h3>
          <p>A shared response can help many customers at once. Sign-in and a branch explanation have service impact even without naira exposure. They should not disappear behind payment value.</p>
        </article>
        <article className="panel-card">
          <h3>Urgency is a rule, not a model opinion</h3>
          <p>Scores run from 0 to 100. Acceptance subtracts 50, floored at 0, and survives refresh.</p>
          <p style={{ marginTop: 12 }}>
            <Link className="quiet-link" href="/guide">
              Read the decision rules →
            </Link>
          </p>
        </article>
      </div>
    </>
  );
}

export default function QueuePage() {
  return (
    <Suspense fallback={<p className="deck">Opening the work list…</p>}>
      <Queue />
    </Suspense>
  );
}
