import { count } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

import * as schema from "../../db/schema.ts";
import { investigate } from "../engine/investigate.ts";
import { buildStory } from "./story.ts";

type TraceDatabase = LibSQLDatabase<typeof schema>;

let seeding: Promise<SeedSummary> | null = null;

export type SeedSummary = {
  seeded: boolean;
  interactions: number;
  transactions: number;
  cases: number;
  incidents: { signature: string; label: string; customers: number }[];
};

export async function resetDemo(database: TraceDatabase, asOf = new Date()): Promise<SeedSummary> {
  const story = buildStory(asOf);
  const result = investigate({
    interactions: story.interactions,
    transactions: story.transactions,
    serviceRequests: [],
    baselines: story.baselines,
    asOf: story.asOf,
  });

  await database.delete(schema.interactions);
  await database.delete(schema.incidentActions);
  await database.delete(schema.cases);
  await database.delete(schema.transactions);
  await database.delete(schema.serviceRequests);
  await database.delete(schema.baselines);

  await database.insert(schema.transactions).values(
    story.transactions.map((transaction) => ({
      id: transaction.id,
      rrn: transaction.rrn,
      amount: transaction.amount,
      beneficiary: transaction.beneficiary,
      accountMask: transaction.accountMask,
      scheme: transaction.scheme,
      responseCode: transaction.responseCode,
      status: transaction.status,
      occurredAt: transaction.occurredAt,
      location: transaction.location,
    })),
  );
  await database.insert(schema.baselines).values(
    story.baselines.map((baseline, index) => ({
      id: `base-${index + 1}`,
      signature: baseline.signature,
      domain: baseline.domain,
      normalCount: baseline.normalCount,
      windowMinutes: baseline.windowMinutes,
    })),
  );
  await database.insert(schema.cases).values(
    result.cases.map((item) => ({
      id: item.id,
      customerRef: item.customerRef,
      problemKey: item.problemKey,
      status: item.status,
      openedAt: item.openedAt,
    })),
  );
  await database.insert(schema.interactions).values(
    result.interactions.map((interaction) => ({
      id: interaction.id,
      channel: interaction.channel,
      receivedAt: interaction.receivedAt,
      customerRef: interaction.customerRef,
      text: interaction.text,
      sourceRef: interaction.sourceRef,
      amount: interaction.amount,
      rrn: interaction.rrn,
      accountMask: interaction.accountMask,
      beneficiary: interaction.beneficiary,
      location: interaction.location,
      domain: interaction.classification.domain,
      complaintType: interaction.classification.complaintType,
      linkStatus: interaction.link.status,
      caseId: interaction.caseId,
      incidentId: interaction.incidentId,
      answerFromIncident: interaction.answerFromIncident,
    })),
  );

  return {
    seeded: true,
    interactions: result.interactions.length,
    transactions: story.transactions.length,
    cases: result.cases.length,
    incidents: result.incidents.map((incident) => ({
      signature: incident.signature,
      label: incident.label,
      customers: incident.customers,
    })),
  };
}

export async function seedIfEmpty(database: TraceDatabase): Promise<SeedSummary> {
  if (seeding) return seeding;
  seeding = seedIfEmptyOnce(database).finally(() => {
    seeding = null;
  });
  return seeding;
}

async function seedIfEmptyOnce(database: TraceDatabase): Promise<SeedSummary> {
  const [row] = await database.select({ value: count() }).from(schema.interactions);
  if ((row?.value ?? 0) > 0) {
    return { seeded: false, interactions: row?.value ?? 0, transactions: 0, cases: 0, incidents: [] };
  }
  return resetDemo(database);
}
