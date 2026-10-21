"use client";

import { useState } from "react";
import {
  AlertTriangleIcon,
  BroadcastIcon,
  CheckCircleIcon,
  CreditCardIcon,
  LockIcon,
  ReceiptIcon,
  SendIcon,
  ShieldIcon,
  SmartphoneIcon,
} from "@/components/icons";
import type { DeflectionModel } from "@/lib/engine/deflection.ts";
import type { IncidentResult } from "@/lib/engine/types.ts";
import { naira } from "@/lib/format.ts";

export function ProactiveAdvisory({
  model,
  incident,
}: {
  model: DeflectionModel;
  incident: IncidentResult;
}) {
  const [deployed, setDeployed] = useState(model.isDeployed);
  const [loading, setLoading] = useState(false);
  const [showPhoneMockup, setShowPhoneMockup] = useState(false);

  const handleDeploy = async () => {
    if (deployed) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/incidents/${incident.id}/advisory`, {
        method: "POST",
      });
      if (res.ok) {
        setDeployed(true);
      }
    } catch (err) {
      console.error("Failed to deploy advisory:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: "var(--white)",
        border: "1px solid var(--line)",
        borderRadius: 4,
        padding: "22px 24px",
        marginTop: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldIcon size={20} style={{ color: "var(--header)" }} />
            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 600 }}>
              Proactive In-App Advisory & Call Deflection
            </h3>
            <span
              className="pill"
              style={{
                fontSize: 10,
                padding: "2px 8px",
                fontWeight: 600,
                color: deployed ? "var(--isolated)" : "var(--emerging)",
                background: deployed ? "var(--isolated-bg)" : "var(--emerging-bg)",
              }}
            >
              {deployed ? "● Active on Mobile Channels" : "Ready for Deployment"}
            </span>
          </div>
          <p className="cell-note" style={{ margin: "4px 0 0" }}>
            Reassure customers on digital channels before they dial the contact centre. Based on commercial banking deflection benchmarks.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="button"
            onClick={() => setShowPhoneMockup(!showPhoneMockup)}
            style={{ fontSize: 13, gap: 6 }}
          >
            <SmartphoneIcon size={14} /> {showPhoneMockup ? "Hide Mobile Preview" : "Preview Mobile App"}
          </button>
          <button
            type="button"
            className={`button ${deployed ? "" : "primary"}`}
            disabled={deployed || loading}
            onClick={handleDeploy}
            style={{ fontSize: 13, gap: 6 }}
          >
            {loading ? (
              "Broadcasting..."
            ) : deployed ? (
              <>
                <CheckCircleIcon size={14} /> Advisory Broadcast Live
              </>
            ) : (
              <>
                <BroadcastIcon size={14} /> Deploy Advisory Banner
              </>
            )}
          </button>
        </div>
      </div>

      {/* ROI Impact Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          padding: "16px",
          background: "var(--band)",
          borderRadius: 4,
          marginBottom: 18,
        }}
      >
        <div>
          <span className="meta" style={{ display: "block" }}>
            Inbound Calls Prevented
          </span>
          <strong
            style={{
              fontSize: 24,
              fontFamily: "var(--font-mono), monospace",
              color: "var(--ink)",
              display: "block",
              marginTop: 2,
            }}
          >
            ~{model.preventedCalls.toLocaleString("en-NG")} calls
          </strong>
          <span className="cell-note">{Math.round(model.expectedDeflectionRate * 100)}% benchmark deflection rate</span>
        </div>

        <div>
          <span className="meta" style={{ display: "block" }}>
            Operational Cost Saved
          </span>
          <strong
            style={{
              fontSize: 24,
              fontFamily: "var(--font-mono), monospace",
              color: "var(--isolated)",
              display: "block",
              marginTop: 2,
            }}
          >
            {naira(model.nairaSaved)}
          </strong>
          <span className="cell-note">₦{model.costPerCallNaira} cost per inbound agent call</span>
        </div>

        <div>
          <span className="meta" style={{ display: "block" }}>
            Agent Queue Relieved
          </span>
          <strong
            style={{
              fontSize: 24,
              fontFamily: "var(--font-mono), monospace",
              color: "var(--ink)",
              display: "block",
              marginTop: 2,
            }}
          >
            {model.agentHoursSaved} hours
          </strong>
          <span className="cell-note">4.5 min average handle time</span>
        </div>

        <div>
          <span className="meta" style={{ display: "block" }}>
            NPS & Brand Protection
          </span>
          <strong
            style={{
              fontSize: 22,
              fontFamily: "var(--font-sans), sans-serif",
              color: "var(--ink)",
              display: "block",
              marginTop: 2,
            }}
          >
            {model.npsProtectionGrade} Impact
          </strong>
          <span className="cell-note">Deflects public social escalations</span>
        </div>
      </div>

      {/* Recommended Broadcast Channels */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span className="meta" style={{ fontSize: 11 }}>
          Broadcast Channels:
        </span>
        {model.recommendedChannels.map((channel) => (
          <span
            key={channel}
            style={{
              background: "var(--white)",
              border: "1px solid var(--line)",
              borderRadius: 3,
              padding: "2px 8px",
              fontSize: 11,
              fontFamily: "var(--font-mono), monospace",
              color: "var(--ink)",
            }}
          >
            {channel}
          </span>
        ))}
      </div>

      {/* Advisory Copy Details */}
      <div
        style={{
          borderLeft: "3px solid var(--header)",
          paddingLeft: 14,
          background: "var(--paper)",
          padding: "10px 14px",
          borderRadius: 3,
        }}
      >
        <span className="meta" style={{ display: "block", marginBottom: 2 }}>
          Customer Broadcast Copy
        </span>
        <strong style={{ fontSize: 14, color: "var(--ink)", display: "block" }}>{model.headline}</strong>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink)" }}>{model.reassuranceMessage}</p>
      </div>

      {/* Realistic Mobile Banking App Mockup Preview */}
      {showPhoneMockup && (
        <div
          style={{
            marginTop: 22,
            padding: 20,
            background: "var(--paper)",
            border: "1px dashed var(--line)",
            borderRadius: 6,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <p className="meta" style={{ marginBottom: 12 }}>
            Simulated Zenith Mobile App Pinned Customer Banner
          </p>

          <div
            style={{
              width: 320,
              background: "#0c1b2a",
              color: "#ffffff",
              borderRadius: 24,
              border: "5px solid #22374b",
              boxShadow: "0 18px 38px rgba(0,0,0,0.3)",
              overflow: "hidden",
              fontFamily: "var(--font-sans), sans-serif",
            }}
          >
            {/* Phone Status Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 18px",
                fontSize: 11,
                color: "#8aa0b6",
              }}
            >
              <span>12:45</span>
              <span>5G · 94%</span>
            </div>

            {/* App Header */}
            <div
              style={{
                padding: "12px 18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #1a2f44",
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: "#8aa0b6" }}>Good afternoon,</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Chioma Nwosu</div>
              </div>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  background: "#244363",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                }}
              >
                CN
              </div>
            </div>

            {/* Pinned Proactive Advisory Banner in Mobile App */}
            <div style={{ padding: "14px 16px" }}>
              <div
                style={{
                  background: "#1e2c1a",
                  border: "1px solid #4d8236",
                  borderRadius: 10,
                  padding: "12px 14px",
                  color: "#e8f7e2",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <AlertTriangleIcon size={14} style={{ color: "#98dc7a" }} />
                  <strong style={{ fontSize: 13, color: "#98dc7a" }}>{model.headline}</strong>
                </div>
                <p style={{ margin: 0, fontSize: 11, lineHeight: 1.45, color: "#d2ebd0" }}>
                  {model.reassuranceMessage}
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 8,
                    fontSize: 10,
                    color: "#8ac970",
                    fontWeight: 600,
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <LockIcon size={11} /> Funds Secured
                  </span>
                  <span>·</span>
                  <span>Automated Reversal Active</span>
                </div>
              </div>

              {/* Fake Account Card */}
              <div
                style={{
                  marginTop: 14,
                  background: "linear-gradient(135deg, #1b3552 0%, #102438 100%)",
                  borderRadius: 12,
                  padding: "14px",
                  border: "1px solid #28476a",
                }}
              >
                <span style={{ fontSize: 11, color: "#8aa0b6" }}>Available Balance</span>
                <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>₦1,420,850.00</div>
                <div style={{ fontSize: 10, color: "#8aa0b6", marginTop: 8 }}>Zenith Individual · 2140****91</div>
              </div>

              {/* Fake App Quick Actions */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 8,
                  marginTop: 14,
                  textAlign: "center",
                  fontSize: 10,
                  color: "#8aa0b6",
                }}
              >
                <div style={{ background: "#15283c", padding: "10px 4px", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <SendIcon size={16} />
                  <span>Transfer</span>
                </div>
                <div style={{ background: "#15283c", padding: "10px 4px", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <SmartphoneIcon size={16} />
                  <span>Airtime</span>
                </div>
                <div style={{ background: "#15283c", padding: "10px 4px", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <ReceiptIcon size={16} />
                  <span>Pay Bills</span>
                </div>
                <div style={{ background: "#15283c", padding: "10px 4px", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <CreditCardIcon size={16} />
                  <span>Cards</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
