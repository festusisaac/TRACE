import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "../db/schema.ts";
import { resetDemo } from "../lib/seed/apply.ts";

const client = createClient({ url: process.env.DATABASE_URL ?? "file:data/trace.db" });
await client.execute("PRAGMA foreign_keys = ON");

const database = drizzle(client, { schema });
const summary = await resetDemo(database);

console.log(`Loaded ${summary.interactions} complaints, ${summary.transactions} transactions, ${summary.cases} cases.`);
for (const incident of summary.incidents) {
  console.log(`${incident.label.padEnd(9)} ${incident.customers.toString().padStart(2)} customers  ${incident.signature}`);
}
