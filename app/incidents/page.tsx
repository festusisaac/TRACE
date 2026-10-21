import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { Mark } from "@/components/mark";
import { openBook } from "@/lib/desk";
import { naira } from "@/lib/format.ts";

export const metadata = { title: "Incidents · TRACE" };

async function IncidentList() {
  await connection();
  const book = await openBook();
  const systemic = book.incidents.filter((incident) => incident.label === "systemic");
  const emerging = book.incidents.filter((incident) => incident.label === "emerging");
  const isolated = book.incidents.filter((incident) => incident.label === "isolated");

  return (
    <>
      <header className="intro">
        <p className="eyebrow">Operations book / Incidents</p>
        <div className="intro-row">
          <h1>Incidents</h1>
          <Link className="button primary" href="/receive">
            Take a complaint +
          </Link>
        </div>
        <p className="deck">
          {book.incidents.length} problem groups, one clean view. Review network and location patterns before handling the two individual complaints.
        </p>
      </header>

      <section className="card-grid three">
        <article className="panel-card">
          <div className="card-top">
            <Mark label="systemic" />
            <strong className="measure-num">{String(systemic.length).padStart(2, "0")}</strong>
          </div>
          <p style={{ marginTop: 16, color: "var(--ink)", fontWeight: 600 }}>{systemic.map((incident) => incident.title).join(" · ")}</p>
          <p>Coordinate a response across affected customers.</p>
        </article>
        <article className="panel-card">
          <div className="card-top">
            <Mark label="emerging" />
            <strong className="measure-num">{String(emerging.length).padStart(2, "0")}</strong>
          </div>
          <p style={{ marginTop: 16, color: "var(--ink)", fontWeight: 600 }}>{emerging.map((incident) => incident.title).join(" · ") || "None"}</p>
          <p>Investigate a growing pattern before it becomes an alarm.</p>
        </article>
        <article className="panel-card">
          <div className="card-top">
            <Mark label="isolated" />
            <strong className="measure-num">{String(isolated.length).padStart(2, "0")}</strong>
          </div>
          <p style={{ marginTop: 16, color: "var(--ink)", fontWeight: 600 }}>{isolated.map((incident) => incident.title).join(" · ")}</p>
          <p>Handle each customer separately.</p>
        </article>
      </section>

      <div className="section-head">
        <h2>Problem register</h2>
        <p>
          {book.incidents.length} groups · {book.incidents.filter((incident) => !incident.acknowledged).length} not yet accepted
        </p>
      </div>
      <div className="ledger-wrap">
        <table className="ledger">
          <thead>
            <tr>
              <th>Problem / scope</th>
              <th>Reading</th>
              <th>Customers / messages</th>
              <th>Financial or service impact</th>
              <th>Suggested team</th>
              <th>Handling state</th>
            </tr>
          </thead>
          <tbody>
            {book.incidents.map((incident) => (
              <tr key={incident.id}>
                <td>
                  <Link href={`/incidents/${incident.id}`}>{incident.title}</Link>
                  <span className="cell-note">
                    {incident.locations.length > 0 ? incident.locations.join(" + ") : incident.scope} · {incident.domain === "payment" ? "Payment" : "Service"}
                  </span>
                </td>
                <td>
                  <Mark label={incident.label} />
                </td>
                <td>
                  {incident.customers} {incident.customers === 1 ? "customer" : "customers"}
                  <span className="cell-note">{incident.interactionCount} messages</span>
                </td>
                <td>
                  {incident.domain === "payment" ? `${naira(incident.valueInFlight)} outstanding` : "Not a payment"}
                  <span className="cell-note">
                    {incident.domain === "payment"
                      ? `${incident.linkedTransactionIds.length} matched payments${incident.responsePattern ? ` · response ${incident.responsePattern}` : ""}`
                      : "No naira exposure"}
                  </span>
                </td>
                <td>{incident.owner}</td>
                <td>
                  {incident.acknowledged ? "Accepted" : "Not yet accepted"}
                  <span className="cell-note">
                    <Link href={`/incidents/${incident.id}`}>Open evidence →</Link>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function IncidentsPage() {
  return (
    <Suspense fallback={<p className="deck">Opening incidents…</p>}>
      <IncidentList />
    </Suspense>
  );
}
