import type {
  BaselineInput,
  Channel,
  InteractionInput,
  TransactionInput,
} from "../engine/types.ts";

const WINDOW_MINUTES = 720;

export type Story = {
  asOf: string;
  interactions: InteractionInput[];
  transactions: TransactionInput[];
  baselines: BaselineInput[];
};

function ago(asOf: Date, minutes: number) {
  return new Date(asOf.getTime() - minutes * 60_000).toISOString();
}

function complaint(
  asOf: Date,
  input: {
    id: string;
    channel: Channel;
    minutesAgo: number;
    customerRef: string;
    text: string;
    amount?: number | null;
    rrn?: string | null;
    beneficiary?: string | null;
    location?: string | null;
  },
): InteractionInput {
  return {
    id: input.id,
    channel: input.channel,
    receivedAt: ago(asOf, input.minutesAgo),
    customerRef: input.customerRef,
    text: input.text,
    sourceRef: input.id,
    amount: input.amount ?? null,
    rrn: input.rrn ?? null,
    accountMask: null,
    beneficiary: input.beneficiary ?? null,
    location: input.location ?? null,
  };
}

function nipTransaction(asOf: Date, id: string, rrn: string, amount: number, minutesAgo: number, location: string): TransactionInput {
  return {
    id,
    rrn,
    amount,
    beneficiary: "Ada Nwosu",
    accountMask: "******4421",
    scheme: "nip",
    responseCode: "97",
    status: "timeout",
    occurredAt: ago(asOf, minutesAgo + 8),
    location,
  };
}

const linkedNip = [
  { ref: "NIP-1001", city: "Lagos", channel: "app" as const, amount: 125_000, rrn: "441200883101" },
  { ref: "NIP-1002", city: "Abuja", channel: "contact_centre" as const, amount: 240_000, rrn: "441200883102" },
  { ref: "NIP-1003", city: "Lagos", channel: "social" as const, amount: 480_000, rrn: "441200883103" },
  { ref: "NIP-1004", city: "Abuja", channel: "email" as const, amount: 75_000, rrn: "441200883104" },
  { ref: "NIP-1005", city: "Lagos", channel: "app" as const, amount: 1_500_000, rrn: "441200883105" },
  { ref: "NIP-1006", city: "Abuja", channel: "contact_centre" as const, amount: 310_000, rrn: "441200883106" },
  { ref: "NIP-1007", city: "Lagos", channel: "social" as const, amount: 90_000, rrn: "441200883107" },
  { ref: "NIP-1008", city: "Abuja", channel: "app" as const, amount: 640_000, rrn: "441200883108" },
  { ref: "NIP-1009", city: "Lagos", channel: "ussd" as const, amount: 55_000, rrn: "441200883109" },
  { ref: "NIP-1010", city: "Abuja", channel: "email" as const, amount: 2_400_000, rrn: "441200883110" },
];

