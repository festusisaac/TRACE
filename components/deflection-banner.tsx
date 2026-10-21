import Link from "next/link";
import type { PortfolioDeflectionSummary } from "@/lib/engine/deflection.ts";
import { naira } from "@/lib/format.ts";

export function DeflectionBanner({ summary }: { summary: PortfolioDeflectionSummary }) {
  if (summary.potentialAdvisoriesCount === 0) return null;

  return (
    <section
      style={{
        background: "var(--white)",
        border: "1px solid var(--line)",
        borderLeft: "4px solid var(--isolated)",
        borderRadius: 4,
        padding: "16px 20px",
        marginBottom: 26,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
      aria-label="Proactive Call Deflection & Operational ROI Monitor"
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div
          style={{
            background: "var(--isolated-bg)",
            color: "var(--isolated)",
            width: 38,
            height: 38,
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          📞
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="eyebrow" style={{ color: "var(--ink)", fontWeight: 600 }}>
              Proactive Call Deflection & Cost Prevention
            </span>
            <span
              className="pill"
              style={{
                fontSize: 10,
                padding: "2px 6px",
                fontWeight: 600,
                color: "var(--isolated)",
                background: "var(--isolated-bg)",
              }}
            >
              ~{summary.totalPreventedCalls.toLocaleString("en-NG")} Calls Preventable
            </span>
          </div>

          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
            In-app advisories on Zenith Mobile App & USSD deflect up to 78% of incoming customer panic calls before they hit the contact centre queue.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ textAlign: "right" }}>
          <span className="meta" style={{ display: "block", fontSize: 10 }}>
            Operational Cost Saved
          </span>
          <strong
            style={{
              fontSize: 18,
              fontFamily: "var(--font-mono), monospace",
              color: "var(--isolated)",
            }}
          >
            {naira(summary.totalNairaSaved)}
          </strong>
          <span className="cell-note">{summary.totalAgentHoursSaved} agent hours relieved</span>
        </div>

        <Link
          href={summary.leadingIncidentId ? `/incidents/${summary.leadingIncidentId}` : "/incidents"}
          className="button"
          style={{ fontSize: 13, padding: "8px 14px", whiteSpace: "nowrap" }}
        >
          View Advisory Desk →
        </Link>
      </div>
    </section>
  );
}
