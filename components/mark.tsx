import type { EmergenceLabel } from "@/lib/engine/types.ts";
import { severityName } from "@/lib/format.ts";

export function Mark({ label }: { label: EmergenceLabel }) {
  return (
    <span className={`pill ${label}`}>
      <span className="dot" aria-hidden="true" />
      {severityName(label)}
    </span>
  );
}
