import { desc, eq } from "drizzle-orm";
import { readyDatabase, db } from "@/db/client";
import { incidentActions, interactions } from "@/db/schema";
import { openBook } from "@/lib/desk";

export async function GET() {
  await readyDatabase();
  const book = await openBook();

  // Find all interactions categorized under emergency_freeze
  const emergencyInteractions = book.interactions.filter(
    (i) => i.classification.complaintType === "emergency_freeze",
  );

  if (emergencyInteractions.length === 0) {
    return Response.json(
      { hasEmergency: false },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
    );
  }

  // Load all actions to compare timestamps
  const actions = await db.select().from(incidentActions);

  // Sort by receivedAt descending (newest complaints first)
  const sorted = [...emergencyInteractions].sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
  );

  // An interaction is only frozen if a freeze action was applied AFTER the complaint was received
  const isInteractionFrozen = (interaction: (typeof sorted)[0]) => {
    const incId =
      interaction.incidentId ??
      `inc-service-fraud-distress-emergency-freeze-${interaction.customerRef.toLowerCase()}`;
    const freezeActions = actions.filter(
      (a) => a.incidentId === incId && a.action === "acknowledge",
    );
    if (freezeActions.length === 0) return false;

    // Pick latest action timestamp
    const latestActedAt = Math.max(
      ...freezeActions.map((a) => new Date(a.actedAt).getTime()),
    );
    return latestActedAt >= new Date(interaction.receivedAt).getTime();
  };

  // Prioritize active, unfrozen emergencies so any new complaint rings continuously
  const activeUnfrozen = sorted.find((interaction) => !isInteractionFrozen(interaction));

  const selected = activeUnfrozen ?? sorted[0];
  const isPndApplied = isInteractionFrozen(selected);
  const incidentId =
    selected.incidentId ??
    `inc-service-fraud-distress-emergency-freeze-${selected.customerRef.toLowerCase()}`;

  return Response.json(
    {
      hasEmergency: true,
      incidentId,
      caseId: selected.caseId,
      customerRef: selected.customerRef,
      text: selected.text,
      location: selected.location,
      channel: selected.channel,
      receivedAt: selected.receivedAt,
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
