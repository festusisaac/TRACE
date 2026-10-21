import { IntakeError, acknowledgeIncident } from "@/lib/intake";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const owner = body && typeof body === "object" && "owner" in body ? body.owner : "";
  try {
    const result = await acknowledgeIncident(id, typeof owner === "string" ? owner : "");
    const incident = result.incidents.find((item) => item.id === id);
    return Response.json({
      incidentId: id,
      acknowledged: true,
      priority: incident?.priority ?? null,
      nextAction: incident?.nextAction ?? null,
    });
  } catch (error) {
    if (error instanceof IntakeError) {
      const status = error.message === "Incident was not found." ? 404 : 400;
      return Response.json({ error: error.message }, { status });
    }
    throw error;
  }
}
