import type {
  AnnotatedInteraction,
  Classification,
  EmergenceLabel,
  Scope,
  ScorePart,
  TransactionInput,
} from "./types.ts";

export function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function problemKey(classification: Classification) {
  return `${classification.domain}:${classification.complaintType}`;
}

export function caseIdFor(customerRef: string, key: string) {
  return `case-${slug(customerRef)}-${slug(key)}`;
}

function locationKey(location: string | null) {
  if (!location) return "unspecified";
  return slug(location) || "unspecified";
}

export function signatureFor(
  classification: Classification,
  customerRef: string,
  location: string | null,
  vendor: string | null,
): { signature: string; scope: Scope } {
  if (classification.domain === "payment") {
    if (classification.complaintType === "wrong_beneficiary" || classification.complaintType === "charge_dispute") {
      return {
        signature: `payment|${classification.complaintType}|${slug(customerRef)}`,
        scope: "customer",
      };
    }
    if (classification.complaintType === "pos_settlement") {
      return {
        signature: `payment|pos_settlement|${vendor ?? "unknown"}`,
        scope: "vendor",
      };
    }
    const scheme =
      classification.complaintType === "card_decline" ? "card" : "nip";
    return {
      signature: `payment|${classification.complaintType}|${scheme}`,
      scope: "network",
    };
  }

  if (classification.complaintType === "emergency_freeze") {
    return {
      signature: `service|fraud_distress|emergency_freeze|${slug(customerRef)}`,
      scope: "customer",
    };
  }
  if (classification.complaintType === "branch_conduct") {
    return {
      signature: `service|branch_service|staff_conduct|${slug(customerRef)}`,
      scope: "customer",
    };
  }
  if (classification.complaintType === "wrong_information") {
    return {
      signature: `service|branch_service|wrong_information|${locationKey(location)}`,
      scope: "location",
    };
  }
  return {
    signature: `service|${classification.journey}|${classification.failureMode}`,
    scope: "network",
  };
}

export function incidentIdFor(signature: string) {
  return `inc-${slug(signature)}`;
}

export function labelFor(observed: number, baseline: number, scope: Scope): EmergenceLabel {
  if (scope === "customer" || observed <= 1) return "isolated";
  const ratio = observed / Math.max(baseline, 1);
  if (scope === "location") {
    if (observed >= 5 && ratio >= 2) return "systemic";
    if (observed >= 3 && ratio >= 1.5) return "emerging";
    return "isolated";
  }
  if (observed >= 8 && ratio >= 2) return "systemic";
  if (observed >= 3 && ratio >= 2) return "emerging";
  return "isolated";
}

const titles: Record<string, string> = {
  failed_nip: "NIP credit timeout",
  delayed_reversal: "Delayed reversal",
  duplicate_debit: "Duplicate debit",
  pos_settlement: "POS settlement mismatch",
  card_decline: "Card declines",
  wrong_beneficiary: "Wrong beneficiary",
  charge_dispute: "Charge dispute",
  login_or_otp: "Mobile app sign-in failure",
  channel_downtime: "Digital channel unavailable",
  account_opening: "Account opening stalled",
  card_delivery: "Card not delivered",
  loan_silence: "Loan decision silence",
  branch_conduct: "Branch staff conduct",
  wrong_information: "Wrong information at a branch",
  emergency_freeze: "🚨 CRITICAL: Customer Under Duress (One Chance / Robbery)",
};

export function titleFor(complaintType: string, scope: Scope, location: string | null) {
  const base = titles[complaintType] ?? complaintType;
  if (scope === "location" && location) return `${base} — ${location}`;
  return base;
}

export function ownerFor(complaintType: string) {
  switch (complaintType) {
    case "emergency_freeze":
      return "fraud & security ops";
    case "failed_nip":
    case "delayed_reversal":
    case "duplicate_debit":
    case "pos_settlement":
      return "payments ops";
    case "card_decline":
      return "cards";
    case "wrong_beneficiary":
      return "contact centre";
    case "charge_dispute":
      return "fraud";
    case "login_or_otp":
    case "channel_downtime":
      return "digital channels";
    case "account_opening":
      return "onboarding";
    case "card_delivery":
      return "card fulfilment";
    case "loan_silence":
      return "credit";
    case "branch_conduct":
    case "wrong_information":
      return "branch service";
    default:
      return "contact centre";
  }
}

