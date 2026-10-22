import type { Channel, EmergenceLabel } from "./engine/types.ts";

const complaintNames: Record<string, string> = {
  failed_nip: "NIP credit",
  delayed_reversal: "Delayed reversal",
  duplicate_debit: "Duplicate debit",
  pos_settlement: "POS settlement",
  card_decline: "Card decline",
  wrong_beneficiary: "Wrong beneficiary",
  charge_dispute: "Charge dispute",
  login_or_otp: "Sign-in",
  channel_downtime: "Channel down",
  account_opening: "Account opening",
  card_delivery: "Card delivery",
  loan_silence: "Loan decision",
  branch_conduct: "Staff conduct",
  wrong_information: "Wrong information",
  emergency_freeze: "Emergency Freeze (Duress)",
};

const channelNames: Record<Channel, string> = {
  branch: "Branch",
  contact_centre: "Contact centre",
  email: "Email",
  social: "Social",
  app: "App",
  ussd: "USSD",
};

const lagos = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const nairaFormat = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function naira(value: number) {
  return nairaFormat.format(value);
}

export function lagosTime(iso: string) {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return "—";
  return lagos.format(parsed);
}

export function channelName(channel: Channel) {
  return channelNames[channel];
}

export function complaintName(type: string) {
  return complaintNames[type] ?? type.replaceAll("_", " ");
}

export function words(value: string | null | undefined) {
  if (!value) return "—";
  return value.replaceAll("_", " ");
}

export function severityName(label: EmergenceLabel) {
  if (label === "systemic") return "Systemic";
  if (label === "emerging") return "Emerging";
  return "Isolated";
}

export function linkName(status: string) {
  if (status === "linked") return "Payment found";
  if (status === "unlinked") return "No reference";
  if (status === "not_applicable") return "Not a payment";
  return status;
}

export function dispositionName(disposition: string) {
  if (disposition === "answer_from_incident") return "Answer with the group";
  if (disposition === "queued") return "Handle this customer alone";
  return disposition;
}
