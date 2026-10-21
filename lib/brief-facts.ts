import type { IncidentResult } from "./engine/types.ts";
import { naira, severityName } from "./format.ts";

export type BriefFacts = {
  title: string;
  reading: string;
  domain: "payment" | "service";
  suggestedTeam: string;
  customers: number;
  messages: number;
  normalLevel: number;
  outstandingNaira: number;
  outstanding: string;
  responseCode: string;
  places: string;
  linkedPayments: number;
  publicity: string;
  accepted: string;
  nextAction: string;
  evidence: string[];
};

const promisedOutcome =
  /\b(has been|have been|was|were) (reversed|refunded|recovered)\b|\bwe (have )?(refunded|reversed)\b|\bmoney has been returned\b|\bguaranteed\b/i;

export function briefFacts(incident: IncidentResult): BriefFacts {
  const payment = incident.domain === "payment";
  return {
    title: incident.title,
    reading: severityName(incident.label),
    domain: incident.domain,
    suggestedTeam: incident.owner,
    customers: incident.customers,
    messages: incident.interactionCount,
    normalLevel: incident.baseline,
    outstandingNaira: payment ? incident.valueInFlight : 0,
    outstanding: payment ? naira(incident.valueInFlight) : "Not a payment",
    responseCode: incident.responsePattern && incident.responsePattern !== "unspecified" ? incident.responsePattern : "none",
    places: incident.locations.length > 0 ? incident.locations.join(", ") : "not given",
    linkedPayments: incident.linkedTransactionIds.length,
    publicity: incident.channels.includes("social") ? "Already on social" : "Not on social",
    accepted: incident.acknowledged ? "Accepted" : "Not yet accepted",
    nextAction: incident.nextAction,
    evidence: incident.evidence,
  };
}

export function figuresIn(text: string) {
  const matches = text.match(/\d{1,3}(?:,\d{3})+|\d+/g) ?? [];
  return matches.map((token) => Number(token.replaceAll(",", ""))).filter((value) => Number.isFinite(value));
}

export function draftRespectsFacts(text: string, facts: BriefFacts) {
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > 900) return false;
  if (promisedOutcome.test(trimmed)) return false;
  const allowed = new Set(figuresIn(JSON.stringify(facts)));
  return figuresIn(trimmed).every((value) => allowed.has(value));
}
