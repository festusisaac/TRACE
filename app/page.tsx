import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { count } from "drizzle-orm";

import { CbnSummaryBanner } from "@/components/cbn-summary-banner";
import { Mark } from "@/components/mark";
import { db } from "@/db/client";
import { transactions } from "@/db/schema";
import { openBook } from "@/lib/desk";
import { cbnPortfolioSummary } from "@/lib/engine/cbn.ts";
import { plainSituation } from "@/lib/explain.ts";
import { naira } from "@/lib/format.ts";
import type { IncidentResult } from "@/lib/engine/types.ts";

export const metadata = { title: "Overview · TRACE" };

function leading(incidents: IncidentResult[]) {
  const network = incidents.filter((incident) => incident.label === "systemic" && incident.scope === "network");
  const chosen = network.length >= 2 ? network.slice(0, 2) : incidents.filter((incident) => incident.label !== "isolated").slice(0, 2);
  const chosenIds = new Set(chosen.map((incident) => incident.id));
  return {
    chosen,
    rest: incidents.filter((incident) => incident.label !== "isolated" && !chosenIds.has(incident.id)),
    alone: incidents.filter((incident) => incident.label === "isolated"),
  };
}

async function Overview() {
  await connection();
  const book = await openBook();
  const [{ value: paymentCount }] = await db.select({ value: count() }).from(transactions);
  const groups = leading(book.incidents);
  const systemic = book.incidents.filter((incident) => incident.label === "systemic").length;
  const emerging = book.incidents.filter((incident) => incident.label === "emerging").length;
  const isolated = book.incidents.filter((incident) => incident.label === "isolated").length;
  const chioma = book.cases.find((item) => item.customerRef === "CHI-2041");
  const accepted = book.incidents.filter((incident) => incident.acknowledged).length;
  const filedLive = book.interactions.filter(
    (interaction) => interaction.sourceRef.startsWith("pitch-") || interaction.sourceRef.startsWith("desk-"),
  ).length;
  const cbnSummary = cbnPortfolioSummary(book.incidents, book.interactions, new Date().toISOString());

  return (
    <>
      <header className="intro">
        <p className="eyebrow">Operations book / Overview</p>
        <div className="intro-row">
          <h1>See the problem, not just the messages.</h1>
          <Link className="button primary" href="/receive">
            Take a complaint +
          </Link>
        </div>
        <p className="deck">Start with the wider problems. Keep individual complaints visible without confusing service impact with money at risk.</p>
      </header>

      <CbnSummaryBanner summary={cbnSummary} />

      <section className="measures" aria-label="Book totals">
        <div className="measure">
          <p className="measure-num">
            {book.interactions.length}
            {filedLive > 0 && (
              <span
                style={{
                  fontSize: 13,
                  color: "#b82424",
                  marginLeft: 6,
                  fontWeight: 600,
                  fontFamily: "var(--font-mono), monospace",
                }}
              >
                (+{filedLive} live)
              </span>
            )}
          </p>
          <p className="measure-label">Complaints / messages</p>
          <p className="measure-note">
            {filedLive > 0 ? `${filedLive} streamed live on stage` : "Across six intake channels"}
          </p>
        </div>
        <div className="measure">
          <p className="measure-num">{book.cases.length}</p>
          <p className="measure-label">Customer cases</p>
          <p className="measure-note">
            {chioma && chioma.interactionIds.length > 1
              ? `${chioma.customerRef}'s ${chioma.interactionIds.length} contacts form one case`
              : "One customer and one problem is one case"}
          </p>
        </div>
        <div className="measure">
          <p className="measure-num">{paymentCount}</p>
          <p className="measure-label">Transactions in the book</p>
          <p className="measure-note">Payments the linker can match</p>
        </div>
        <div className="measure">
          <p className="measure-num">{book.incidents.length}</p>
          <p className="measure-label">Incident groups</p>
          <p className="measure-note">
            {systemic} Systemic / {emerging} Emerging / {isolated} Isolated
          </p>
        </div>
      </section>

      <div className="section-head">
        <h2>The two leading network problems</h2>
        <p>Wider impact · review first</p>
      </div>
      <div className="priority-grid">
        {groups.chosen.map((incident) => (
          <article className="priority" key={incident.id}>
            <div className="priority-top">
              <Mark label={incident.label} />
              <span className="meta">
                {incident.domain === "payment" ? "Payments" : "Digital"}
                {incident.domain === "payment" && incident.locations.length > 0 ? ` / ${incident.locations.join(" + ")}` : ""}
              </span>
            </div>
            <h3>
              <Link href={`/incidents/${incident.id}`}>{incident.title}</Link>
            </h3>
            <div className="pair-stats">
              <div>
                <strong>{incident.customers}</strong>
                <span>distinct customers</span>
              </div>
              <div>
                <strong className={incident.domain === "service" ? "words" : undefined}>
                  {incident.domain === "payment" ? naira(incident.valueInFlight) : "Not a payment"}
                </strong>
                <span>{incident.domain === "payment" ? "outstanding" : "Service access affected · ₦0 exposure"}</span>
              </div>
            </div>
            <hr className="rule" />
            <p>{plainSituation(incident)}</p>
            <div className="priority-foot">
              <span>
                Suggested: {incident.owner}
                {incident.acknowledged ? " · Accepted" : " · Not yet accepted"}
              </span>
              <Link className="quiet-link" href={`/incidents/${incident.id}`}>
                Inspect incident →
              </Link>
            </div>
          </article>
        ))}
      </div>

      {groups.rest.length > 0 ? (
        <section>
          <div className="section-head">
            <h2>Also needs a coordinated response</h2>
            <p>Location + vendor</p>
          </div>
          <div className="ledger-wrap">
            <table className="ledger">
              <thead>
                <tr>
                  <th>Problem</th>
                  <th>Reading</th>
                  <th>People / messages</th>
                  <th>Impact</th>
                  <th>Suggested team</th>
                </tr>
              </thead>
              <tbody>
                {groups.rest.map((incident) => (
                  <tr key={incident.id}>
                    <td>
                      <Link href={`/incidents/${incident.id}`}>{incident.title}</Link>
                    </td>
                    <td>
                      <Mark label={incident.label} />
                    </td>
                    <td>
                      {incident.customers} customers · {incident.interactionCount} messages
                    </td>
                    <td>{incident.domain === "payment" ? naira(incident.valueInFlight) : "Branch or service · no naira exposure"}</td>
                    <td>{incident.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section>
        <div className="section-head">
          <h2>Individual work</h2>
          <p>Handle separately</p>
        </div>
        <div className="solo-row">
          {groups.alone.map((incident) => {
            const caseId = incident.caseIds[0];
            return (
              <div className="solo" key={incident.id}>
                <Mark label={incident.label} />
                <Link href={caseId ? `/cases/${caseId}` : `/incidents/${incident.id}`}>{incident.title}</Link>
                <p className="cell-note">{plainSituation(incident)}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="note" style={{ marginTop: 28 }}>
        <strong>
          {accepted === 0 && filedLive === 0
            ? "A clean, unaccepted snapshot"
            : accepted > 0
              ? `${accepted} problem${accepted === 1 ? "" : "s"} accepted`
              : "Complaints have been filed on this book"}
        </strong>
        <p>
          Suggested teams are recommendations, not assignments.
          {filedLive > 0 ? ` ${filedLive} message${filedLive === 1 ? "" : "s"} came in through Take a complaint.` : " No live intake has been filed."}
          {accepted === 0
            ? " No incident has been accepted."
            : " Accepted problems stay on the book and new messages about them are answered from the incident."}
        </p>
      </section>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<p className="deck">Opening the book…</p>}>
      <Overview />
    </Suspense>
  );
}
