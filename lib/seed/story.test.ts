import assert from "node:assert/strict";
import test from "node:test";

import { investigate } from "../engine/investigate.ts";
import { buildStory } from "./story.ts";

test("the seeded judge story separates the live incidents from the one-off cases", () => {
  const story = buildStory(new Date("2026-10-21T09:00:00.000Z"));
  const result = investigate({
    interactions: story.interactions,
    transactions: story.transactions,
    serviceRequests: [],
    baselines: story.baselines,
    asOf: story.asOf,
  });

  const nip = result.incidents.find((incident) => incident.signature === "payment|failed_nip|nip");
  const login = result.incidents.find((incident) => incident.signature === "service|authentication|cannot_sign_in");
  const pos = result.incidents.find((incident) => incident.signature === "payment|pos_settlement|horizon");
  const wrong = result.incidents.find((incident) => incident.signature.startsWith("payment|wrong_beneficiary"));
  const conduct = result.incidents.find((incident) => incident.signature.startsWith("service|branch_service|staff_conduct"));
  const branch = result.incidents.find((incident) => incident.signature === "service|branch_service|wrong_information|ikeja");

  assert.ok(nip && login && pos && wrong && conduct && branch);

  assert.equal(nip.label, "systemic");
  assert.equal(nip.customers, 13);
  assert.equal(nip.interactionCount, 15);
  assert.ok(nip.valueInFlight > 5_000_000);
  assert.equal(result.interactions.find((item) => item.id === "seed-nip-unlinked-abuja")?.link.status, "unlinked");
  assert.equal(result.interactions.find((item) => item.id === "seed-nip-unlinked-abuja")?.incidentId, nip.id);
  assert.equal(result.interactions.find((item) => item.id === "seed-nip-unlinked-lagos")?.incidentId, nip.id);
  const chiomaCases = new Set(
    ["seed-nip-chioma-app", "seed-nip-chioma-contact_centre", "seed-nip-chioma-social"].map(
      (id) => result.interactions.find((item) => item.id === id)?.caseId,
    ),
  );
  assert.equal(chiomaCases.size, 1);

  assert.equal(login.label, "systemic");
  assert.equal(login.customers, 12);
  assert.equal(login.valueInFlight, 0);
  assert.ok(result.interactions.filter((item) => item.id.startsWith("seed-login-")).every((item) => item.link.status === "not_applicable"));

  assert.equal(pos.label, "emerging");
  assert.equal(pos.customers, 4);
  assert.equal(wrong.label, "isolated");
  assert.equal(result.interactions.find((item) => item.id === "seed-wrong-beneficiary")?.link.status, "linked");
  assert.equal(conduct.label, "isolated");
  assert.notEqual(conduct.signature, branch.signature);
  assert.notEqual(conduct.signature, login.signature);
  assert.equal(branch.label, "systemic");
  assert.equal(branch.scope, "location");
  assert.equal(branch.customers, 6);
});
