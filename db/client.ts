import "server-only";

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

function databaseUrl() {
  return process.env.DATABASE_URL ?? "file:data/trace.db";
}

export const client = createClient({ url: databaseUrl() });

export const db = drizzle(client, { schema });

let foreignKeys: Promise<void> | null = null;

export function readyDatabase() {
  foreignKeys ??= client.execute("PRAGMA foreign_keys = ON").then(() => undefined);
  return foreignKeys;
}
