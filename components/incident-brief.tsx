import Link from "next/link";

import { plainSituation } from "@/lib/explain.ts";
import type { IncidentResult } from "@/lib/engine/types.ts";
import { naira } from "@/lib/format.ts";

import { Mark } from "./mark";

export function IncidentBrief({ incident }: { incident: IncidentResult }) {
  return (
    <article className="brief">
      <div className="brief-top">
        <Mark label={incident.label} />
        <span className="muted">{incident.owner}</span>
      </div>
      <h3>
        <Link href={`/incidents/${incident.id}`}>{incident.title}</Link>
      </h3>
      <p>{plainSituation(incident)}</p>
      <p className="next">{incident.nextAction}</p>
      <p className="muted">
        {`${incident.domain === "payment" ? `${naira(incident.valueInFlight)} outstanding` : `${incident.customers} customers`} · ${incident.interactionCount} ${incident.interactionCount === 1 ? "message" : "messages"} · urgency ${incident.priority}`}
      </p>
    </article>
  );
}
