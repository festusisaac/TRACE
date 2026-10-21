import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const cases = sqliteTable(
  "cases",
  {
    id: text("id").primaryKey(),
    customerRef: text("customer_ref").notNull(),
    problemKey: text("problem_key").notNull(),
    status: text("status", { enum: ["open", "answered", "closed"] }).notNull(),
    openedAt: text("opened_at").notNull(),
  },
  (table) => [index("cases_customer_idx").on(table.customerRef)],
);

export const interactions = sqliteTable(
  "interactions",
  {
    id: text("id").primaryKey(),
    channel: text("channel", {
      enum: ["branch", "contact_centre", "email", "social", "app", "ussd"],
    }).notNull(),
    receivedAt: text("received_at").notNull(),
    customerRef: text("customer_ref").notNull(),
    text: text("text").notNull(),
    sourceRef: text("source_ref").notNull(),
    amount: integer("amount"),
    rrn: text("rrn"),
    accountMask: text("account_mask"),
    beneficiary: text("beneficiary"),
    location: text("location"),
    domain: text("domain", { enum: ["payment", "service"] }),
    complaintType: text("complaint_type"),
    linkStatus: text("link_status", {
      enum: ["linked", "unlinked", "not_applicable"],
    }),
    caseId: text("case_id").references(() => cases.id),
    incidentId: text("incident_id"),
    answerFromIncident: integer("answer_from_incident", { mode: "boolean" })
      .notNull()
      .default(false),
  },
  (table) => [
    uniqueIndex("interactions_source_ref_idx").on(table.sourceRef),
    index("interactions_customer_idx").on(table.customerRef),
    index("interactions_case_idx").on(table.caseId),
  ],
);

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    rrn: text("rrn"),
    amount: integer("amount").notNull(),
    beneficiary: text("beneficiary"),
    accountMask: text("account_mask"),
    scheme: text("scheme").notNull(),
    responseCode: text("response_code"),
    status: text("status").notNull(),
    occurredAt: text("occurred_at").notNull(),
    location: text("location"),
  },
  (table) => [index("transactions_rrn_idx").on(table.rrn)],
);

export const serviceRequests = sqliteTable(
  "service_requests",
  {
    id: text("id").primaryKey(),
    customerRef: text("customer_ref").notNull(),
    kind: text("kind", {
      enum: ["card", "onboarding", "loan", "channel_incident"],
    }).notNull(),
    reference: text("reference").notNull(),
    status: text("status").notNull(),
    openedAt: text("opened_at").notNull(),
  },
  (table) => [index("service_requests_customer_idx").on(table.customerRef)],
);

export const baselines = sqliteTable(
  "baselines",
  {
    id: text("id").primaryKey(),
    signature: text("signature").notNull(),
    domain: text("domain", { enum: ["payment", "service"] }).notNull(),
    normalCount: integer("normal_count").notNull(),
    windowMinutes: integer("window_minutes").notNull(),
  },
  (table) => [uniqueIndex("baselines_signature_idx").on(table.signature)],
);

export const incidentActions = sqliteTable(
  "incident_actions",
  {
    id: text("id").primaryKey(),
    incidentId: text("incident_id").notNull(),
    action: text("action", { enum: ["acknowledge", "deploy_advisory"] }).notNull(),
    owner: text("owner").notNull(),
    actedAt: text("acted_at").notNull(),
  },
  (table) => [index("incident_actions_incident_idx").on(table.incidentId)],
);