export function nextActionFor(
  complaintType: string,
  label: EmergenceLabel,
  acknowledged: boolean,
  location: string | null,
) {
  if (complaintType === "emergency_freeze") {
    return acknowledged
      ? "PND Freeze Applied. Fraud & Security Ops is monitoring and active cards are hotlisted."
      : "CRITICAL THREAT: Apply immediate Post-No-Debit (PND) freeze and hotlist active cards to protect customer funds.";
  }
  if (acknowledged) return "Already accepted. Answer new messages from this incident.";
  if (label === "isolated" && complaintType === "wrong_beneficiary") {
    return "Investigate this customer alone. The transfer does not match a wider failure.";
  }
  if (label === "isolated" && complaintType === "branch_conduct") {
    return "Branch service follows up with this customer. Do not add it to a payment or sign-in incident.";
  }
  if (complaintType === "wrong_information") {
    return `Correct the explanation at ${location ?? "the branch"}. This is that branch, not a payment-network failure.`;
  }
  if (complaintType === "login_or_otp" || complaintType === "channel_downtime") {
    return "Digital channels should publish a status and answer these customers from this incident.";
  }
  if (complaintType === "pos_settlement") {
    return "Watch this vendor and confirm the settlement file before it reaches the contact centre.";
  }
  if (label === "systemic" || label === "emerging") {
    return "Name the team, stop investigating each message on its own, and answer the group from this incident.";
  }
  return "Keep this case on the individual queue.";
}

function mode(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

export function responsePattern(transactions: TransactionInput[]) {
  return mode(transactions.map((transaction) => transaction.responseCode).filter((code): code is string => Boolean(code))) ?? "unspecified";
}

export function valueInFlight(
  members: AnnotatedInteraction[],
  transactions: Map<string, TransactionInput>,
) {
  if (members.some((member) => member.classification.domain === "service")) {
    const onlyService = members.every((member) => member.classification.domain === "service");
    if (onlyService) return 0;
  }
  const counted = new Set<string>();
  let total = 0;
  for (const member of members) {
    if (member.classification.domain !== "payment") continue;
    if (member.link.targetId && transactions.has(member.link.targetId)) {
      if (counted.has(member.link.targetId)) continue;
      counted.add(member.link.targetId);
      total += transactions.get(member.link.targetId)?.amount ?? 0;
      continue;
    }
    total += member.amount ?? 0;
  }
  return total;
}

function points(label: string, detail: string, value: number): ScorePart {
  return { label, detail, points: value };
}

export function scoreGroup(
  members: AnnotatedInteraction[],
  label: EmergenceLabel,
  acknowledged: boolean,
  transactions: Map<string, TransactionInput>,
): { priority: number; parts: ScorePart[] } {
  const customers = new Set(members.map((member) => member.customerRef)).size;
  const domain = members[0]?.classification.domain ?? "service";
  const parts: ScorePart[] = [];
  const labelPoints = label === "systemic" ? 36 : label === "emerging" ? 16 : 4;
  parts.push(points("Spread", `${label} pattern`, labelPoints));
  parts.push(
    points(
      "Customers",
      `${customers} distinct customer${customers === 1 ? "" : "s"}`,
      Math.min(customers, 20) * (domain === "service" ? 3 : 2),
    ),
  );

  if (domain === "payment") {
    const value = valueInFlight(members, transactions);
    const valuePoints = Math.min(25, Math.round(Math.log10(value + 1) * 6));
    parts.push(points("Value in flight", `₦${value.toLocaleString("en-NG")}`, valuePoints));
  } else {
    const oldest = members.reduce((min, member) => Math.min(min, Date.parse(member.receivedAt)), Number.POSITIVE_INFINITY);
    const newest = members.reduce((max, member) => Math.max(max, Date.parse(member.receivedAt)), 0);
    const ageMinutes = Number.isFinite(oldest) ? Math.max(0, Math.round((newest - oldest) / 60000)) : 0;
    parts.push(points("Time blocked", `${ageMinutes} minutes between first and latest report`, Math.min(20, Math.round(ageMinutes / 15))));
    const repeats = Math.max(0, members.length - customers);
    parts.push(points("Repeat contacts", `${repeats} extra message${repeats === 1 ? "" : "s"} from the same customers`, Math.min(12, repeats * 2)));
  }

  if (members.some((member) => member.channel === "social")) {
    parts.push(points("Reputation", "A social channel is already carrying this", domain === "service" ? 10 : 8));
  }
  if (members.some((member) => member.classification.complaintType === "emergency_freeze")) {
    parts.push(points("Distress Alarm", "CRITICAL LIFE & FRAUD THREAT: Immediate PND freeze requested under duress", 100));
  }
  const channelCount = new Set(members.map((member) => member.channel)).size;
  if (channelCount >= 3) {
    parts.push(points("Channels", `${channelCount} channels are reporting it`, 6));
  }
  if (acknowledged) {
    parts.push(points("Acknowledged", "An owner has already taken this incident", -50));
  }

  const priority = Math.max(0, Math.min(100, parts.reduce((sum, part) => sum + part.points, 0)));
  return { priority, parts };
}
