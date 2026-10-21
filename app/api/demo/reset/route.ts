import { readyDatabase, db } from "@/db/client";
import { resetDemo } from "@/lib/seed/apply.ts";

export async function POST() {
  await readyDatabase();
  const summary = await resetDemo(db);
  return Response.json({ ok: true, summary });
}
