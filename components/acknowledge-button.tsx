"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AcknowledgeButton({
  incidentId,
  owner,
  acknowledged,
}: {
  incidentId: string;
  owner: string;
  acknowledged: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function acknowledge() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/incidents/${incidentId}/acknowledge`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ owner }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "The acknowledgement was not recorded.");
        return;
      }
      router.refresh();
    } catch {
      setError("The desk could not record the acknowledgement.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="acknowledge">
      <button className="button primary" type="button" onClick={acknowledge} disabled={acknowledged || pending}>
        {acknowledged ? "Accepted by the team" : pending ? "Recording…" : `Accept for ${owner}`}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
