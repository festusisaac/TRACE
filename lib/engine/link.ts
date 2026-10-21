import type {
  Classification,
  LinkResult,
  NormalizedComplaint,
  ServiceRequestInput,
  TransactionInput,
} from "./types.ts";

const LINK_WINDOW_MS = 72 * 60 * 60 * 1000;
const SKEW_MS = 15 * 60 * 1000;

function time(value: string) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function sameText(left: string | null, right: string | null) {
  if (!left || !right) return false;
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function last4(mask: string | null) {
  if (!mask) return null;
  const digits = mask.match(/(\d{4})$/);
  return digits?.[1] ?? null;
}

function withinWindow(complaintAt: string, occurredAt: string) {
  const complaint = time(complaintAt);
  const occurred = time(occurredAt);
  if (complaint === null || occurred === null) return false;
  return occurred >= complaint - LINK_WINDOW_MS && occurred <= complaint + SKEW_MS;
}

function closest(
  complaintAt: string,
  candidates: TransactionInput[],
) {
  const complaint = time(complaintAt) ?? 0;
  return [...candidates].sort(
    (left, right) =>
      Math.abs((time(left.occurredAt) ?? 0) - complaint) -
      Math.abs((time(right.occurredAt) ?? 0) - complaint),
  )[0];
}

export function linkTransaction(
  complaintAt: string,
  fields: NormalizedComplaint,
  transactions: TransactionInput[],
  complaintType: string,
): LinkResult {
  if (fields.rrn) {
    const byRrn = transactions.filter((transaction) => transaction.rrn === fields.rrn);
    if (byRrn.length === 0) {
      return {
        status: "unlinked",
        targetId: null,
        reason: "No transaction carries this RRN. The complaint still stays in the investigation.",
      };
    }
    const match = closest(complaintAt, byRrn);
    return {
      status: "linked",
      targetId: match.id,
      reason: `Matched transaction ${match.id} on RRN ${fields.rrn}.`,
    };
  }

  const family = transactions.filter((transaction) => {
    if (complaintType === "pos_settlement") return transaction.scheme === "pos";
    if (complaintType === "card_decline" || complaintType === "charge_dispute") return transaction.scheme === "card";
    return transaction.scheme === "nip";
  });
  const poolSource = family.length > 0 ? family : transactions;
  const timed = poolSource.filter((transaction) => withinWindow(complaintAt, transaction.occurredAt));
  const byAmount = fields.amount === null ? [] : timed.filter((transaction) => transaction.amount === fields.amount);
  const strong = byAmount.filter(
    (transaction) =>
      sameText(transaction.beneficiary, fields.beneficiary) ||
      (last4(transaction.accountMask) !== null && last4(transaction.accountMask) === last4(fields.accountMask)),
  );
  const pool = strong.length > 0 ? strong : byAmount;
  if (pool.length === 0) {
    return {
      status: "unlinked",
      targetId: null,
      reason: "No transaction matches this amount and time window. The complaint still stays in the investigation.",
    };
  }
  const match = closest(complaintAt, pool);
  return {
    status: "linked",
    targetId: match.id,
    reason:
      pool.length === 1
        ? `Matched transaction ${match.id} on amount and time.`
        : `Matched the closest of ${pool.length} amount candidates: ${match.id}.`,
  };
}

const requestKind: Record<string, ServiceRequestInput["kind"] | null> = {
  card_delivery: "card",
  account_opening: "onboarding",
  loan_silence: "loan",
  channel_downtime: "channel_incident",
  login_or_otp: "channel_incident",
  branch_conduct: null,
  wrong_information: null,
};

export function linkJourney(
  text: string,
  customerRef: string,
  classification: Classification,
  requests: ServiceRequestInput[],
): LinkResult {
  const mentioned = requests.find((request) => text.toLowerCase().includes(request.reference.toLowerCase()));
  if (mentioned) {
    return {
      status: "linked",
      targetId: mentioned.id,
      reason: `Matched service request ${mentioned.reference}.`,
    };
  }

  const kind = requestKind[classification.complaintType] ?? null;
  if (!kind) {
    return {
      status: "not_applicable",
      targetId: null,
      reason: "No service request applies to this complaint.",
    };
  }

  const owned = requests
    .filter((request) => request.customerRef === customerRef && request.kind === kind)
    .sort((left, right) => Date.parse(right.openedAt) - Date.parse(left.openedAt));
  if (owned.length === 0) {
    return {
      status: "not_applicable",
      targetId: null,
      reason: "No service request to find.",
    };
  }
  return {
    status: "linked",
    targetId: owned[0].id,
    reason: `Matched the customer's ${kind.replaceAll("_", " ")} request ${owned[0].reference}.`,
  };
}
