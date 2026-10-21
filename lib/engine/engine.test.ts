import assert from "node:assert/strict";
import test from "node:test";

import { classifyComplaint } from "./classify.ts";
import { investigate } from "./investigate.ts";
import { normalizeComplaint } from "./normalize.ts";
import type { InteractionInput, TransactionInput } from "./types.ts";

const AS_OF = "2026-10-21T09:00:00.000Z";

function minutesBefore(minutes: number) {
  return new Date(Date.parse(AS_OF) - minutes * 60 * 1000).toISOString();
}

function complaint(overrides: Partial<InteractionInput> & Pick<InteractionInput, "id" | "text" | "customerRef">): InteractionInput {
  return {
    channel: "app",
    receivedAt: minutesBefore(20),
    sourceRef: overrides.id,
    amount: null,
    rrn: null,
    accountMask: null,
    beneficiary: null,
    location: null,
    ...overrides,
  };
}

function transfer(id: string, rrn: string, amount = 100_000): TransactionInput {
  return {
    id,
    rrn,
    amount,
    beneficiary: "Ada Nwosu",
    accountMask: "******4421",
    scheme: "nip",
    responseCode: "97",
    status: "timeout",
    occurredAt: minutesBefore(30),
    location: "Lagos",
  };
}

test("a branch explanation is service even when the customer mentions a debit", () => {
  const result = classifyComplaint("I was debited last week and nobody at the branch will explain");
  assert.equal(result.domain, "service");
  assert.equal(result.complaintType, "wrong_information");
});

test("normalize keeps a missing reference empty and reads an amount and RRN from the text", () => {
  const fields = normalizeComplaint({
    text: "Transfer of ₦50,000 was not credited. RRN 123456789012 at the Ikeja branch",
    amount: null,
    rrn: null,
    accountMask: null,
    beneficiary: null,
    location: null,
  });
  assert.equal(fields.amount, 50000);
  assert.equal(fields.rrn, "123456789012");
  assert.equal(fields.location, "Ikeja");
});

