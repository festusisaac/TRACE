import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { ProactiveAdvisory } from "@/components/proactive-advisory";
import { openBook } from "@/lib/desk";
import { calculateDeflectionRoi, portfolioDeflectionSummary } from "@/lib/engine/deflection.ts";
import { naira } from "@/lib/format.ts";

export const metadata = { title: "Customer Advisories · TRACE" };

async function Advisories() {
  await connection();
  const book = await openBook();

  // Find wider problems eligible for in-app customer broadcasting
  const widerIncidents = book.incidents.filter((incident) => incident.label !== "isolated");
  const summary = portfolioDeflectionSummary(book.incidents);

  return (
    <>
      <header className="intro">
        <p className="eyebrow">Operations book / Proactive Communication</p>
        <div className="intro-row">
          <h1>Customer Advisories & Call Deflection</h1>
        </div>
        <p className="deck">
          Publish real-time reassuring notices across Zenith Mobile App, Internet Banking, and USSD before customers flood the contact centre. Based on commercial banking deflection benchmarks.
        </p>
      </header>

      {/* Executive ROI Measures Strip */}
      <section className="measures" aria-label="Deflection totals">
        <div className="measure">
          <p className="measure-num">~{summary.totalPreventedCalls.toLocaleString("en-NG")}</p>
          <p className="measure-label">Calls preventable</p>
          <p className="measure-note">78% benchmark deflection rate</p>
        </div>
        <div className="measure">
          <p className="measure-num">{naira(summary.totalNairaSaved)}</p>
          <p className="measure-label">Support cost saved</p>
          <p className="measure-note">At ₦450 per handled contact call</p>
        </div>
        <div className="measure">
          <p className="measure-num">{summary.totalAgentHoursSaved}</p>
          <p className="measure-label">Agent hours relieved</p>
          <p className="measure-note">4.5 min average handle time</p>
        </div>
        <div className="measure">
          <p className="measure-num">
            {summary.activeAdvisoriesCount} / {summary.potentialAdvisoriesCount}
          </p>
          <p className="measure-label">Active digital broadcasts</p>
          <p className="measure-note">Live on mobile & web channels</p>
        </div>
      </section>

      {/* Explanatory Note */}
      <section className="note" style={{ marginBottom: 28 }}>
        <strong>Proactive Reassurance vs. Reactive Triage</strong>
        <p>
          When an interbank gateway slows down or an app authentication bug occurs, customers immediately assume their money is lost.
          Publishing an immediate, verified advisory directly onto their phone home screen stops the panic and eliminates 3 out of every 4 inbound inquiries.
        </p>
      </section>

      {/* List of Eligible Wider Incidents */}
      <div className="section-head">
        <h2>Active Incident Broadcast Stations</h2>
        <p>{widerIncidents.length} wider incidents eligible for in-app broadcast</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {widerIncidents.map((incident) => {
          const model = calculateDeflectionRoi(incident, incident.advisoryDeployed);
          return (
            <div key={incident.id} style={{ border: "1px solid var(--line)", borderRadius: 4, background: "var(--white)", padding: "18px 22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div>
                  <span className="eyebrow" style={{ color: "var(--muted)" }}>Incident Target</span>
                  <h3 style={{ margin: "2px 0 0", fontSize: 20 }}>
                    <Link href={`/incidents/${incident.id}`}>{incident.title}</Link>
                  </h3>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className="meta">{incident.owner}</span>
                  <div style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500, marginTop: 2 }}>
                    {incident.customers} customers · {incident.interactionCount} messages
                  </div>
                </div>
              </div>

              <ProactiveAdvisory model={model} incident={incident} />
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function AdvisoriesPage() {
  return (
    <Suspense fallback={<p className="deck">Opening advisory broadcast desk…</p>}>
      <Advisories />
    </Suspense>
  );
}
