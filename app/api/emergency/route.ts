import { desc, eq } from "drizzle-orm";
import { readyDatabase, db } from "@/db/client";
import { incidentActions, interactions } from "@/db/schema";
import { openBook } from "@/lib/desk";

export async function GET() {
  await readyDatabase();
  const book = await openBook();

  // Find any incident or interaction with complaintType === 'emergency_freeze'
  const emergencyInteraction = book.interactions.find(
    (i) => i.classification.complaintType === "emergency_freeze",
  );

  if (!emergencyInteraction) {
    return Response.json(
      { hasEmergency: false },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
    );
  }

  const incident = book.incidents.find((inc) =>
    inc.memberIds.includes(emergencyInteraction.id),
  );

  const isPndApplied = incident?.acknowledged ?? false;

  return Response.json(
    {
      hasEmergency: true,
      incidentId: incident?.id ?? null,
      caseId: emergencyInteraction.caseId,
      customerRef: emergencyInteraction.customerRef,
      text: emergencyInteraction.text,
      location: emergencyInteraction.location,
      channel: emergencyInteraction.channel,
      receivedAt: emergencyInteraction.receivedAt,
      isPndApplied,
    },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
  );
}

export async function POST(request: Request) {
  await readyDatabase();
  let body: { incidentId?: string; customerRef?: string } = {};
  try {
    body = await request.json();
  } catch {
    // default
  }

  const incidentId = body.incidentId;
  if (!incidentId) {
    return Response.json({ error: "incidentId is required" }, { status: 400 });
  }

  await db.insert(incidentActions).values({
    id: `act_${crypto.randomUUID()}`,
    incidentId,
    action: "acknowledge",
    owner: "fraud & security ops",
    actedAt: new Date().toISOString(),
  });

  return Response.json({
    success: true,
    message: "Instant PND (Post-No-Debit) applied. Active cards hotlisted.",
  });
}
