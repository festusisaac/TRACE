import { count } from "drizzle-orm";

import { readyDatabase, db } from "@/db/client";
import { incidentActions, interactions } from "@/db/schema";

export async function GET() {
  await readyDatabase();
  const [messages, actions] = await Promise.all([
    db.select({ value: count() }).from(interactions),
    db.select({ value: count() }).from(incidentActions),
  ]);
  return Response.json({
    interactions: messages[0]?.value ?? 0,
    actions: actions[0]?.value ?? 0,
  });
}
