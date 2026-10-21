import { IntakeError, receiveComplaint } from "@/lib/intake";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  try {
    return Response.json(await receiveComplaint(body));
  } catch (error) {
    if (error instanceof IntakeError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
