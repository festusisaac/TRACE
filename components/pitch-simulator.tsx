"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircleIcon,
  PlayIcon,
  RotateCcwIcon,
  SirenIcon,
  SmartphoneIcon,
  Volume2Icon,
  VolumeXIcon,
  XCloseIcon,
  ZapIcon,
} from "@/components/icons";
import { SURGE_SCENARIOS, type SurgeScenario } from "@/lib/engine/surge-scenarios.ts";
import { naira } from "@/lib/format.ts";
import { playEmergencyAlarm } from "@/lib/audio-alarm.ts";

export function PitchSimulator() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string>("nip_surge");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamIndex, setStreamIndex] = useState(0);
  const [streamTotal, setStreamTotal] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [latestToast, setLatestToast] = useState<{
    id?: string;
    customer: string;
    channel: string;
    text: string;
    amount: number | null;
  } | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const streamRef = useRef<{ active: boolean; timeoutId?: NodeJS.Timeout }>({ active: false });
  const lastKnownIdRef = useRef<string | null>(null);
  const lastToastTimeRef = useRef<number>(0);
  const initialFetchedRef = useRef(false);

  const activeScenario =
    SURGE_SCENARIOS.find((s) => s.id === selectedScenario) ?? SURGE_SCENARIOS[0];

  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  const showNotification = (customer: string, channel: string, text: string, amount: number | null) => {
    const toastToken = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setLatestToast({ id: toastToken, customer, channel, text, amount });
    if (soundEnabled) {
      const isDistress =
        /one chance|kidnap|robbery|gunpoint|duress|block my account|freeze my account|draining/i.test(text) ||
        selectedScenario === "distress_surge";
      if (isDistress) {
        playEmergencyAlarm({ volume: 0.32 });
      } else {
        playChime();
      }
    }
    setTimeout(() => {
      setLatestToast((prev) => (prev?.id === toastToken ? null : prev));
    }, 4500);
  };

  // 1. Listen for immediate client-side complaint submissions (e.g. from Intake Desk /receive)
  useEffect(() => {
    const handleNewComplaint = (event: Event) => {
      const custom = event as CustomEvent<{
        id?: string;
        customer: string;
        channel: string;
        text: string;
        amount: number | null;
      }>;
      if (custom.detail) {
        if (custom.detail.id) {
          lastKnownIdRef.current = custom.detail.id;
        }
        lastToastTimeRef.current = Date.now();
        showNotification(
          custom.detail.customer || "Customer",
          custom.detail.channel || "direct",
          custom.detail.text || "",
          custom.detail.amount ?? null,
        );
      }
    };

    window.addEventListener("trace:new-complaint", handleNewComplaint);
    return () => window.removeEventListener("trace:new-complaint", handleNewComplaint);
  }, [soundEnabled]);

  // 2. Poll for external / background complaints (e.g. filed from other tabs, direct API, or webhooks)
  useEffect(() => {
    let isMounted = true;

    const checkLatest = async () => {
      try {
        const res = await fetch("/api/intake/latest", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted || !data || !data.id) return;

        // On initial mount, register the current latest ID without toasting old records
        if (!initialFetchedRef.current) {
          initialFetchedRef.current = true;
          lastKnownIdRef.current = data.id;
          return;
        }

        // If a new complaint appeared
        if (data.id !== lastKnownIdRef.current) {
          lastKnownIdRef.current = data.id;

          // If pitch simulator itself is active streaming, it already handles its own notifications
          if (streamRef.current.active) return;

          // If a local event was fired in the last 2.2 seconds, skip double-toasting
          if (Date.now() - lastToastTimeRef.current < 2200) return;

          lastToastTimeRef.current = Date.now();
          showNotification(
            data.customerRef || "Customer",
            data.channel || "direct",
            data.text || "",
            data.amount ? Number(data.amount) : null,
          );
          router.refresh();
        }
      } catch {
        // Silent network retry
      }
    };

    checkLatest();
    const interval = setInterval(checkLatest, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [router, soundEnabled]);

  const handleInjectSingle = async (scenario: SurgeScenario, index: number) => {
    const template = scenario.complaints[index];
    try {
      const res = await fetch("/api/demo/surge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: scenario.id, singleIndex: index }),
      });
      if (res.ok) {
        showNotification(template.customerName, template.channel, template.text, template.amount);
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to inject complaint:", err);
    }
  };

  const handleStartStream = async () => {
    if (isStreaming) {
      // Stop
      streamRef.current.active = false;
      if (streamRef.current.timeoutId) clearTimeout(streamRef.current.timeoutId);
      setIsStreaming(false);
      return;
    }

    const scenario = activeScenario;
    setIsStreaming(true);
    setStreamTotal(scenario.complaints.length);
    setStreamIndex(0);
    streamRef.current.active = true;

    for (let i = 0; i < scenario.complaints.length; i++) {
      if (!streamRef.current.active) break;
      setStreamIndex(i + 1);
      await handleInjectSingle(scenario, i);
      if (i < scenario.complaints.length - 1) {
        await new Promise((resolve) => {
          streamRef.current.timeoutId = setTimeout(resolve, 1600);
        });
      }
    }

    setIsStreaming(false);
    streamRef.current.active = false;
    setActionNotice("Live surge sequence complete! AI clustering updated.");
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleInstantSurge = async () => {
    try {
      setActionNotice("Bursting all complaints into intake pipeline...");
      const res = await fetch("/api/demo/surge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: activeScenario.id }),
      });
      if (res.ok) {
        const data = await res.json();
        playChime();
        showNotification(
          `Surge Batch (${data.injectedCount} complaints)`,
          "multi-channel",
          `${activeScenario.title} injected into switch log.`,
          null,
        );
        router.refresh();
        setActionNotice(`Injected ${data.injectedCount} complaints instantly!`);
        setTimeout(() => setActionNotice(null), 3500);
      }
    } catch (err) {
      console.error(err);
      setActionNotice("Failed to inject surge.");
    }
  };

  const handleResetDemo = async () => {
    if (isStreaming) {
      streamRef.current.active = false;
      if (streamRef.current.timeoutId) clearTimeout(streamRef.current.timeoutId);
      setIsStreaming(false);
    }
    setActionNotice("Resetting demo to clean baseline...");
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      if (res.ok) {
        router.refresh();
        setActionNotice("Demo reset to baseline successfully!");
        setTimeout(() => setActionNotice(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setActionNotice("Error resetting demo.");
    }
  };

  const handleDeployAdvisory = async () => {
    try {
      setActionNotice("Deploying in-app advisory to mobile banking app...");
      const res = await fetch("/api/incidents/inc-payment-failed-nip-nip/advisory", {
        method: "POST",
      });
      if (res.ok) {
        playChime();
        router.refresh();
        setActionNotice("In-App Advisory deployed live! Deflection model active.");
        setTimeout(() => setActionNotice(null), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      {/* Live Ingestion Toast Alert (Bottom Left) */}
      {latestToast && (
        <aside
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: 24,
            left: 24,
            zIndex: 10000,
            background: "#10283f",
            color: "#f8fafc",
            borderRadius: 6,
            padding: "12px 16px",
            maxWidth: 420,
            boxShadow: "0 12px 32px rgba(16, 40, 63, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.12)",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            animation: "slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div
            style={{
              background: "#b82424",
              color: "#fff",
              width: 30,
              height: 30,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            <ZapIcon size={15} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <span
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontWeight: 700,
                  color: "#e2b340",
                }}
              >
                Live Complaint Ingestion
              </span>
              <span
                style={{
                  fontSize: 10,
                  background: "rgba(255, 255, 255, 0.15)",
                  padding: "1px 6px",
                  borderRadius: 3,
                  fontFamily: "var(--font-mono), monospace",
                }}
              >
                {latestToast.channel.toUpperCase()}
              </span>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: "#fff" }}>
              {latestToast.customer}
              {latestToast.amount ? ` · ${naira(latestToast.amount)}` : ""}
            </p>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 12,
                color: "#cbd5e1",
                lineHeight: 1.35,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              &ldquo;{latestToast.text}&rdquo;
            </p>
          </div>
        </aside>
      )}

      {/* Floating Trigger Dock Button (Bottom Right) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9998,
            background: isStreaming ? "#b82424" : "#10283f",
            color: "#fff",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: 999,
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 9,
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(16, 40, 63, 0.35)",
            transition: "all 0.2s ease",
          }}
          title="Open Live Pitch Simulator"
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: isStreaming ? "#ef4444" : "#10b981",
              boxShadow: isStreaming ? "0 0 10px #ef4444" : "0 0 8px #10b981",
              display: "inline-block",
            }}
          />
          <ZapIcon size={16} />
          <span>{isStreaming ? `Surge Ingesting (${streamIndex}/${streamTotal})` : "Pitch Simulator"}</span>
        </button>
      )}

      {/* Expanded Stage Controller Modal / Drawer */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Live Pitch Mode Surge Simulator"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: 440,
            maxWidth: "calc(100vw - 48px)",
            zIndex: 9999,
            background: "#ffffff",
            border: "1px solid var(--line)",
            borderRadius: 8,
            boxShadow: "0 20px 48px rgba(16, 40, 63, 0.28), 0 0 0 1px rgba(16, 40, 63, 0.08)",
            overflow: "hidden",
            animation: "scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "#10283f",
              color: "#fff",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  background: "#b82424",
                  color: "#fff",
                  width: 28,
                  height: 28,
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ZapIcon size={16} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#fff", letterSpacing: "-0.01em" }}>
                  Live Pitch Surge Simulator
                </h3>
                <span style={{ fontSize: 11, color: "#cbd5e1" }}>
                  Stage Demo Tool · Real-Time Incident Ingestion
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: soundEnabled ? "#e2b340" : "#94a3b8",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                }}
                title={soundEnabled ? "Mute Chime" : "Enable Chime"}
              >
                {soundEnabled ? <Volume2Icon size={16} /> : <VolumeXIcon size={16} />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#cbd5e1",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <XCloseIcon size={18} />
              </button>
            </div>
          </div>

          <div style={{ padding: "16px 18px", maxHeight: "72vh", overflowY: "auto" }}>
            {/* Scenario Selector */}
            <p className="aside-label" style={{ margin: "0 0 8px" }}>
              Select Pitch Scenario
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {SURGE_SCENARIOS.map((scenario) => {
                const isSelected = scenario.id === selectedScenario;
                return (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => {
                      if (!isStreaming) setSelectedScenario(scenario.id);
                    }}
                    disabled={isStreaming}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 6,
                      background: isSelected ? "var(--band)" : "var(--white)",
                      border: isSelected ? "2px solid #b82424" : "1px solid var(--line)",
                      cursor: isStreaming ? "not-allowed" : "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>
                        {scenario.shortLabel}
                      </span>
                      <span
                        className="pill"
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          fontWeight: 600,
                          color: scenario.category.includes("Distress") || scenario.category.includes("Critical")
                            ? "#ffffff"
                            : scenario.category.includes("Systemic")
                              ? "var(--systemic)"
                              : scenario.category.includes("Emerging")
                                ? "var(--emerging)"
                                : "var(--isolated)",
                          background: scenario.category.includes("Distress") || scenario.category.includes("Critical")
                            ? "#b82424"
                            : scenario.category.includes("Systemic")
                              ? "var(--systemic-bg)"
                              : scenario.category.includes("Emerging")
                                ? "var(--emerging-bg)"
                                : "var(--isolated-bg)",
                        }}
                      >
                        {scenario.complaints.length} complaint{scenario.complaints.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", lineHeight: 1.35 }}>
                      {scenario.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Expected Pitch Impact Box */}
            <div
              style={{
                background: "var(--band)",
                padding: "10px 12px",
                borderRadius: 4,
                marginBottom: 16,
                fontSize: 12,
                color: "var(--ink)",
                borderLeft: "3px solid #b82424",
              }}
            >
              <strong style={{ display: "block", fontSize: 11, textTransform: "uppercase", color: "var(--muted)", marginBottom: 2 }}>
                Presentation Drama / Stage Outcome
              </strong>
              {activeScenario.expectedOutcome}
            </div>

            {/* Action Feedback Notice */}
            {actionNotice && (
              <div
                style={{
                  background: "#10283f",
                  color: "#fff",
                  padding: "8px 12px",
                  borderRadius: 4,
                  fontSize: 12,
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <CheckCircleIcon size={14} />
                <span>{actionNotice}</span>
              </div>
            )}

            {/* Streaming Progress Bar */}
            {isStreaming && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
                  <span>Live Intake Stream Active</span>
                  <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                    {streamIndex} / {streamTotal} Complaints
                  </span>
                </div>
                <div style={{ height: 6, background: "var(--line)", borderRadius: 3, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${(streamIndex / streamTotal) * 100}%`,
                      background: "#b82424",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Primary Action Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="button primary"
                  onClick={handleStartStream}
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    gap: 6,
                    background: isStreaming ? "#b82424" : undefined,
                  }}
                >
                  <PlayIcon size={14} />
                  {isStreaming ? `Stop Stream (${streamIndex}/${streamTotal})` : "▶ Stream Live (1 every 1.5s)"}
                </button>

                <button
                  type="button"
                  className="button"
                  onClick={handleInstantSurge}
                  disabled={isStreaming}
                  style={{ justifyContent: "center", gap: 6, opacity: isStreaming ? 0.6 : 1 }}
                  title="Inject all complaints at once"
                >
                  <ZapIcon size={14} />
                  Instant Burst
                </button>
              </div>

              {/* Stage Mitigation: Deploy In-App Advisory */}
              <button
                type="button"
                className="button"
                onClick={handleDeployAdvisory}
                style={{
                  width: "100%",
                  justifyContent: "center",
                  gap: 6,
                  borderColor: "var(--isolated)",
                  color: "var(--isolated)",
                  fontWeight: 600,
                }}
              >
                <SmartphoneIcon size={15} />
                Deploy In-App Advisory & Route Traffic
              </button>

              {/* Reset to Clean Baseline */}
              <button
                type="button"
                className="quiet-link"
                onClick={handleResetDemo}
                style={{
                  width: "100%",
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  fontSize: 12,
                  padding: "6px 0",
                  cursor: "pointer",
                }}
              >
                <RotateCcwIcon size={13} /> Reset Demo to Clean Baseline
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