export function buildStory(asOf = new Date()): Story {
  const interactions: InteractionInput[] = [];
  const transactions: TransactionInput[] = [];

  const chiomaRrn = "441200883311";
  const chiomaAmount = 850_000;
  for (const [index, channel] of (["app", "contact_centre", "social"] as const).entries()) {
    interactions.push(
      complaint(asOf, {
        id: `seed-nip-chioma-${channel}`,
        channel,
        minutesAgo: 12 + index * 6,
        customerRef: "CHI-2041",
        text: `Transfer of ₦${chiomaAmount.toLocaleString("en-NG")} was not credited. RRN ${chiomaRrn}`,
        amount: chiomaAmount,
        rrn: chiomaRrn,
        beneficiary: "Ada Nwosu",
        location: "Lagos",
      }),
    );
  }
  transactions.push(nipTransaction(asOf, "txn-nip-chioma", chiomaRrn, chiomaAmount, 12, "Lagos"));

  interactions.push(
    complaint(asOf, {
      id: "seed-nip-unlinked-abuja",
      channel: "contact_centre",
      minutesAgo: 28,
      customerRef: "NIP-1101",
      text: "My transfer was not credited and I do not have the RRN",
      amount: 475_000,
      location: "Abuja",
    }),
    complaint(asOf, {
      id: "seed-nip-unlinked-lagos",
      channel: "app",
      minutesAgo: 34,
      customerRef: "NIP-1102",
      text: "The transfer is still pending credit. I was not given an RRN",
      amount: 890_000,
      location: "Lagos",
    }),
  );

  linkedNip.forEach((person, index) => {
    interactions.push(
      complaint(asOf, {
        id: `seed-nip-${person.ref}`,
        channel: person.channel,
        minutesAgo: 16 + index * 3,
        customerRef: person.ref,
        text: `Transfer was not credited. RRN ${person.rrn}`,
        amount: person.amount,
        rrn: person.rrn,
        beneficiary: "Ada Nwosu",
        location: person.city,
      }),
    );
    transactions.push(nipTransaction(asOf, `txn-nip-${person.ref}`, person.rrn, person.amount, 16 + index * 3, person.city));
  });

  const loginChannels = ["app", "contact_centre", "social", "ussd", "email"] as const;
  for (let index = 1; index <= 12; index += 1) {
    const stuck = index === 4 ? " Biometric failed and my ₦20,000 is stuck in the app." : " Biometric keeps failing.";
    interactions.push(
      complaint(asOf, {
        id: `seed-login-${index}`,
        channel: loginChannels[index % loginChannels.length],
        minutesAgo: 8 + index,
        customerRef: `LOG-${index}`,
        text: `I cannot log in.${stuck}`,
        location: index % 2 === 0 ? "Abuja" : "Lagos",
      }),
    );
  }

  const merchants = [
    { ref: "MER-301", city: "Ikeja", amount: 42_000 },
    { ref: "MER-302", city: "Wuse", amount: 68_000 },
    { ref: "MER-303", city: "Lekki", amount: 110_000 },
    { ref: "MER-304", city: "Yaba", amount: 36_500 },
  ];
  for (const merchant of merchants) {
    interactions.push(
      complaint(asOf, {
        id: `seed-pos-${merchant.ref}`,
        channel: merchant.ref.endsWith("2") ? "email" : "app",
        minutesAgo: 40,
        customerRef: merchant.ref,
        text: `POS settlement has not reflected for vendor Horizon. ₦${merchant.amount.toLocaleString("en-NG")} is still outstanding.`,
        amount: merchant.amount,
        location: merchant.city,
      }),
    );
  }

  interactions.push(
    complaint(asOf, {
      id: "seed-wrong-beneficiary",
      channel: "branch",
      minutesAgo: 50,
      customerRef: "BEN-1180",
      text: "I am so upset. I sent the transfer to the wrong beneficiary and the money is gone.",
      amount: 250_000,
      rrn: "441200883901",
      beneficiary: "Wrong Person",
      location: "Lagos",
    }),
  );
  transactions.push({
    id: "txn-wrong-beneficiary",
    rrn: "441200883901",
    amount: 250_000,
    beneficiary: "Wrong Person",
    accountMask: "******7781",
    scheme: "nip",
    responseCode: "00",
    status: "success",
    occurredAt: ago(asOf, 58),
    location: "Lagos",
  });

  interactions.push(
    complaint(asOf, {
      id: "seed-staff-conduct",
      channel: "branch",
      minutesAgo: 46,
      customerRef: "STF-3304",
      text: "The teller at the counter was rude and unprofessional.",
      location: "Ikeja",
    }),
  );

  for (let index = 1; index <= 6; index += 1) {
    interactions.push(
      complaint(asOf, {
        id: `seed-ikeja-${index}`,
        channel: "branch",
        minutesAgo: 22 + index,
        customerRef: `BR-${index}`,
        text: "The Ikeja branch told me the wrong thing about my account.",
        location: "Ikeja",
      }),
    );
  }

  return {
    asOf: asOf.toISOString(),
    interactions,
    transactions,
    baselines: [
      { signature: "payment|failed_nip|nip", domain: "payment", normalCount: 2, windowMinutes: WINDOW_MINUTES },
      { signature: "service|authentication|cannot_sign_in", domain: "service", normalCount: 1, windowMinutes: WINDOW_MINUTES },
      { signature: "payment|pos_settlement|horizon", domain: "payment", normalCount: 1, windowMinutes: WINDOW_MINUTES },
      { signature: "service|branch_service|wrong_information|ikeja", domain: "service", normalCount: 1, windowMinutes: WINDOW_MINUTES },
    ],
  };
}
