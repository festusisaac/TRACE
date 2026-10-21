export const channels = [
  "branch",
  "contact_centre",
  "email",
  "social",
  "app",
  "ussd",
] as const;

export type Channel = (typeof channels)[number];
export type Domain = "payment" | "service";
export type LinkStatus = "linked" | "unlinked" | "not_applicable";
export type EmergenceLabel = "systemic" | "emerging" | "isolated";
export type Scope = "network" | "vendor" | "location" | "customer";
export type CaseStatus = "open" | "answered" | "closed";

export type InteractionInput = {
  id: string;
  channel: Channel;
  receivedAt: string;
  customerRef: string;
  text: string;
  sourceRef: string;
  amount: number | null;
  rrn: string | null;
  accountMask: string | null;
  beneficiary: string | null;
  location: string | null;
};

export type TransactionInput = {
  id: string;
  rrn: string | null;
  amount: number;
  beneficiary: string | null;
  accountMask: string | null;
  scheme: string;
  responseCode: string | null;
  status: string;
  occurredAt: string;
  location: string | null;
};

export type ServiceRequestInput = {
  id: string;
  customerRef: string;
  kind: "card" | "onboarding" | "loan" | "channel_incident";
  reference: string;
  status: string;
  openedAt: string;
};

export type BaselineInput = {
  signature: string;
  domain: Domain;
  normalCount: number;
  windowMinutes: number;
};

export type IncidentActionInput = {
  incidentId: string;
  action: "acknowledge" | "deploy_advisory";
  owner: string;
  actedAt: string;
};

export type Classification = {
  domain: Domain;
  complaintType: string;
  journey: string | null;
  failureMode: string | null;
  evidence: string;
};

export type LinkResult = {
  status: LinkStatus;
  targetId: string | null;
  reason: string;
};

export type NormalizedComplaint = {
  amount: number | null;
  rrn: string | null;
  accountMask: string | null;
  beneficiary: string | null;
  location: string | null;
  vendor: string | null;
};

export type AnnotatedInteraction = InteractionInput &
  NormalizedComplaint & {
    classification: Classification;
    link: LinkResult;
    signature: string;
    scope: Scope;
    problemKey: string;
    caseId: string;
    incidentId: string | null;
    answerFromIncident: boolean;
  };

export type ScorePart = {
  label: string;
  detail: string;
  points: number;
};

export type CaseResult = {
  id: string;
  customerRef: string;
  problemKey: string;
  status: CaseStatus;
  openedAt: string;
  interactionIds: string[];
};

export type IncidentResult = {
  id: string;
  signature: string;
  domain: Domain;
  scope: Scope;
  label: EmergenceLabel;
  title: string;
  owner: string;
  nextAction: string;
  priority: number;
  scoreParts: ScorePart[];
  evidence: string[];
  journey: string | null;
  failureMode: string | null;
  scheme: string | null;
  responsePattern: string | null;
  customers: number;
  interactionCount: number;
  valueInFlight: number;
  channels: Channel[];
  locations: string[];
  observed: number;
  baseline: number;
  windowMinutes: number;
  acknowledged: boolean;
  advisoryDeployed?: boolean;
  memberIds: string[];
  caseIds: string[];
  linkedTransactionIds: string[];
};

export type QueueItem = {
  caseId: string;
  customerRef: string;
  domain: Domain;
  complaintType: string;
  priority: number;
  label: EmergenceLabel;
  incidentId: string | null;
  interactionIds: string[];
};

export type Investigation = {
  asOf: string;
  interactions: AnnotatedInteraction[];
  cases: CaseResult[];
  incidents: IncidentResult[];
  queue: QueueItem[];
};

export type InvestigateInput = {
  interactions: InteractionInput[];
  transactions: TransactionInput[];
  serviceRequests: ServiceRequestInput[];
  baselines?: BaselineInput[];
  actions?: IncidentActionInput[];
  asOf?: string;
};
