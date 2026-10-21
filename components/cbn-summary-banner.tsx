import Link from "next/link";
import { BankIcon } from "@/components/icons";
import { LiveDuration } from "@/components/live-duration";
import type { CbnPortfolioSummary } from "@/lib/engine/cbn.ts";
import { naira } from "@/lib/format.ts";

export function CbnSummaryBanner({ summary }: { summary: CbnPortfolioSummary }) {
  const hasBreach = summary.breachCount > 0;
  const hasWarning = summary.warningCount > 0;

  const statusBorder = hasBreach
    ? "var(--systemic)"
    : hasWarning
      ? "var(--emerging)"
      : "var(--divider)";

  return (
    <section
      style={{
        background: "var(--white)",
        border: "1px solid var(--line)",
        borderLeft: `4px solid ${statusBorder}`,
        borderRadius: 4,
        padding: "16px 20px",
        marginBottom: 26,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
      aria-label="Central Bank of Nigeria Regulatory Monitor"
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div
          style={{
            background: hasBreach
              ? "var(--systemic-bg)"
              : hasWarning
                ? "var(--emerging-bg)"
                : "var(--band)",
            color: hasBreach
              ? "var(--systemic)"
              : hasWarning
                ? "var(--emerging)"
                : "var(--header)",
            width: 38,
            height: 38,
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <BankIcon size={18} />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="eyebrow" style={{ color: "var(--ink)", fontWeight: 600 }}>
              CBN Regulatory Compliance Watch
            </span>
            <span
              className="pill"
              style={{
                fontSize: 10,
                padding: "2px 6px",
                fontWeight: 600,
                color: hasBreach ? "var(--systemic)" : hasWarning ? "var(--emerging)" : "var(--isolated)",
                background: hasBreach ? "var(--systemic-bg)" : hasWarning ? "var(--emerging-bg)" : "var(--isolated-bg)",
              }}
            >
              {hasBreach
                ? `${summary.breachCount} SLA Breached`
                : hasWarning
                  ? `${summary.warningCount} Imminent Warning`
                  : "All Within SLA"}
            </span>
          </div>

          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
            {summary.nearestDeadlineIncident ? (
              <>
                Nearest deadline: <strong>{summary.nearestDeadlineIncident.title}</strong> (
                {summary.nearestDeadlineIncident.mandatedSlaHours}h mandate) —{" "}
                <span style={{ color: "var(--ink)", fontWeight: 500, fontFamily: "var(--font-mono), monospace" }}>
                  <LiveDuration
                    deadlineAt={summary.nearestDeadlineIncident.deadlineAt}
                    fallback={summary.nearestDeadlineIncident.statusText}
                    showSeconds={true}
                  />
                </span>
                .
              </>
            ) : (
              "No open incidents approaching regulatory breach."
            )}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ textAlign: "right" }}>
          <span className="meta" style={{ display: "block", fontSize: 10 }}>
            Potential Fine Risk
          </span>
          <strong
            style={{
              fontSize: 18,
              fontFamily: "var(--font-mono), monospace",
              color: hasBreach ? "var(--systemic)" : "var(--ink)",
            }}
          >
            {naira(summary.totalPenaltyRisk)}
          </strong>
        </div>

        {summary.nearestDeadlineIncident ? (
          <Link
            href={`/incidents/${summary.nearestDeadlineIncident.id}`}
            className="button"
            style={{ fontSize: 13, padding: "8px 14px", whiteSpace: "nowrap" }}
          >
            Inspect SLA →
          </Link>
        ) : null}
      </div>
    </section>
  );
}
