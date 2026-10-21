import { eq } from "drizzle-orm";

import { readyDatabase, db } from "@/db/client";
import {
  baselines,
  cases,
  incidentActions,
  interactions,
  serviceRequests,
  transactions,
} from "@/db/schema";
import { investigate } from "@/lib/engine/investigate.ts";
import type {
  BaselineInput,
  Channel,
  EmergenceLabel,
  IncidentActionInput,
  InteractionInput,
  Investigation,
  ServiceRequestInput,
  TransactionInput,
} from "@/lib/engine/types.ts";
import { channels } from "@/lib/engine/types.ts";

export class IntakeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntakeError";
  }
}

export type IntakeReceipt = {
  interactionId: string;
  channel: Channel;
  domain: "payment" | "service";
  complaintType: string;
  linkStatus: "linked" | "unlinked" | "not_applicable";
  linkReason: string;
  caseId: string;
  incidentId: string | null;
  disposition: "answer_from_incident" | "queued";
  label: EmergenceLabel;
  duplicate: boolean;
};

type Payload = {
  channel: Channel;
  receivedAt: string;
  customerRef: string;
  text: string;
  sourceRef: string;
  amount: number | null;
  rrn: string | null;
  accountMask: string | null;
  beneficiary: string | null;
  location: string | null;
};

function requiredString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new IntakeError(`${field} is required.`);
  }
  return value.trim();
}

export function parseIntakePayload(body: unknown): Payload {
  if (!body || typeof body !== "object") throw new IntakeError("Complaint payload must be an object.");
  const record = body as Record<string, unknown>;
  const channel = requiredString(record.channel, "channel");
  if (!channels.includes(channel as Channel)) throw new IntakeError("Channel is not recognised.");
  const receivedAt = requiredString(record.receivedAt, "receivedAt");
  if (Number.isNaN(Date.parse(receivedAt))) throw new IntakeError("receivedAt must be an ISO time.");
  const amount = record.amount === undefined || record.amount === null ? null : record.amount;
  if (amount !== null && (typeof amount !== "number" || !Number.isFinite(amount))) {
    throw new IntakeError("amount must be a number of naira.");
  }
  return {
    channel: channel as Channel,
    receivedAt,
    customerRef: requiredString(record.customerRef, "customerRef"),
    text: requiredString(record.text, "text"),
    sourceRef: requiredString(record.sourceRef, "sourceRef"),
    amount,
    rrn: typeof record.rrn === "string" ? record.rrn : null,
    accountMask: typeof record.accountMask === "string" ? record.accountMask : null,
    beneficiary: typeof record.beneficiary === "string" ? record.beneficiary : null,
    location: typeof record.location === "string" ? record.location : null,
  };
}

async function loadInputs(): Promise<{
  interactions: InteractionInput[];
  transactions: TransactionInput[];
  serviceRequests: ServiceRequestInput[];
  baselines: BaselineInput[];
  actions: IncidentActionInput[];
}> {
  await readyDatabase();
  const [interactionRows, transactionRows, requestRows, baselineRows, actionRows] = await Promise.all([
    db.select().from(interactions),
    db.select().from(transactions),
    db.select().from(serviceRequests),
    db.select().from(baselines),
    db.select().from(incidentActions),
  ]);
  return {
    interactions: interactionRows.map((row) => ({
      id: row.id,
      channel: row.channel,
      receivedAt: row.receivedAt,
      customerRef: row.customerRef,
      text: row.text,
      sourceRef: row.sourceRef,
      amount: row.amount,
      rrn: row.rrn,
      accountMask: row.accountMask,
      beneficiary: row.beneficiary,
      location: row.location,
    })),
    transactions: transactionRows.map((row) => ({
      id: row.id,
      rrn: row.rrn,
      amount: row.amount,
      beneficiary: row.beneficiary,
      accountMask: row.accountMask,
      scheme: row.scheme,
      responseCode: row.responseCode,
      status: row.status,
      occurredAt: row.occurredAt,
      location: row.location,
    })),
    serviceRequests: requestRows.map((row) => ({
      id: row.id,
      customerRef: row.customerRef,
      kind: row.kind,
      reference: row.reference,
      status: row.status,
      openedAt: row.openedAt,
    })),
    baselines: baselineRows.map((row) => ({
      signature: row.signature,
      domain: row.domain,
      normalCount: row.normalCount,
      windowMinutes: row.windowMinutes,
    })),
    actions: actionRows.map((row) => ({
      incidentId: row.incidentId,
      action: row.action,
      owner: row.owner,
      actedAt: row.actedAt,
    })),
  };
}

