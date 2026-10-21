import type { Domain, IncidentResult, InteractionInput } from "./types.ts";

export type CbnSlaStatus = "compliant" | "warning" | "breached";

export type CbnAssessment = {
  incidentId: string;
  circularTitle: string;
  circularRef: string;
  mandatedSlaHours: number;
  oldestReceivedAt: string;
  deadlineAt: string;
  elapsedMinutes: number;
  remainingMinutes: number;
  status: CbnSlaStatus;
  statusText: string;
  affectedCustomers: number;
  finePerCustomer: number;
  totalPenaltyRisk: number;
  fineRiskExplanation: string;
  summarySentence: string;
};

export type CbnPortfolioSummary = {
  totalPenaltyRisk: number;
  breachCount: number;
  warningCount: number;
  compliantCount: number;
  nearestDeadlineIncident: {
    id: string;
    title: string;
    deadlineAt: string;
    remainingMinutes: number;
    statusText: string;
    mandatedSlaHours: number;
  } | null;
};

// Regulatory fine standard under CBN Consumer Protection Framework & EFT Circular
const CBN_FINE_PER_VIOLATION = 50_000;

export function getCbnMandate(domain: Domain, signature: string): {
  circularTitle: string;
  circularRef: string;
  mandatedSlaHours: number;
} {
  const parts = signature.split("|");
  const kind = parts[1] ?? "";

  if (kind === "failed_nip" || kind === "delayed_reversal" || kind === "duplicate_debit") {
    return {
      circularTitle: "Regulation on Instant Inter-Bank Electronic Funds Transfer",
      circularRef: "CBN/BPS/DIR/GEN/CIR/01/015",
      mandatedSlaHours: 24, // Mandatory T+1 (24-hour) reversal & dispute window
    };
  }

  if (kind === "pos_settlement" || kind === "card_decline" || kind === "charge_dispute") {
    return {
      circularTitle: "Guidelines on Operations of Electronic Payment Channels (ATM/POS/Web)",
      circularRef: "CBN/BPS/DIR/GEN/CIR/02/004",
      mandatedSlaHours: 48, // Mandatory T+2 (48-hour) dispute resolution window
    };
  }

  if (domain === "payment") {
    return {
      circularTitle: "Guidelines on Transaction Dispute Resolution",
      circularRef: "CBN/BPS/DIR/GEN/CIR/02/004",
      mandatedSlaHours: 48,
    };
  }

  // Service complaints (non-financial: authentication, onboarding, branches)
  return {
    circularTitle: "Consumer Protection Framework (Service Complaint Mandate)",
    circularRef: "CBN/FSS/DIR/PUB/01/001",
    mandatedSlaHours: 72, // 3 business days / 72 hours
  };
}

export function formatDuration(minutes: number): string {
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const remainingMins = Math.floor(absolute % 60);

  if (minutes < 0) {
    return `Breached by ${hours}h ${remainingMins}m`;
  }
  return `${hours}h ${remainingMins}m remaining`;
}

export function formatDurationSeconds(seconds: number): string {
  const absolute = Math.abs(seconds);
  const hours = Math.floor(absolute / 3600);
  const remainingMins = Math.floor((absolute % 3600) / 60);
  const remainingSecs = Math.floor(absolute % 60);

  const pad = (n: number) => String(n).padStart(2, "0");

  if (seconds < 0) {
    return `Breached by ${hours}h ${pad(remainingMins)}m ${pad(remainingSecs)}s`;
  }
  return `${hours}h ${pad(remainingMins)}m ${pad(remainingSecs)}s remaining`;
}

