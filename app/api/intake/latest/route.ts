import { desc } from "drizzle-orm";
import { readyDatabase, db } from "@/db/client";
import { interactions } from "@/db/schema";

export async function GET() {
  await readyDatabase();
  const rows = await db
    .select({
      id: interactions.id,
      customerRef: interactions.customerRef,
      channel: interactions.channel,
      text: interactions.text,
      amount: interactions.amount,
      receivedAt: interactions.receivedAt,
    })
    .from(interactions)
    .orderBy(desc(interactions.receivedAt))
    .limit(1);

  const headers = {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
  };

  if (rows.length === 0) {
    return Response.json({ id: null }, { headers });
  }

  return Response.json(rows[0], { headers });
}
