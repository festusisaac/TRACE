import { classifyComplaint } from "./classify.ts";
import { linkJourney, linkTransaction } from "./link.ts";
import { normalizeComplaint } from "./normalize.ts";
import {
  caseIdFor,
  incidentIdFor,
  labelFor,
  nextActionFor,
  ownerFor,
  problemKey,
  responsePattern,
  scoreGroup,
  signatureFor,
  titleFor,
  valueInFlight,
} from "./signature.ts";
import type {
  AnnotatedInteraction,
  CaseResult,
  Channel,
  IncidentResult,
  InvestigateInput,
  Investigation,
  QueueItem,
  TransactionInput,
} from "./types.ts";

const DEFAULT_WINDOW_MINUTES = 90;
const DEFAULT_BASELINE = 1;

function asOfFor(input: InvestigateInput) {
  if (input.asOf) return input.asOf;
  const times = input.interactions.map((interaction) => Date.parse(interaction.receivedAt)).filter((value) => !Number.isNaN(value));
  if (times.length === 0) return new Date().toISOString();
  return new Date(Math.max(...times)).toISOString();
}

function inWindow(receivedAt: string, asOf: string, windowMinutes: number) {
  const received = Date.parse(receivedAt);
  const end = Date.parse(asOf);
  if (Number.isNaN(received) || Number.isNaN(end)) return false;
  return received <= end && end - received <= windowMinutes * 60 * 1000;
}

function annotate(input: InvestigateInput): AnnotatedInteraction[] {
  const requests = input.serviceRequests;
  const transactions = input.transactions;
  return input.interactions.map((interaction) => {
    const normalized = normalizeComplaint(interaction);
    const classification = classifyComplaint(interaction.text);
    const link =
      classification.domain === "payment"
        ? linkTransaction(interaction.receivedAt, normalized, transactions, classification.complaintType)
        : linkJourney(interaction.text, interaction.customerRef, classification, requests);
    const signed = signatureFor(classification, interaction.customerRef, normalized.location, normalized.vendor);
    const key = problemKey(classification);
    return {
      ...interaction,
      ...normalized,
      classification,
      link,
      signature: signed.signature,
      scope: signed.scope,
      problemKey: key,
      caseId: caseIdFor(interaction.customerRef, key),
      incidentId: null,
      answerFromIncident: false,
    };
  });
}

function buildCases(interactions: AnnotatedInteraction[]): CaseResult[] {
  const groups = new Map<string, AnnotatedInteraction[]>();
  for (const interaction of interactions) {
    const current = groups.get(interaction.caseId) ?? [];
    current.push(interaction);
    groups.set(interaction.caseId, current);
  }
  return [...groups.entries()].map(([id, members]) => {
    const openedAt = members.map((member) => member.receivedAt).sort()[0] ?? members[0].receivedAt;
    const answered = members.every((member) => member.answerFromIncident);
    return {
      id,
      customerRef: members[0].customerRef,
      problemKey: members[0].problemKey,
      status: answered ? "answered" : "open",
      openedAt,
      interactionIds: members.map((member) => member.id),
    };
  });
}

