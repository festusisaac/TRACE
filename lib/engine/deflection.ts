import type { IncidentResult } from "./types.ts";

export type DeflectionModel = {
  incidentId: string;
  headline: string;
  reassuranceMessage: string;
  recommendedChannels: string[];
  estimatedAffectedUsers: number;
  expectedDeflectionRate: number; // e.g. 0.78 (78%)
  preventedCalls: number;
  costPerCallNaira: number; // ₦450 standard contact centre cost in Nigeria
  nairaSaved: number;
  agentHoursSaved: number;
  npsProtectionGrade: "Critical" | "High" | "Moderate";
  roiMultiplier: string;
  isDeployed: boolean;
};

export type PortfolioDeflectionSummary = {
  totalPreventedCalls: number;
  totalNairaSaved: number;
  totalAgentHoursSaved: number;
  activeAdvisoriesCount: number;
  potentialAdvisoriesCount: number;
  leadingIncidentId: string | null;
};

// Standard operational benchmarks for Nigerian retail banking contact centres
const COST_PER_INBOUND_CALL = 450; // ₦450 per handled complaint call
const AVG_HANDLE_TIME_MINS = 4.5; // 4.5 minutes average resolution handle time

export function getAdvisoryCopy(signature: string, title: string): {
  headline: string;
  reassuranceMessage: string;
  recommendedChannels: string[];
} {
  const parts = signature.split("|");
  const kind = parts[1] ?? "";

  if (kind === "failed_nip" || kind === "delayed_reversal") {
    return {
      headline: "Temporary Interbank Transfer Delay",
      reassuranceMessage:
        "Transfers to other banks are currently experiencing delayed credit across the central switch. If your account was debited, your funds are completely safe and will be reconciled automatically. You do not need to call support or re-send the transfer.",
      recommendedChannels: [
        "Zenith Mobile App (Pinned Home Banner)",
        "Internet Banking Global Alert",
        "USSD *966# Pre-Menu Notice",
        "Contact Centre IVR Front-Greeting",
      ],
    };
  }

  if (kind === "authentication" || kind === "login_or_otp") {
    return {
      headline: "Mobile Banking Access Advisory",
      reassuranceMessage:
        "We are currently updating our mobile authentication gateway. If you encounter sign-in timeouts or biometric errors, please access your account via Zenith Internet Banking or *966#. Your accounts remain fully secure.",
      recommendedChannels: [
        "Mobile App Pre-Login Splash Alert",
        "Direct SMS Broadcast to Active App Users",
        "Zenith Verified Social Support Status",
      ],
    };
  }

  if (kind === "pos_settlement") {
    return {
      headline: "POS Terminal Merchant Settlement Notice",
      reassuranceMessage:
        "Batch end-of-day settlement reconciliation for Horizon POS terminals is actively running. All recorded transactions will credit your merchant settlement account today. No manual dispute submission is necessary.",
      recommendedChannels: [
        "Zenith Merchant Web Portal",
        "Dedicated Merchant WhatsApp Channel",
      ],
    };
  }

  return {
    headline: `Service Advisory: ${title}`,
    reassuranceMessage:
      "Our technical operations desk is actively resolving an operational update. Affected customer services are being restored. We apologize for any temporary inconvenience.",
    recommendedChannels: [
      "Zenith Mobile App Home Alert",
      "Internet Banking Notice",
    ],
  };
}

export function calculateDeflectionRoi(
  incident: IncidentResult,
  isDeployed = false,
): DeflectionModel {
  const { headline, reassuranceMessage, recommendedChannels } = getAdvisoryCopy(
    incident.signature,
    incident.title,
  );

  let multiplier = 1;
  let expectedDeflectionRate = 0;
  let npsProtectionGrade: DeflectionModel["npsProtectionGrade"] = "Moderate";

  if (incident.label === "systemic") {
    // For every 1 formal complaint, ~220 other customers silently face the same outage
    multiplier = incident.domain === "payment" ? 220 : 180;
    expectedDeflectionRate = 0.78; // 78% deflection of inbound panic inquiries
    npsProtectionGrade = "Critical";
  } else if (incident.label === "emerging") {
    multiplier = 90;
    expectedDeflectionRate = 0.70;
    npsProtectionGrade = "High";
  } else {
    multiplier = 1;
    expectedDeflectionRate = 0;
    npsProtectionGrade = "Moderate";
  }

  const estimatedAffectedUsers = incident.customers * multiplier;
  const preventedCalls = Math.round(estimatedAffectedUsers * expectedDeflectionRate);
  const nairaSaved = preventedCalls * COST_PER_INBOUND_CALL;
  const agentHoursSaved = Math.round((preventedCalls * AVG_HANDLE_TIME_MINS) / 60);

  const roiMultiplier =
    preventedCalls > 0
      ? `${(nairaSaved / (incident.customers * 800 || 1)).toFixed(1)}x`
      : "1.0x";

  return {
    incidentId: incident.id,
    headline,
    reassuranceMessage,
    recommendedChannels,
    estimatedAffectedUsers,
    expectedDeflectionRate,
    preventedCalls,
    costPerCallNaira: COST_PER_INBOUND_CALL,
    nairaSaved,
    agentHoursSaved,
    npsProtectionGrade,
    roiMultiplier,
    isDeployed,
  };
}

export function portfolioDeflectionSummary(
  incidents: IncidentResult[],
  deployedIncidentIds: Set<string> = new Set(),
): PortfolioDeflectionSummary {
  let totalPreventedCalls = 0;
  let totalNairaSaved = 0;
  let totalAgentHoursSaved = 0;
  let activeAdvisoriesCount = 0;
  let potentialAdvisoriesCount = 0;

  for (const incident of incidents) {
    if (incident.label === "isolated") continue;

    const isDeployed = deployedIncidentIds.has(incident.id) || Boolean(incident.advisoryDeployed);
    const model = calculateDeflectionRoi(incident, isDeployed);

    potentialAdvisoriesCount += 1;
    if (isDeployed) {
      activeAdvisoriesCount += 1;
    }

    totalPreventedCalls += model.preventedCalls;
    totalNairaSaved += model.nairaSaved;
    totalAgentHoursSaved += model.agentHoursSaved;
  }

  const leadingIncident =
    incidents.find((incident) => incident.label === "systemic") ??
    incidents.find((incident) => incident.label !== "isolated") ??
    null;

  return {
    totalPreventedCalls,
    totalNairaSaved,
    totalAgentHoursSaved,
    activeAdvisoriesCount,
    potentialAdvisoriesCount,
    leadingIncidentId: leadingIncident?.id ?? null,
  };
}
