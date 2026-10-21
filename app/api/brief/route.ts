import { draftIncident } from "@/lib/draft";
import { openBook } from "@/lib/desk";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const incidentId = body && typeof body === "object" && "incidentId" in body ? (body as { incidentId?: unknown }).incidentId : undefined;
  if (typeof incidentId !== "string" || incidentId.trim() === "") {
    return Response.json({ error: "incidentId is required." }, { status: 400 });
  }

  const book = await openBook();
  const incident = book.incidents.find((item) => item.id === incidentId);
  if (!incident) return Response.json({ error: "Incident is not on the book." }, { status: 404 });

  const draft = await draftIncident(incident);
  return Response.json({
    source: draft.source,
    operatorNote: draft.operatorNote,
    subject: draft.subject,
    body: draft.body,
    facts: draft.facts,
  });
}