export function investigate(input: InvestigateInput): Investigation {
  const asOf = asOfFor(input);
  const transactions = new Map<string, TransactionInput>(input.transactions.map((transaction) => [transaction.id, transaction]));
  const draft = annotate(input);
  const bySignature = new Map<string, AnnotatedInteraction[]>();
  for (const interaction of draft) {
    const current = bySignature.get(interaction.signature) ?? [];
    current.push(interaction);
    bySignature.set(interaction.signature, current);
  }

  const acknowledged = new Set(
    (input.actions ?? []).filter((action) => action.action === "acknowledge").map((action) => action.incidentId),
  );
  const advisories = new Set(
    (input.actions ?? []).filter((action) => action.action === "deploy_advisory").map((action) => action.incidentId),
  );

  const incidents: IncidentResult[] = [];
  for (const [signature, members] of bySignature) {
    const baselineRow = input.baselines?.find((baseline) => baseline.signature === signature);
    const baseline = baselineRow?.normalCount ?? DEFAULT_BASELINE;
    const windowMinutes = baselineRow?.windowMinutes ?? DEFAULT_WINDOW_MINUTES;
    const live = members.filter((member) => inWindow(member.receivedAt, asOf, windowMinutes));
    const counted = live.length > 0 ? live : members;
    const observed = new Set(counted.map((member) => member.customerRef)).size;
    const scope = members[0].scope;
    const label = labelFor(observed, baseline, scope);
    const id = incidentIdFor(signature);
    const isAcknowledged = acknowledged.has(id);
    const joined = label !== "isolated" || isAcknowledged;
    for (const member of members) {
      if (!counted.includes(member)) continue;
      member.incidentId = joined ? id : null;
      member.answerFromIncident = joined;
    }
    const sample = counted[0];
    const linked = counted
      .map((member) => (member.link.targetId ? transactions.get(member.link.targetId) : undefined))
      .filter((transaction): transaction is TransactionInput => Boolean(transaction));
    const unlinked = counted.filter((member) => member.link.status === "unlinked").length;
    const pattern = sample.classification.domain === "payment" ? responsePattern(linked) : null;
    const scheme =
      sample.classification.domain !== "payment"
        ? null
        : (linked[0]?.scheme ??
          (sample.classification.complaintType === "pos_settlement"
            ? "pos"
            : sample.classification.complaintType === "card_decline" ||
                sample.classification.complaintType === "charge_dispute"
              ? "card"
              : "nip"));
    const locations = [...new Set(counted.map((member) => member.location).filter((location): location is string => Boolean(location)))].sort();
    const channels = [...new Set(counted.map((member) => member.channel))].sort() as Channel[];
    const scored = scoreGroup(counted, label, isAcknowledged, transactions);
    const ratio = (observed / Math.max(baseline, 1)).toFixed(1);
    const evidence = [
      sample.classification.evidence,
      `${observed} customers in ${windowMinutes} minutes against a baseline of ${baseline} (${ratio}x).`,
      unlinked > 0
        ? `${unlinked} of ${counted.length} complaints had no matching transaction and stayed in this cluster.`
        : sample.link.reason,
    ];
    if (pattern && pattern !== "unspecified") {
      const matched = counted.filter((member) => member.link.status === "linked").length;
      const payments = new Set(linked.map((transaction) => transaction.id)).size;
      evidence.push(`${matched} complaints matched ${payments} payments, most often response ${pattern}.`);
    }
    if (sample.classification.domain === "service") {
      evidence.push("No naira exposure. Customers are blocked from the service itself.");
    }
    if (scope === "location") {
      evidence.push("The spike is concentrated at one location, so it is not treated as a network fault.");
    }
    incidents.push({
      id,
      signature,
      domain: sample.classification.domain,
      scope,
      label,
      title: titleFor(sample.classification.complaintType, scope, sample.location),
      owner: ownerFor(sample.classification.complaintType),
      nextAction: nextActionFor(sample.classification.complaintType, label, isAcknowledged, sample.location),
      priority: scored.priority,
      scoreParts: scored.parts,
      evidence,
      journey: sample.classification.journey,
      failureMode: sample.classification.failureMode,
      scheme,
      responsePattern: pattern,
      customers: observed,
      interactionCount: counted.length,
      valueInFlight: valueInFlight(counted, transactions),
      channels,
      locations,
      observed,
      baseline,
      windowMinutes,
      acknowledged: isAcknowledged,
      advisoryDeployed: advisories.has(id),
      memberIds: counted.map((member) => member.id),
      caseIds: [...new Set(counted.map((member) => member.caseId))],
      linkedTransactionIds: [...new Set(linked.map((transaction) => transaction.id))],
    });
  }

  const cases = buildCases(draft);
  const queue: QueueItem[] = [];
  for (const incident of incidents) {
    if (incident.label !== "isolated" || incident.acknowledged) continue;
    for (const caseId of incident.caseIds) {
      const caseResult = cases.find((item) => item.id === caseId);
      if (!caseResult) continue;
      const members = draft.filter((interaction) => caseResult.interactionIds.includes(interaction.id));
      const scored = scoreGroup(members, "isolated", false, transactions);
      queue.push({
        caseId,
        customerRef: caseResult.customerRef,
        domain: incident.domain,
        complaintType: members[0]?.classification.complaintType ?? incident.signature,
        priority: scored.priority,
        label: "isolated",
        incidentId: null,
        interactionIds: caseResult.interactionIds,
      });
    }
  }

  incidents.sort((left, right) => right.priority - left.priority || left.title.localeCompare(right.title));
  queue.sort((left, right) => right.priority - left.priority || left.caseId.localeCompare(right.caseId));

  return { asOf, interactions: draft, cases, incidents, queue };
}
