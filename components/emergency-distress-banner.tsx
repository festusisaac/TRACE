"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShieldIcon, ZapIcon } from "@/components/icons";
import { channelName, lagosTime } from "@/lib/format.ts";

type EmergencyData = {
  hasEmergency: boolean;
  incidentId?: string | null;
  caseId?: string;
  customerRef?: string;
  text?: string;
  location?: string | null;
  channel?: string;
  receivedAt?: string;
  isPndApplied?: boolean;
};

export function EmergencyDistressBanner() {
  const router = useRouter();
  const [data, setData] = useState<EmergencyData | null>(null);
  const [freezing, setFreezing] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const checkEmergency = async () => {
    try {
      const res = await fetch("/api/emergency", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as EmergencyData;
        setData(json);
      }
    } catch {
      // silent fallback
    }
  };

  useEffect(() => {
    checkEmergency();
    const interval = setInterval(checkEmergency, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleApplyPnd = async () => {
    if (!data?.incidentId) return;
    setFreezing(true);
    try {
      const res = await fetch("/api/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: data.incidentId, customerRef: data.customerRef }),
      });
      if (res.ok) {
        setData((prev) => (prev ? { ...prev, isPndApplied: true } : prev));
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFreezing(false);
    }
  };

  if (!data || !data.hasEmergency || dismissed) return null;

  return (
    <aside
      role="alert"
      aria-live="assertive"
      style={{
        background: "linear-gradient(90deg, #5c0b0b 0%, #8b1818 100%)",
        color: "#ffffff",
        borderBottom: "2px solid #ef4444",
        padding: "12px 24px",
        boxShadow: "0 8px 24px rgba(139, 24, 24, 0.35)",
        animation: "pulseRed 2s infinite ease-in-out",
        position: "relative",
        zIndex: 999,
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        {/* Left Info: Alert Badge & Customer Cry */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flex: "1 1 500px" }}>
          <div
            style={{
              background: "#ef4444",
              color: "#fff",
              width: 38,
              height: 38,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 0 16px rgba(239, 68, 68, 0.8)",
              marginTop: 2,
            }}
          >
            <ShieldIcon size={20} />
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 3 }}>
              <span
                style={{
                  background: "#b82424",
                  border: "1px solid #fca5a5",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  padding: "2px 8px",
                  borderRadius: 4,
                }}
              >
                🚨 CRITICAL DISTRESS ALARM · ROBBERY / ONE CHANCE UNDER DURESS
              </span>
              <span style={{ fontSize: 12, color: "#fecaca", fontWeight: 600 }}>
                Customer: {data.customerRef}
              </span>
              <span style={{ fontSize: 11, color: "#cbd5e1" }}>
                {data.channel ? channelName(data.channel as any) : "Direct"} · {data.location ?? "Lagos"} · {data.receivedAt ? lagosTime(data.receivedAt) : "Just now"}
              </span>
            </div>

            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 500,
                color: "#fff",
                lineHeight: 1.35,
                fontStyle: "italic",
              }}
            >
              &ldquo;{data.text}&rdquo;
            </p>
          </div>
        </div>

        {/* Right Actions: Instant PND Freeze & Quick Links */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {!data.isPndApplied ? (
            <button
              type="button"
              onClick={handleApplyPnd}
              disabled={freezing}
              style={{
                background: "#ffffff",
                color: "#b82424",
                border: "none",
                borderRadius: 5,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 7,
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
                transition: "all 0.15s ease",
              }}
              title="Apply Post-No-Debit (PND) freeze immediately"
            >
              <ZapIcon size={14} />
              <span>{freezing ? "Executing Freeze…" : "🔒 Apply Instant PND Freeze"}</span>
            </button>
          ) : (
            <span
              style={{
                background: "#065f46",
                border: "1px solid #34d399",
                color: "#ecfdf5",
                borderRadius: 5,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>✓ PND Applied · Account Locked & Cards Hotlisted</span>
            </span>
          )}

          {data.caseId && (
            <Link
              href={`/cases/${data.caseId}`}
              style={{
                color: "#fecaca",
                fontSize: 12,
                textDecoration: "underline",
                padding: "4px 6px",
              }}
            >
              Open Case
            </Link>
          )}

          {data.incidentId && (
            <Link
              href={`/incidents/${data.incidentId}`}
              style={{
                color: "#fecaca",
                fontSize: 12,
                textDecoration: "underline",
                padding: "4px 6px",
              }}
            >
              Open Incident
            </Link>
          )}

          <button
            type="button"
            onClick={() => setDismissed(true)}
            style={{
              background: "transparent",
              border: "none",
              color: "#fca5a5",
              cursor: "pointer",
              fontSize: 16,
              padding: "4px 8px",
            }}
            title="Acknowledge & Hide banner"
          >
            ✕
          </button>
        </div>
      </div>
    </aside>
  );
}
