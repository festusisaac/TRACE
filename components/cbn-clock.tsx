"use client";

import { useEffect, useState } from "react";
import { CheckCircleIcon, FileTextIcon, PrinterIcon, XCloseIcon } from "@/components/icons";
import { formatDurationSeconds, type CbnAssessment } from "@/lib/engine/cbn.ts";
import type { IncidentResult, AnnotatedInteraction } from "@/lib/engine/types.ts";
import { lagosTime, naira } from "@/lib/format.ts";

export function CbnClock({
  assessment,
  incident,
  members,
}: {
  assessment: CbnAssessment;
  incident: IncidentResult;
  members: AnnotatedInteraction[];
}) {
  const [showAuditPack, setShowAuditPack] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const totalSlaMs = assessment.mandatedSlaHours * 60 * 60 * 1000;
  const deadlineMs = Date.parse(assessment.deadlineAt);
  const oldestMs = Date.parse(assessment.oldestReceivedAt);

  let liveStatus: "compliant" | "warning" | "breached" = assessment.status;
  let liveStatusText: string = assessment.statusText;
  let livePercent: number = Math.min(
    100,
    Math.max(0, Math.round((assessment.elapsedMinutes / (assessment.mandatedSlaHours * 60)) * 100)),
  );

  if (now !== null && !Number.isNaN(deadlineMs) && !Number.isNaN(oldestMs)) {
    const diffSec = Math.floor((deadlineMs - now) / 1000);
    const elapsedMs = Math.max(0, now - oldestMs);
    livePercent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalSlaMs) * 100)));
    liveStatusText = formatDurationSeconds(diffSec);
    if (diffSec <= 0) {
      liveStatus = "breached";
    } else if (diffSec <= 6 * 3600) {
      liveStatus = "warning";
    } else {
      liveStatus = "compliant";
    }
  }

  const statusColor =
    liveStatus === "breached"
      ? { color: "var(--systemic)", bg: "var(--systemic-bg)", border: "var(--systemic)" }
      : liveStatus === "warning"
        ? { color: "var(--emerging)", bg: "var(--emerging-bg)", border: "var(--emerging)" }
        : { color: "var(--isolated)", bg: "var(--isolated-bg)", border: "var(--isolated)" };

  const handleCopyAudit = () => {
    const report = [
      "===========================================================",
      "CENTRAL BANK OF NIGERIA (CBN) - DISPUTE AUDIT REPORT",
      "===========================================================",
      `Institution: Zenith Bank PLC`,
      `Audit Pack Ref: CBN-AUDIT-${incident.id.toUpperCase()}`,
      `Generated At (Lagos): ${new Date().toISOString()}`,
      `Incident: ${incident.title}`,
      `Regulatory Mandate: ${assessment.circularTitle} (${assessment.circularRef})`,
      `Mandated SLA: ${assessment.mandatedSlaHours} Hours`,
      `Status: ${liveStatus.toUpperCase()} (${liveStatusText})`,
      `Earliest Customer Intake: ${assessment.oldestReceivedAt}`,
      `Mandated Deadline: ${assessment.deadlineAt}`,
      `Impacted Customers: ${incident.customers}`,
      `Value in Flight: ₦${incident.valueInFlight.toLocaleString("en-NG")}`,
      `Regulatory Penalty Risk: ₦${assessment.totalPenaltyRisk.toLocaleString("en-NG")}`,
      "",
      "IMPACTED CUSTOMER REGISTER:",
      ...members.map(
        (m, i) =>
          `[${i + 1}] Customer: ${m.customerRef} | Channel: ${m.channel} | Received: ${m.receivedAt} | RRN: ${m.rrn ?? "N/A"} | Amount: ₦${(m.amount ?? 0).toLocaleString("en-NG")}`,
      ),
      "",
      "ATTESTATION:",
      "Reconciled deterministically via TRACE Engine against core switch logs.",
      "===========================================================",
    ].join("\n");

    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      <article className="side-card" style={{ borderLeft: `4px solid ${statusColor.border}` }}>
        <div className="card-top">
          <p className="aside-label" style={{ margin: 0 }}>
            Regulatory Compliance · CBN SLA
          </p>
          <span
            className="pill"
            style={{
              color: statusColor.color,
              background: statusColor.bg,
              fontWeight: 600,
              fontSize: 11,
              padding: "3px 8px",
            }}
          >
            {liveStatus === "breached"
              ? "SLA Breached"
              : liveStatus === "warning"
                ? "Imminent Breach (< 6h)"
                : "Compliant"}
          </span>
        </div>

        <h3 style={{ margin: "10px 0 4px", fontSize: 18, fontFamily: "var(--font-mono), monospace" }}>
          {liveStatusText}
        </h3>
        <p className="cell-note" style={{ margin: 0 }}>
          {assessment.summarySentence}
        </p>

        {/* SLA Progress Bar */}
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              height: 6,
              background: "var(--line)",
              borderRadius: 3,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                width: `${livePercent}%`,
                height: "100%",
                background: statusColor.border,
                transition: "width 0.4s ease",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "var(--muted)",
              marginTop: 5,
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            <span>First: {lagosTime(assessment.oldestReceivedAt)}</span>
            <span>Deadline: {lagosTime(assessment.deadlineAt)}</span>
          </div>
        </div>

        {/* Regulatory Details Box */}
        <div
          style={{
            marginTop: 14,
            padding: "10px 12px",
            background: "var(--band)",
            borderRadius: 3,
            fontSize: 12,
            lineHeight: 1.4,
          }}
        >
          <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>
            {assessment.circularTitle}
          </div>
          <div style={{ color: "var(--muted)", fontFamily: "var(--font-mono), monospace", fontSize: 11 }}>
            {assessment.circularRef} · {assessment.mandatedSlaHours}h Reversal TAT
          </div>
        </div>

        {/* Penalty Exposure */}
        <div style={{ marginTop: 14 }}>
          <span style={{ fontSize: 11, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.05em" }}>
            Potential CBN Sanction Exposure
          </span>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: 22,
              fontWeight: 600,
              fontFamily: "var(--font-mono), monospace",
              color: assessment.status === "breached" ? "var(--systemic)" : "var(--ink)",
            }}
          >
            {naira(assessment.totalPenaltyRisk)}
          </p>
          <p className="cell-note" style={{ marginTop: 2 }}>
            {assessment.affectedCustomers} customer{assessment.affectedCustomers > 1 ? "s" : ""} × ₦
            {assessment.finePerCustomer.toLocaleString("en-NG")} administrative fine per unresolved complaint.
          </p>
        </div>

        {/* Audit Pack Generator Trigger */}
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
          <button
            type="button"
            className="button"
            style={{ width: "100%", fontSize: 13, gap: 6 }}
            onClick={() => setShowAuditPack(true)}
          >
            <FileTextIcon size={15} /> Generate CBN Audit Pack
          </button>
        </div>
      </article>

      {/* Audit Modal */}
      {showAuditPack && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(16, 40, 63, 0.65)",
            backdropFilter: "blur(3px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAuditPack(false);
          }}
        >
          <div
            style={{
              background: "var(--white)",
              maxWidth: 720,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              borderRadius: 6,
              boxShadow: "0 20px 45px rgba(0,0,0,0.25)",
              border: "1px solid var(--line)",
              padding: "28px 32px",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <p className="eyebrow" style={{ color: "var(--muted)", margin: 0 }}>
                  Central Bank of Nigeria · Regulatory Audit
                </p>
                <h2 style={{ margin: "4px 0 0", fontSize: 24 }}>Dispute Resolution Compliance Pack</h2>
                <p className="meta" style={{ marginTop: 4 }}>
                  Pack Ref: CBN-AUDIT-{incident.id.toUpperCase()} · Zenith Bank PLC
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAuditPack(false)}
                className="button"
                style={{ padding: "6px 10px", fontSize: 13, lineHeight: 1 }}
                aria-label="Close"
              >
                <XCloseIcon size={14} />
              </button>
            </div>

            <hr className="rule" style={{ margin: "16px 0" }} />

            {/* Assessment Key Facts */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 16,
                padding: "14px 18px",
                background: "var(--band)",
                borderRadius: 4,
                marginBottom: 20,
              }}
            >
              <div>
                <span className="meta" style={{ display: "block" }}>
                  Regulatory Mandate
                </span>
                <strong style={{ fontSize: 13, color: "var(--ink)" }}>{assessment.mandatedSlaHours}h Reversal TAT</strong>
                <span className="cell-note">{assessment.circularRef}</span>
              </div>
              <div>
                <span className="meta" style={{ display: "block" }}>
                  Current Status
                </span>
                <strong
                  style={{
                    fontSize: 13,
                    color: statusColor.color,
                  }}
                >
                  {assessment.status.toUpperCase()}
                </strong>
                <span className="cell-note">{assessment.statusText}</span>
              </div>
              <div>
                <span className="meta" style={{ display: "block" }}>
                  Sanction Exposure
                </span>
                <strong style={{ fontSize: 13, color: "var(--ink)" }}>
                  {naira(assessment.totalPenaltyRisk)}
                </strong>
                <span className="cell-note">{assessment.affectedCustomers} customers</span>
              </div>
            </div>

            {/* Evidence Ledger */}
            <h4 style={{ margin: "16px 0 8px", fontSize: 15, fontWeight: 600 }}>Impacted Customer Audit Register</h4>
            <div className="ledger-wrap" style={{ maxHeight: 240, overflowY: "auto", border: "1px solid var(--line)" }}>
              <table className="ledger" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Channel</th>
                    <th>Received (Lagos)</th>
                    <th>RRN</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td style={{ fontFamily: "var(--font-mono), monospace" }}>{member.customerRef}</td>
                      <td>{member.channel}</td>
                      <td>{lagosTime(member.receivedAt)}</td>
                      <td style={{ fontFamily: "var(--font-mono), monospace" }}>{member.rrn ?? "Unquoted"}</td>
                      <td>{member.amount ? naira(member.amount) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Attestation Note */}
            <div
              style={{
                marginTop: 20,
                padding: 12,
                borderLeft: "3px solid var(--header)",
                background: "var(--paper)",
                fontSize: 12,
                color: "var(--muted)",
              }}
            >
              <strong>Compliance Officer Declaration:</strong>
              <p style={{ margin: "2px 0 0" }}>
                This record constitutes a verifiable audit packet under Section 3.2.1 of the CBN Consumer Protection Framework.
                All timestamps, customer references, and transaction amounts reflect live, deterministic ingestion records.
              </p>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
              <button
                type="button"
                className="button"
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                onClick={handleCopyAudit}
              >
                {copied ? <CheckCircleIcon size={14} /> : <FileTextIcon size={14} />}
                {copied ? "Copied to Clipboard" : "Copy Audit Record"}
              </button>
              <button
                type="button"
                className="button primary"
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                onClick={() => window.print()}
              >
                <PrinterIcon size={15} /> Print Audit Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
