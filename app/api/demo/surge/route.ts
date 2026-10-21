import { receiveComplaint } from "@/lib/intake";
import { SURGE_SCENARIOS } from "@/lib/engine/surge-scenarios.ts";

export async function POST(request: Request) {
  let body: { scenario?: string; singleIndex?: number; count?: number } = {};
  try {
    body = await request.json();
  } catch {
    // default to nip_surge
  }

  const scenarioId = body.scenario ?? "nip_surge";
  const scenario = SURGE_SCENARIOS.find((s) => s.id === scenarioId) ?? SURGE_SCENARIOS[0];

  let templatesToInject = scenario.complaints;
  if (typeof body.singleIndex === "number" && body.singleIndex >= 0 && body.singleIndex < scenario.complaints.length) {
    templatesToInject = [scenario.complaints[body.singleIndex]];
  } else if (typeof body.count === "number" && body.count > 0) {
    templatesToInject = scenario.complaints.slice(0, body.count);
  }

  const now = new Date().toISOString();
  const receipts = [];

  for (let i = 0; i < templatesToInject.length; i++) {
    const template = templatesToInject[i];
    const sourceRef = `pitch-${scenario.id}-${template.customerRef.toLowerCase()}-${Date.now()}-${i}`;
    const payload = {
      channel: template.channel,
      receivedAt: now,
      customerRef: template.customerRef,
      text: template.text,
      sourceRef,
      amount: template.amount,
      rrn: template.rrn,
      accountMask: "012345****99",
      beneficiary: template.beneficiary,
      location: template.location,
    };

    try {
      const receipt = await receiveComplaint(payload);
      receipts.push({
        ...receipt,
        customerName: template.customerName,
        text: template.text,
        amount: template.amount,
      });
    } catch (err) {
      console.error("Error injecting simulated complaint:", err);
    }
  }

  return Response.json({
    ok: true,
    scenario: scenario.title,
    scenarioId: scenario.id,
    targetIncidentId: scenario.incidentTargetId,
    injectedCount: receipts.length,
    receipts,
  });
}
