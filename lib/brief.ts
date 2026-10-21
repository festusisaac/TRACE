import type { IncidentResult } from "./engine/types.ts";
import { complaintKind } from "./explain.ts";
import { naira } from "./format.ts";

function kind(signature: string) {
  return complaintKind(signature);
}

export function operatorBrief(incident: IncidentResult) {
  const exposure =
    incident.domain === "payment"
      ? `${naira(incident.valueInFlight)} has not been credited, across ${incident.customers} customers and ${incident.interactionCount} messages.`
      : `${incident.customers} customers are blocked. No money is attached to this record.`;
  const pattern =
    incident.responsePattern && incident.responsePattern !== "unspecified"
      ? ` Matched payments most often came back with code ${incident.responsePattern}.`
      : "";
  return `${incident.title} is ${incident.label}. ${exposure} ${incident.observed} customers reported it. A normal level for this problem is ${incident.baseline}.${pattern} ${incident.nextAction}`;
}

export function customerReply(incident: IncidentResult) {
  switch (kind(incident.signature)) {
    case "failed_nip":
    case "delayed_reversal":
    case "duplicate_debit":
      return {
        subject: "Your transfer",
        body: "Your transfer is included in a wider credit delay. We have the report, so you do not need to send it again. We will write to you when the credit or the reversal is complete.",
      };
    case "pos_settlement":
      return {
        subject: "POS settlement",
        body: "Your settlement report is with the other terminal complaints we are checking for this vendor. We will confirm when the file has been posted.",
      };
    case "wrong_beneficiary":
      return {
        subject: "Transfer beneficiary",
        body: "We matched this transfer. It went to the beneficiary on the instruction. If you want a recall, we will open that for this payment only.",
      };
    case "staff_conduct":
      return {
        subject: "Your branch visit",
        body: "We have recorded what happened at the branch. Branch service will contact you about this visit. It has not been added to a payment incident.",
      };
    case "wrong_information":
      return {
        subject: "Branch explanation",
        body: "Several customers were given the wrong explanation at this branch. We are correcting that with the branch. This is not a network failure on your payment.",
      };
    case "authentication":
    case "login_or_otp":
      return {
        subject: "Sign-in",
        body: "We can see that you cannot sign in. The same failure is affecting other customers, so this is not being treated as a fault on your account. You do not need to send another message. We will tell you when sign-in is restored.",
      };
    default:
      return {
        subject: "Your complaint",
        body: incident.domain === "service"
          ? "We have your report with the other customers affected by the same service failure. You do not need to raise it again. We will write when the service is restored."
          : "We have your payment report. You do not need to raise it again. We will write when there is a change on the transaction.",
      };
  }
}
