import assert from "node:assert/strict";
import test from "node:test";

import { calculateDeflectionRoi, getAdvisoryCopy, portfolioDeflectionSummary } from "./deflection.ts";
import type { IncidentResult } from "./types.ts";

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
    customers: 13,
    interactionCount: 15,
    valueInFlight: 8_130_000,
    channels: ["app", "contact_centre", "social"],
    locations: ["Lagos", "Abuja"],
    observed: 13,
    baseline: 2,
    windowMinutes: 90,
    acknowledged: false,
    memberIds: ["m1", "m2"],
    caseIds: ["c1"],
    linkedTransactionIds: ["t1"],
    ...overrides,
  };
}

test("generates domain-specific reassurance copy for NIP transfer delays", () => {
  const advisory = getAdvisoryCopy("payment|failed_nip|nip", "NIP credit timeout");
  assert.equal(advisory.headline, "Temporary Interbank Transfer Delay");
  assert.match(advisory.reassuranceMessage, /funds are completely safe/);
  assert.match(advisory.reassuranceMessage, /do not need to call support/);
  assert.ok(advisory.recommendedChannels.some((c) => c.includes("Mobile App")));
});

test("generates authentication specific copy for login lockouts", () => {
  const advisory = getAdvisoryCopy("service|authentication|cannot_sign_in", "Mobile app sign-in failure");
  assert.equal(advisory.headline, "Mobile Banking Access Advisory");
  assert.match(advisory.reassuranceMessage, /Internet Banking/);
});

test("calculates deflection ROI and call volume savings for systemic NIP incident", () => {
  const incident = fakeIncident({ customers: 13, label: "systemic", domain: "payment" });
  const roi = calculateDeflectionRoi(incident);

  // 13 customers * 220 multiplier = 2,860 estimated impacted users
  assert.equal(roi.estimatedAffectedUsers, 13 * 220);
  // 78% deflection of 2,860 = 2,231 prevented calls
  assert.equal(roi.preventedCalls, Math.round(2860 * 0.78));
  // 2,231 calls * ₦450 = ₦1,003,950 saved
  assert.equal(roi.nairaSaved, 2231 * 450);
  assert.equal(roi.npsProtectionGrade, "Critical");
  assert.ok(roi.agentHoursSaved > 100);
});

test("calculates deflection ROI for emerging incidents with 70% rate", () => {
  const incident = fakeIncident({ customers: 4, label: "emerging", signature: "payment|pos_settlement|horizon" });
  const roi = calculateDeflectionRoi(incident);

  // 4 customers * 90 multiplier = 360
  assert.equal(roi.estimatedAffectedUsers, 360);
  // 360 * 0.70 = 252 prevented calls
  assert.equal(roi.preventedCalls, 252);
  assert.equal(roi.nairaSaved, 252 * 450);
  assert.equal(roi.npsProtectionGrade, "High");
});

test("does not generate deflection savings for isolated incidents", () => {
  const incident = fakeIncident({ customers: 1, label: "isolated" });
  const roi = calculateDeflectionRoi(incident);
  assert.equal(roi.preventedCalls, 0);
  assert.equal(roi.nairaSaved, 0);
});

test("portfolioDeflectionSummary aggregates savings across wider incidents", () => {
  const inc1 = fakeIncident({ id: "inc-1", customers: 13, label: "systemic" });
  const inc2 = fakeIncident({ id: "inc-2", customers: 4, label: "emerging" });
  const inc3 = fakeIncident({ id: "inc-3", customers: 1, label: "isolated" });

  const summary = portfolioDeflectionSummary([inc1, inc2, inc3], new Set(["inc-1"]));
  assert.ok(summary.totalPreventedCalls > 2400);
  assert.ok(summary.totalNairaSaved > 1_000_000);
  assert.equal(summary.activeAdvisoriesCount, 1);
  assert.equal(summary.potentialAdvisoriesCount, 2);
});
