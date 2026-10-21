import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { AcknowledgeButton } from "@/components/acknowledge-button";
import { CbnClock } from "@/components/cbn-clock";
import { Mark } from "@/components/mark";
import { SmartphoneIcon } from "@/components/icons";
import { db } from "@/db/client";
import { transactions } from "@/db/schema";
import { draftIncident } from "@/lib/draft";
import { openBook } from "@/lib/desk";
import { assessCbnSla } from "@/lib/engine/cbn.ts";
import { calculateDeflectionRoi } from "@/lib/engine/deflection.ts";
import { channelName, lagosTime, linkName, naira } from "@/lib/format.ts";

export const metadata = { title: "Incident · TRACE" };

async function Incident({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connection();
  const book = await openBook();
  const incident = book.incidents.find((item) => item.id === id);
  if (!incident) notFound();

  const members = book.interactions
    .filter((interaction) => incident.memberIds.includes(interaction.id))
    .sort((left, right) => Date.parse(right.receivedAt) - Date.parse(left.receivedAt));
  const [paymentRows, draft] = await Promise.all([
    incident.domain === "payment" ? db.select().from(transactions) : Promise.resolve([]),
    draftIncident(incident),
  ]);
  const linked = paymentRows.filter((row) => incident.linkedTransactionIds.includes(row.id));
  const unlinked = members.filter((member) => member.link.status === "unlinked");
  const draftedBy = draft.source === "gemini" ? "Gemini draft · figures stayed with the engine." : "Desk template.";
  const cbnAssessment = assessCbnSla(incident, members, new Date().toISOString());
  const deflectionModel = calculateDeflectionRoi(incident, incident.advisoryDeployed);

  return (
    <>
      <p className="crumb">
        <Link href="/incidents">Incidents</Link>
        {" / "}
        {incident.title}
      </p>
      <header className="intro">
        <div className="intro-row">
          <h1>{incident.title}</h1>
          <AcknowledgeButton incidentId={incident.id} owner={incident.owner} acknowledged={incident.acknowledged} />
        </div>
        <p className="deck">{incident.nextAction}</p>
      </header>

      <div className="card-top" style={{ marginBottom: 18 }}>
        <span>
          <Mark label={incident.label} />{" "}
          <span className="meta">
            {incident.locations.join(" + ") || incident.scope} · Suggested team: {incident.owner}
          </span>
        </span>
        <span className="meta">{incident.acknowledged ? "Accepted" : "Unaccepted / no owner recorded"}</span>
      </div>

      <section className="stat-row">
        <div className="stat">
          <strong>{incident.customers}</strong>
          <span>Distinct customers</span>
          <em>Normal level: {incident.baseline}</em>
        </div>
        <div className="stat">
          <strong>{incident.interactionCount}</strong>
          <span>Complaint messages</span>
          <em>Every channel counted</em>
        </div>
        <div className="stat">
          <strong>{incident.domain === "payment" ? incident.linkedTransactionIds.length : "—"}</strong>
          <span>{incident.domain === "payment" ? "Matched payments" : "Payment lookup"}</span>
          <em>{incident.responsePattern ? `Most often response ${incident.responsePattern}` : "Not a payment"}</em>
        </div>
        <div className="stat">
          <strong className="words">{incident.domain === "payment" ? naira(incident.valueInFlight) : "None"}</strong>
          <span>{incident.domain === "payment" ? "Outstanding complaint exposure" : "Naira exposure"}</span>
          <em>{incident.domain === "payment" ? "Includes unmatched complaints" : "Customers are blocked from the service"}</em>
        </div>
      </section>

      <div className="split">
        <div>
          <div className="section-head">
            <h2>What the evidence says</h2>
            <p>Deterministic engine facts</p>
          </div>
          <div className="ledger-wrap">
            <table className="ledger">
              <thead>
                <tr>
                  <th>Signal</th>
                  <th>Observation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Customer concentration</td>
                  <td>
                    {incident.observed} customers against a normal level of {incident.baseline}
                    <span className="cell-note">{incident.label === "isolated" ? "Handle this customer alone." : "Respond as one incident."}</span>
                  </td>
                </tr>
                {incident.domain === "payment" ? (
                  <tr>
                    <td>Payment response</td>
                    <td>
                      {incident.responsePattern && incident.responsePattern !== "unspecified" ? incident.responsePattern : "No matched code"}
                      <span className="cell-note">{linked.length} payments matched from the book.</span>
                    </td>
                  </tr>
                ) : null}
                <tr>
                  <td>{incident.domain === "payment" ? "Reference-free complaints" : "Service lookup"}</td>
                  <td>
                    {incident.domain === "payment"
                      ? unlinked.length > 0
                        ? `${unlinked.length} complaints had no matching payment`
                        : "Every complaint in this group matched a payment"
                      : "Not a payment"}
                    <span className="cell-note">
                      {incident.domain === "payment"
                        ? "A missing reference does not remove the customer from this group."
                        : "There is no transaction to find."}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="section-head">
            <h2>Customer and message evidence</h2>
            <p>{members.length} messages</p>
          </div>
          <div className="ledger-wrap">
            <table className="ledger">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Channel</th>
                  <th>Message</th>
                  <th>Payment evidence</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <Link href={`/cases/${member.caseId}`}>{member.customerRef}</Link>
                      <span className="cell-note">{lagosTime(member.receivedAt)}</span>
                    </td>
                    <td>{channelName(member.channel)}</td>
                    <td>{member.text}</td>
                    <td>
                      {linkName(member.link.status)}
                      <span className="cell-note">{member.rrn ?? member.location ?? "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {incident.domain === "payment" && linked.length > 0 ? (
            <>
              <div className="section-head">
                <h2>Payments TRACE matched</h2>
                <p>Each payment once</p>
              </div>
              <div className="ledger-wrap">
                <table className="ledger">
                  <thead>
                    <tr>
                      <th>RRN</th>
                      <th>Response</th>
                      <th>Status</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linked.map((row) => (
                      <tr key={row.id}>
                        <td>{row.rrn ?? "—"}</td>
                        <td>{row.responseCode ?? "—"}</td>
                        <td>{row.status}</td>
                        <td>{naira(row.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>

        <aside className="side-stack">
          {incident.label !== "isolated" ? (
            <article className="side-card" style={{ borderLeft: "4px solid var(--isolated)" }}>
              <div className="card-top">
                <p className="aside-label" style={{ margin: 0 }}>
                  Call Deflection · In-App Advisory
                </p>
                <span
                  className="pill"
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: incident.advisoryDeployed ? "var(--isolated)" : "var(--emerging)",
                    background: incident.advisoryDeployed ? "var(--isolated-bg)" : "var(--emerging-bg)",
                  }}
                >
                  {incident.advisoryDeployed ? "● Broadcast Active" : "Ready to Deploy"}
                </span>
              </div>
              <h3 style={{ margin: "10px 0 2px", fontSize: 18 }}>
                ~{deflectionModel.preventedCalls.toLocaleString("en-NG")} calls preventable
              </h3>
              <p className="cell-note" style={{ margin: 0 }}>
                {naira(deflectionModel.nairaSaved)} projected contact centre operational savings.
              </p>
              <div style={{ marginTop: 14 }}>
                <Link
                  href="/advisories"
                  className="button"
                  style={{ width: "100%", fontSize: 13, gap: 6, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                >
                  <SmartphoneIcon size={14} /> Open Broadcast Desk →
                </Link>
              </div>
            </article>
          ) : null}

          <CbnClock assessment={cbnAssessment} incident={incident} members={members} />
          <article className="side-card">
            <div className="card-top">
              <h3 style={{ margin: 0, fontSize: 18 }}>Take ownership</h3>
            </div>
            <p className="measure-num" style={{ marginTop: 12 }}>
              {incident.priority} / 100
            </p>
            <p>Current urgency. Higher means pick it up sooner. Accepting subtracts 50, floored at 0, and the accepted state survives refresh.</p>
            <div className="ledger-wrap" style={{ marginTop: 12 }}>
              <table className="ledger">
                <tbody>
                  {incident.scoreParts.map((part) => (
                    <tr key={part.label}>
                      <td>{part.label}</td>
                      <td>{part.detail}</td>
                      <td>{part.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
          <article className="side-card">
            <p className="aside-label">Operator note · draft</p>
            <h3 style={{ marginTop: 8, fontSize: 18 }}>What the count shows</h3>
            <p>{draft.operatorNote}</p>
            <p className="cell-note" style={{ marginTop: 10 }}>
              {draftedBy}
            </p>
          </article>
          <article className="side-card">
            <p className="aside-label">Customer response · draft</p>
            <h3 style={{ marginTop: 8, fontSize: 18 }}>{draft.subject}</h3>
            <p>{draft.body}</p>
            <p className="cell-note" style={{ marginTop: 10 }}>
              Draft only · no response sent · no promised reversal or recovery. {draftedBy}
            </p>
          </article>
        </aside>
      </div>
    </>
  );
}

export default function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="deck">Opening the incident…</p>}>
      <Incident params={params} />
    </Suspense>
  );
}
