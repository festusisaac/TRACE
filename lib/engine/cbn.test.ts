import assert from "node:assert/strict";
import test from "node:test";

import { assessCbnSla, cbnPortfolioSummary, formatDuration, getCbnMandate } from "./cbn.ts";
import type { IncidentResult, InteractionInput } from "./types.ts";

function fakeIncident(overrides: Partial<IncidentResult> = {}): IncidentResult {
  return {
    id: "inc-test",
    signature: "payment|failed_nip|nip",
    domain: "payment",
    scope: "network",
    label: "systemic",
    title: "NIP credit timeout",
    owner: "payments ops",
    nextAction: "Investigate switch",
    priority: 85,
    scoreParts: [],
    evidence: [],
    journey: null,
    failureMode: null,
    scheme: "nip",
    responsePattern: "97",
    customers: 10,
    interactionCount: 12,
    valueInFlight: 5_000_000,
    channels: ["app", "contact_centre"],
    locations: ["Lagos"],
    observed: 10,
    baseline: 2,
    windowMinutes: 90,
    acknowledged: false,
    memberIds: ["msg-1", "msg-2"],
    caseIds: ["case-1"],
    linkedTransactionIds: ["txn-1"],
    ...overrides,
  };
}

function fakeInteraction(id: string, minutesAgo: number, asOf: Date): InteractionInput {
  return {
    id,
    channel: "app",
    receivedAt: new Date(asOf.getTime() - minutesAgo * 60_000).toISOString(),
    customerRef: `CUST-${id}`,
    text: "Transfer failed",
    sourceRef: `src-${id}`,
    amount: 100_000,
    rrn: "441200880000",
    accountMask: null,
    beneficiary: null,
    location: "Lagos",
  };
}

test("assigns 24h SLA to failed NIP transfers under CBN EFT regulation", () => {
  const mandate = getCbnMandate("payment", "payment|failed_nip|nip");
  assert.equal(mandate.mandatedSlaHours, 24);
  assert.match(mandate.circularRef, /CBN\/BPS\/DIR\/GEN\/CIR\/01\/015/);
});

test("assigns 48h SLA to POS settlement and card complaints", () => {
  const mandate = getCbnMandate("payment", "payment|pos_settlement|horizon");
  assert.equal(mandate.mandatedSlaHours, 48);
});

test("assigns 72h SLA to non-financial service complaints under Consumer Protection Framework", () => {
  const mandate = getCbnMandate("service", "service|authentication|cannot_sign_in");
  assert.equal(mandate.mandatedSlaHours, 72);
});

test("accurately calculates remaining time and fine risk for a recent incident", () => {
  const now = new Date("2026-10-21T12:00:00.000Z");
  const incident = fakeIncident({ customers: 13 });
  // Earliest complaint filed 2 hours ago
  const members = [fakeInteraction("msg-1", 120, now), fakeInteraction("msg-2", 60, now)];

  const assessment = assessCbnSla(incident, members, now.toISOString());
  assert.equal(assessment.status, "compliant");
  assert.equal(assessment.remainingMinutes, 22 * 60); // 24h - 2h = 22h
  assert.equal(assessment.totalPenaltyRisk, 13 * 50_000); // ₦650,000
  assert.match(assessment.statusText, /22h 0m remaining/);
});

test("flags warning when fewer than 6 hours remain on regulatory clock", () => {
  const now = new Date("2026-10-21T12:00:00.000Z");
  const incident = fakeIncident({ customers: 5 });
  // Earliest complaint filed 20 hours ago (4 hours left on 24h SLA)
  const members = [fakeInteraction("msg-1", 20 * 60, now)];

  const assessment = assessCbnSla(incident, members, now.toISOString());
  assert.equal(assessment.status, "warning");
  assert.equal(assessment.remainingMinutes, 4 * 60);
  assert.match(assessment.statusText, /4h 0m remaining/);
  assert.equal(assessment.totalPenaltyRisk, 5 * 50_000);
});

test("flags breached status when deadline has passed", () => {
  const now = new Date("2026-10-21T12:00:00.000Z");
  const incident = fakeIncident({ customers: 4 });
  // Earliest complaint filed 26 hours ago (2 hours past 24h SLA)
  const members = [fakeInteraction("msg-1", 26 * 60, now)];

  const assessment = assessCbnSla(incident, members, now.toISOString());
  assert.equal(assessment.status, "breached");
  assert.equal(assessment.remainingMinutes, -120);
  assert.match(assessment.statusText, /Breached by 2h 0m/);
  assert.equal(assessment.totalPenaltyRisk, 4 * 50_000);
});

test("cbnPortfolioSummary aggregates total risk across multiple incidents", () => {
  const now = new Date("2026-10-21T12:00:00.000Z");
  const inc1 = fakeIncident({ id: "inc-1", customers: 10, memberIds: ["m1"] });
  const inc2 = fakeIncident({ id: "inc-2", customers: 4, memberIds: ["m2"], signature: "payment|pos_settlement|horizon" });
  const interactions = [fakeInteraction("m1", 60, now), fakeInteraction("m2", 120, now)];

  const summary = cbnPortfolioSummary([inc1, inc2], interactions, now.toISOString());
  assert.equal(summary.totalPenaltyRisk, (10 + 4) * 50_000);
  assert.equal(summary.compliantCount, 2);
  assert.equal(summary.breachCount, 0);
  assert.ok(summary.nearestDeadlineIncident);
});
