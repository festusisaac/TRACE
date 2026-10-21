import { naira } from "./format.ts";
import type { Channel, IncidentResult, Investigation } from "./engine/types.ts";

const kinds = new Set([
  "failed_nip",
  "delayed_reversal",
  "duplicate_debit",
  "pos_settlement",
  "card_decline",
  "wrong_beneficiary",
  "charge_dispute",
  "login_or_otp",
  "authentication",
  "channel_downtime",
  "account_opening",
  "card_delivery",
  "loan_silence",
  "staff_conduct",
  "branch_conduct",
  "wrong_information",
]);

export function complaintKind(signature: string) {
  return signature.split("|").find((part) => kinds.has(part)) ?? signature.split("|")[1] ?? "";
}

export function plainSituation(incident: IncidentResult) {
  const places = incident.locations.length > 0 ? incident.locations.join(" and ") : "more than one place";
  switch (complaintKind(incident.signature)) {
    case "failed_nip":
      return `${incident.customers} customers say a transfer left their account and the other person has not been credited. ${naira(incident.valueInFlight)} is still outstanding, reported from ${places}.`;
    case "authentication":
      return `${incident.customers} customers cannot sign in. No money is involved. They are locked out of the service.`;
    case "wrong_information":
      return `${incident.customers} customers at ${incident.locations[0] ?? "one branch"} were told the wrong thing about their account. This is how that branch explained it, not a failure of the payment network.`;
    case "pos_settlement":
      return `${incident.customers} merchants say what the terminal collected does not match what was settled. ${naira(incident.valueInFlight)} is in question. It is growing, and it is not yet a network-wide alarm.`;
    case "wrong_beneficiary":
      return "One customer sent money to the wrong person. The payment itself went through. It does not match a wider failure.";
    case "staff_conduct":
      return "One customer says a teller was rude. It stays with that customer. It is not part of a payment delay or a sign-in failure.";
    default:
      return incident.evidence[0] ?? incident.title;
  }
}

export function channelMeaning(channel: Channel) {
  switch (channel) {
    case "branch":
      return "A customer spoke to someone in a branch.";
    case "contact_centre":
      return "A customer called the contact centre.";
    case "email":
      return "A written complaint sent by email.";
    case "social":
      return "A public post. Other customers can see it, so it carries reputation as well as the complaint.";
    case "app":
      return "A message sent from inside the mobile app.";
    case "ussd":
      return "A short session on the phone’s USSD menu.";
  }
}

export function linkSentence(status: string) {
  if (status === "linked") return "TRACE found the payment this complaint is about.";
  if (status === "unlinked") return "The customer did not give a payment reference. The complaint is still kept with the matching problem.";
  if (status === "not_applicable") return "This complaint is not about a payment, so there is no transaction to find.";
  return status;
}

export function openPatterns(book: Investigation) {
  return book.incidents.filter((incident) => !incident.acknowledged && incident.label !== "isolated");
}

export function moneyOutstanding(book: Investigation) {
  return book.incidents
    .filter((incident) => incident.domain === "payment" && incident.label !== "isolated")
    .reduce((sum, incident) => sum + incident.valueInFlight, 0);
}

export function serviceCustomers(book: Investigation) {
  return book.incidents
    .filter((incident) => incident.domain === "service" && incident.label !== "isolated")
    .reduce((sum, incident) => sum + incident.customers, 0);
}

export function bookSummary(book: Investigation) {
  const waiting = openPatterns(book);
  const money = moneyOutstanding(book);
  const people = serviceCustomers(book);
  const sentences = [
    waiting.length === 1
      ? "One wider problem still needs a team to accept it."
      : waiting.length === 0
        ? "Every wider problem on this book has already been accepted by a team."
        : `${waiting.length} wider problems still need a team to accept them.`,
  ];
  if (money > 0) sentences.push(`${naira(money)} has left customer accounts and has not been credited.`);
  if (people > 0) sentences.push(`${people} customers are caught in a service problem. That figure is people, not money.`);
  if (book.queue.length === 1) sentences.push("One complaint belongs to a single customer and should be handled alone.");
  else if (book.queue.length > 1) sentences.push(`${book.queue.length} complaints belong to one customer each and should be handled alone.`);
  return sentences.join(" ");
}
