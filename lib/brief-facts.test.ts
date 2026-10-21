import assert from "node:assert/strict";
import test from "node:test";

import { briefFacts, draftRespectsFacts, figuresIn } from "./brief-facts.ts";
import type { IncidentResult } from "./engine/types.ts";

function incident(overrides: Partial<IncidentResult> = {}): IncidentResult {
  return {
    id: "inc-payment-failed-nip-nip",
    signature: "payment|failed_nip|nip",
    domain: "payment",
    scope: "network",
    label: "systemic",
    title: "NIP credit timeout",
    owner: "payments ops",
    nextAction: "Name the team and answer the group from this incident.",
    priority: 100,
    scoreParts: [],
    evidence: ["13 customers in 720 minutes against a baseline of 2 (6.5x)."],
    journey: null,
    failureMode: "failed_nip",
    scheme: "nip",
    responsePattern: "97",
    customers: 13,
    interactionCount: 15,
    valueInFlight: 8_130_000,
    channels: ["social", "app"],
    locations: ["Lagos", "Abuja"],
    observed: 13,
    baseline: 2,
    windowMinutes: 720,
    acknowledged: false,
    memberIds: [],
    caseIds: [],
    linkedTransactionIds: ["txn-1"],
    ...overrides,
  };
}

test("a draft may repeat figures that are already in the facts", () => {
  const facts = briefFacts(incident());
  const note = "NIP credit timeout is Systemic. 13 customers, 15 messages, ₦8,130,000 still outstanding. Response 97. A normal level is 2.";
  assert.equal(draftRespectsFacts(note, facts), true);
});

test("a draft that changes the amount is rejected", () => {
  const facts = briefFacts(incident());
  assert.equal(draftRespectsFacts("₦50,000,000 has not been credited across 13 customers.", facts), false);
});

test("a draft that says the money was already returned is rejected", () => {
  const facts = briefFacts(incident());
  assert.equal(draftRespectsFacts("Your transfer has been refunded.", facts), false);
});

test("service facts do not carry a payment amount", () => {
  const facts = briefFacts(incident({ domain: "service", valueInFlight: 20_000, responsePattern: null, linkedTransactionIds: [] }));
  assert.equal(facts.outstanding, "Not a payment");
  assert.equal(facts.outstandingNaira, 0);
  assert.equal(draftRespectsFacts("12 customers are locked out. ₦20,000 is stuck.", facts), false);
});

test("figures in the fact packet include grouped naira", () => {
  const facts = briefFacts(incident());
  assert.ok(figuresIn(JSON.stringify(facts)).includes(8_130_000));
  assert.ok(figuresIn(JSON.stringify(facts)).includes(97));
});