export async function loadInvestigation(): Promise<Investigation> {
  const inputs = await loadInputs();
  return investigate(inputs);
}

function receiptFor(result: Investigation, interactionId: string, duplicate: boolean): IntakeReceipt {
  const interaction = result.interactions.find((item) => item.id === interactionId);
  if (!interaction) throw new IntakeError("The complaint could not be investigated.");
  const incident = result.incidents.find((item) => item.memberIds.includes(interactionId));
  return {
    interactionId,
    channel: interaction.channel,
    domain: interaction.classification.domain,
    complaintType: interaction.classification.complaintType,
    linkStatus: interaction.link.status,
    linkReason: interaction.link.reason,
    caseId: interaction.caseId,
    incidentId: interaction.incidentId,
    disposition: interaction.answerFromIncident ? "answer_from_incident" : "queued",
    label: incident?.label ?? "isolated",
    duplicate,
  };
}

export async function receiveComplaint(body: unknown): Promise<IntakeReceipt> {
  const payload = parseIntakePayload(body);
  const inputs = await loadInputs();
  const existing = inputs.interactions.find((interaction) => interaction.sourceRef === payload.sourceRef);
  if (existing) return receiptFor(investigate(inputs), existing.id, true);

  const id = `int_${crypto.randomUUID()}`;
  const incoming: InteractionInput = { id, ...payload };
  const result = investigate({ ...inputs, interactions: [...inputs.interactions, incoming] });
  const annotated = result.interactions.find((interaction) => interaction.id === id);
  if (!annotated) throw new IntakeError("The complaint could not be investigated.");

  const caseRow = result.cases.find((item) => item.id === annotated.caseId);
  const storedCase = await db.select({ id: cases.id }).from(cases).where(eq(cases.id, annotated.caseId)).limit(1);
  if (storedCase.length === 0 && caseRow) {
    await db.insert(cases).values({
      id: caseRow.id,
      customerRef: caseRow.customerRef,
      problemKey: caseRow.problemKey,
      status: caseRow.status,
      openedAt: caseRow.openedAt,
    });
  } else if (caseRow) {
    await db.update(cases).set({ status: caseRow.status }).where(eq(cases.id, caseRow.id));
  }

  await db.insert(interactions).values({
    id,
    channel: payload.channel,
    receivedAt: payload.receivedAt,
    customerRef: payload.customerRef,
    text: payload.text,
    sourceRef: payload.sourceRef,
    amount: annotated.amount,
    rrn: annotated.rrn,
    accountMask: annotated.accountMask,
    beneficiary: annotated.beneficiary,
    location: annotated.location,
    domain: annotated.classification.domain,
    complaintType: annotated.classification.complaintType,
    linkStatus: annotated.link.status,
    caseId: annotated.caseId,
    incidentId: annotated.incidentId,
    answerFromIncident: annotated.answerFromIncident,
  });

  for (const interaction of result.interactions) {
    if (interaction.id === id) continue;
    await db
      .update(interactions)
      .set({
        incidentId: interaction.incidentId,
        answerFromIncident: interaction.answerFromIncident,
      })
      .where(eq(interactions.id, interaction.id));
  }

  return receiptFor(result, id, false);
}

export async function acknowledgeIncident(incidentId: string, owner: string) {
  const trimmed = owner.trim();
  if (!trimmed) throw new IntakeError("owner is required.");
  const result = await loadInvestigation();
  if (!result.incidents.some((incident) => incident.id === incidentId)) {
    throw new IntakeError("Incident was not found.");
  }
  await db.insert(incidentActions).values({
    id: `act_${crypto.randomUUID()}`,
    incidentId,
    action: "acknowledge",
    owner: trimmed,
    actedAt: new Date().toISOString(),
  });
  return loadInvestigation();
}

export async function deployIncidentAdvisory(incidentId: string) {
  const result = await loadInvestigation();
  if (!result.incidents.some((incident) => incident.id === incidentId)) {
    throw new IntakeError("Incident was not found.");
  }
  await db.insert(incidentActions).values({
    id: `act_${crypto.randomUUID()}`,
    incidentId,
    action: "deploy_advisory",
    owner: "proactive_advisory",
    actedAt: new Date().toISOString(),
  });
  return loadInvestigation();
}