test("the judge story separates network faults, branch noise, and one-off cases", () => {
  const interactions: InteractionInput[] = [];
  const transactions: TransactionInput[] = [];

  for (const channel of ["app", "contact_centre", "social"] as const) {
    interactions.push(
      complaint({
        id: `dup-${channel}`,
        customerRef: "DUP",
        channel,
        text: "Transfer was not credited. RRN 100000000001",
        rrn: "100000000001",
        amount: 100_000,
        location: "Lagos",
      }),
    );
  }
  transactions.push(transfer("txn-dup", "100000000001"));

  interactions.push(
    complaint({
      id: "nip-unlinked",
      customerRef: "C2",
      channel: "contact_centre",
      text: "My transfer was not credited and I do not have the RRN",
      amount: 999_001,
      location: "Abuja",
    }),
  );

  for (let index = 3; index <= 8; index += 1) {
    const rrn = `10000000000${index}`;
    interactions.push(
      complaint({
        id: `nip-${index}`,
        customerRef: `C${index}`,
        channel: index % 2 === 0 ? "social" : "app",
        text: `Transfer was not credited. RRN ${rrn}`,
        rrn,
        amount: 100_000,
        location: index % 2 === 0 ? "Abuja" : "Lagos",
      }),
    );
    transactions.push(transfer(`txn-${index}`, rrn));
  }

  for (let index = 1; index <= 8; index += 1) {
    interactions.push(
      complaint({
        id: `login-${index}`,
        customerRef: `L${index}`,
        channel: index === 1 ? "social" : "app",
        text: "I cannot log in. Biometric keeps failing and my ₦20,000 is stuck",
        location: "Lagos",
      }),
    );
  }

  for (let index = 1; index <= 3; index += 1) {
    interactions.push(
      complaint({
        id: `pos-${index}`,
        customerRef: `P${index}`,
        channel: "app",
        text: "POS settlement has not reflected for vendor Horizon",
        amount: 80_000,
        location: "Lagos",
      }),
    );
  }

  interactions.push(
    complaint({
      id: "wrong-one",
      customerRef: "BEN",
      channel: "branch",
      text: "I sent the transfer to the wrong beneficiary",
      amount: 40_000,
      location: "Lagos",
    }),
  );

  interactions.push(
    complaint({
      id: "conduct-one",
      customerRef: "STAFF",
      channel: "branch",
      text: "The teller was rude to me",
      location: "Ikeja",
    }),
  );

  for (let index = 1; index <= 5; index += 1) {
    interactions.push(
      complaint({
        id: `branch-${index}`,
        customerRef: `B${index}`,
        channel: "branch",
        text: "The branch told me the wrong thing about my account",
        location: "Ikeja",
      }),
    );
  }

  const result = investigate({ interactions, transactions, serviceRequests: [], asOf: AS_OF });
  const nip = result.incidents.find((incident) => incident.signature === "payment|failed_nip|nip");
  const login = result.incidents.find((incident) => incident.signature === "service|authentication|cannot_sign_in");
  const pos = result.incidents.find((incident) => incident.signature === "payment|pos_settlement|horizon");
  const wrong = result.incidents.find((incident) => incident.signature.startsWith("payment|wrong_beneficiary"));
  const conduct = result.incidents.find((incident) => incident.signature.startsWith("service|branch_service|staff_conduct"));
  const branch = result.incidents.find((incident) => incident.signature === "service|branch_service|wrong_information|ikeja");

  assert.ok(nip);
  assert.ok(login);
  assert.ok(pos);
  assert.ok(wrong);
  assert.ok(conduct);
  assert.ok(branch);

  assert.equal(nip.label, "systemic");
  assert.equal(nip.customers, 8);
  assert.equal(nip.interactionCount, 10);
  assert.equal(nip.owner, "payments ops");
  assert.equal(nip.responsePattern, "97");
  assert.ok(nip.valueInFlight >= 700_000);
  assert.equal(result.interactions.find((item) => item.id === "nip-unlinked")?.link.status, "unlinked");
  assert.equal(result.interactions.find((item) => item.id === "nip-unlinked")?.incidentId, nip.id);
  assert.equal(new Set(["dup-app", "dup-contact_centre", "dup-social"].map((id) => result.interactions.find((item) => item.id === id)?.caseId)).size, 1);

  assert.equal(login.label, "systemic");
  assert.equal(login.valueInFlight, 0);
  assert.equal(login.owner, "digital channels");
  assert.equal(login.failureMode, "cannot_sign_in");
  assert.ok(result.interactions.filter((item) => item.id.startsWith("login-")).every((item) => item.link.status === "not_applicable"));

  assert.equal(pos.label, "emerging");
  assert.equal(wrong.label, "isolated");
  assert.equal(conduct.label, "isolated");
  assert.notEqual(conduct.signature, login.signature);
  assert.notEqual(conduct.signature, branch.signature);
  assert.equal(branch.label, "systemic");
  assert.equal(branch.scope, "location");
  assert.equal(branch.owner, "branch service");
  assert.equal(branch.valueInFlight, 0);

  assert.ok(login.priority > pos.priority);
  assert.ok(pos.priority > wrong.priority);
  assert.equal(result.interactions.find((item) => item.id === "wrong-one")?.incidentId, null);
  assert.ok(result.queue.some((item) => item.customerRef === "BEN"));
  assert.equal(result.queue.some((item) => item.customerRef === "DUP"), false);
});

test("acknowledging an incident drops its priority and marks members answered", () => {
  const interactions = Array.from({ length: 8 }, (_, index) =>
    complaint({
      id: `row-${index}`,
      customerRef: `K${index}`,
      text: "Transfer was not credited",
      amount: 10_000,
    }),
  );
  const open = investigate({ interactions, transactions: [], serviceRequests: [], asOf: AS_OF });
  const incident = open.incidents.find((item) => item.signature === "payment|failed_nip|nip");
  assert.ok(incident);
  const acknowledged = investigate({
    interactions,
    transactions: [],
    serviceRequests: [],
    asOf: AS_OF,
    actions: [{ incidentId: incident.id, action: "acknowledge", owner: "payments ops", actedAt: AS_OF }],
  });
  const after = acknowledged.incidents.find((item) => item.id === incident.id);
  assert.ok(after);
  assert.equal(after.acknowledged, true);
  assert.ok(after.priority < incident.priority);
  assert.ok(acknowledged.interactions.every((item) => item.answerFromIncident));
});
