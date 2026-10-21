import { IntakeError, deployIncidentAdvisory } from "@/lib/intake";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const result = await deployIncidentAdvisory(id);
    const incident = result.incidents.find((item) => item.id === id);
    return Response.json({
      incidentId: id,
      advisoryDeployed: true,
      title: incident?.title ?? null,
    });
  } catch (error) {
    if (error instanceof IntakeError) {
      const status = error.message === "Incident was not found." ? 404 : 400;
      return Response.json({ error: error.message }, { status });
    }
    throw error;
  }
}