export function assessCbnSla(
  incident: IncidentResult,
  memberInteractions: InteractionInput[],
  asOf: string = new Date().toISOString(),
): CbnAssessment {
  const mandate = getCbnMandate(incident.domain, incident.signature);

  // Determine earliest complaint arrival
  const timestamps = memberInteractions
    .map((item) => Date.parse(item.receivedAt))
    .filter((time) => !Number.isNaN(time));

  const asOfTime = Date.parse(asOf) || Date.now();
  const earliestTime = timestamps.length > 0 ? Math.min(...timestamps) : asOfTime;
  const oldestReceivedAt = new Date(earliestTime).toISOString();

  const deadlineTime = earliestTime + mandate.mandatedSlaHours * 60 * 60 * 1000;
  const deadlineAt = new Date(deadlineTime).toISOString();

  const elapsedMinutes = Math.max(0, Math.floor((asOfTime - earliestTime) / (60 * 1000)));
  const remainingMinutes = Math.floor((deadlineTime - asOfTime) / (60 * 1000));

  let status: CbnSlaStatus = "compliant";
  if (remainingMinutes <= 0) {
    status = "breached";
  } else if (remainingMinutes <= 360) {
    // Less than 6 hours remaining before regulatory sanction
    status = "warning";
  }

  const affectedCustomers = incident.customers > 0 ? incident.customers : 1;
  const totalPenaltyRisk = affectedCustomers * CBN_FINE_PER_VIOLATION;

  let fineRiskExplanation = `₦${totalPenaltyRisk.toLocaleString("en-NG")} potential fine under ${mandate.circularRef}`;
  if (status === "breached") {
    fineRiskExplanation = `Active breach: ₦${totalPenaltyRisk.toLocaleString("en-NG")} sanction exposure for ${affectedCustomers} customer${affectedCustomers > 1 ? "s" : ""}`;
  } else if (status === "warning") {
    fineRiskExplanation = `Critical: ₦${totalPenaltyRisk.toLocaleString("en-NG")} penalty if not resolved within ${formatDuration(remainingMinutes)}`;
  }

  const statusText = formatDuration(remainingMinutes);

  let summarySentence = "";
  if (status === "breached") {
    summarySentence = `This incident has exceeded the Central Bank ${mandate.mandatedSlaHours}h resolution timeline. Immediate regulatory escalation required.`;
  } else if (status === "warning") {
    summarySentence = `Impending CBN ${mandate.mandatedSlaHours}h deadline in ${statusText}. Prioritize resolution to prevent administrative penalties.`;
  } else {
    summarySentence = `Within the mandated ${mandate.mandatedSlaHours}h turnaround time (${statusText}).`;
  }

  return {
    incidentId: incident.id,
    circularTitle: mandate.circularTitle,
    circularRef: mandate.circularRef,
    mandatedSlaHours: mandate.mandatedSlaHours,
    oldestReceivedAt,
    deadlineAt,
    elapsedMinutes,
    remainingMinutes,
    status,
    statusText,
    affectedCustomers,
    finePerCustomer: CBN_FINE_PER_VIOLATION,
    totalPenaltyRisk,
    fineRiskExplanation,
    summarySentence,
  };
}

export function assessAllCbnSla(
  incidents: IncidentResult[],
  interactions: InteractionInput[],
  asOf: string = new Date().toISOString(),
): Map<string, CbnAssessment> {
  const byId = new Map<string, InteractionInput[]>();
  for (const interaction of interactions) {
    const list = byId.get(interaction.id) ?? [];
    list.push(interaction);
    byId.set(interaction.id, list);
  }

  const assessments = new Map<string, CbnAssessment>();
  for (const incident of incidents) {
    const members = interactions.filter((item) => incident.memberIds.includes(item.id));
    assessments.set(incident.id, assessCbnSla(incident, members, asOf));
  }
  return assessments;
}

export function cbnPortfolioSummary(
  incidents: IncidentResult[],
  interactions: InteractionInput[],
  asOf: string = new Date().toISOString(),
): CbnPortfolioSummary {
  const assessments = assessAllCbnSla(incidents, interactions, asOf);

  let totalPenaltyRisk = 0;
  let breachCount = 0;
  let warningCount = 0;
  let compliantCount = 0;

  let nearestDeadlineIncident: CbnPortfolioSummary["nearestDeadlineIncident"] = null;
  let minRemaining = Number.POSITIVE_INFINITY;

  for (const incident of incidents) {
    // Only non-isolated or active incidents carry systemic regulatory threat
    const assessment = assessments.get(incident.id);
    if (!assessment) continue;

    totalPenaltyRisk += assessment.totalPenaltyRisk;

    if (assessment.status === "breached") {
      breachCount += 1;
    } else if (assessment.status === "warning") {
      warningCount += 1;
    } else {
      compliantCount += 1;
    }

    if (assessment.remainingMinutes < minRemaining) {
      minRemaining = assessment.remainingMinutes;
      nearestDeadlineIncident = {
        id: incident.id,
        title: incident.title,
        deadlineAt: assessment.deadlineAt,
        remainingMinutes: assessment.remainingMinutes,
        statusText: assessment.statusText,
        mandatedSlaHours: assessment.mandatedSlaHours,
      };
    }
  }

  return {
    totalPenaltyRisk,
    breachCount,
    warningCount,
    compliantCount,
    nearestDeadlineIncident,
  };
}
