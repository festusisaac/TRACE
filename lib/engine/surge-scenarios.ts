import type { Channel } from "./types.ts";

export type SurgeComplaintTemplate = {
  channel: Channel;
  customerRef: string;
  customerName: string;
  text: string;
  amount: number | null;
  rrn: string | null;
  beneficiary: string | null;
  location: string | null;
};

export type SurgeScenario = {
  id: "nip_surge" | "pos_surge" | "auth_surge" | "distress_surge";
  title: string;
  shortLabel: string;
  incidentTargetId: string;
  category: "Payment · Systemic" | "Payment · Emerging" | "Service · Access" | "Critical · Distress Alarm";
  description: string;
  expectedOutcome: string;
  complaints: SurgeComplaintTemplate[];
};

export const SURGE_SCENARIOS: SurgeScenario[] = [
  {
    id: "nip_surge",
    title: "NIP Inter-Bank Transfer Switch Downtime",
    shortLabel: "NIP Switch Failure",
    incidentTargetId: "inc-payment-failed-nip-nip",
    category: "Payment · Systemic",
    description: "Outward NIP transfers debited from Zenith accounts but hanging at destination switch (OPay, Access, GTBank). Triggers multi-channel customer panic.",
    expectedOutcome: "Urgency escalates to 90+, Money in Flight rises by +₦1.4M, CBN sanction exposure increases by ₦400,000.",
    complaints: [
      {
        channel: "app",
        customerRef: "SURGE-NIP-01",
        customerName: "Babatunde Adeleke",
        text: "I sent ₦125,000 to Access Bank via NIP, account debited but recipient hasn't received it yet. Ref NIP-8829102847",
        amount: 125_000,
        rrn: "882910284711",
        beneficiary: "Access Bank / Olumide Bakare",
        location: "Lagos",
      },
      {
        channel: "social",
        customerRef: "SURGE-NIP-02",
        customerName: "Amina Bello (@amina_b)",
        text: "@ZenithBank urgent please! Tried sending ₦50,000 school fees to GTBank, transaction showed timeout on mobile app but my account was debited! RRN 992019284710",
        amount: 50_000,
        rrn: "992019284710",
        beneficiary: "GTBank / Amina Bello",
        location: "Abuja",
      },
      {
        channel: "contact_centre",
        customerRef: "SURGE-NIP-03",
        customerName: "Chukwudi Eze",
        text: "Customer on line 4: Vendor payment of ₦450,000 to Zenith account hanging since 15 mins. NIP transfer debited my business account without value. Reverse now!",
        amount: 450_000,
        rrn: "338291048291",
        beneficiary: "Zenith / Eze Hardware Ltd",
        location: "Onitsha",
      },
      {
        channel: "app",
        customerRef: "SURGE-NIP-04",
        customerName: "Folake Adebayo",
        text: "Transfer of ₦80,000 to OPay wallet failed with switch error code 91, but my alert deducted the money. RRN 771920481923",
        amount: 80_000,
        rrn: "771920481923",
        beneficiary: "OPay / Folake Adebayo",
        location: "Ibadan",
      },
      {
        channel: "ussd",
        customerRef: "SURGE-NIP-05",
        customerName: "Ibrahim Danjuma",
        text: "USSD *966* transfer of ₦35,000 to FirstBank deducted from balance. Receiver says no credit. RRN 119284710294",
        amount: 35_000,
        rrn: "119284710294",
        beneficiary: "FirstBank / Danjuma Supply",
        location: "Kano",
      },
      {
        channel: "contact_centre",
        customerRef: "SURGE-NIP-06",
        customerName: "Grace Okafor",
        text: "Customer calling from Ikeja: sent ₦220,000 for hospital bill via Zenith App. Beneficiary hospital in Victoria Island did not receive credit. Ref NIP9918230192",
        amount: 220_000,
        rrn: "991823019245",
        beneficiary: "Zenith / Lagoon Hospital",
        location: "Lagos",
      },
      {
        channel: "branch",
        customerRef: "SURGE-NIP-07",
        customerName: "Samuel Oladipo",
        text: "Customer at Marina branch customer service desk: ₦300,000 inter-bank transfer debited, NIP switch not credited. RRN 662910482719",
        amount: 300_000,
        rrn: "662910482719",
        beneficiary: "Stanbic IBTC / Prime Logistics",
        location: "Lagos",
      },
      {
        channel: "social",
        customerRef: "SURGE-NIP-08",
        customerName: "Kelechi Nnamdi",
        text: "@ZenithBank fix your NIP gateway! Two debits for ₦140,000 total while buying flight ticket. Neither transaction reached the airline. RRN 551928471029",
        amount: 140_000,
        rrn: "551928471029",
        beneficiary: "Air Peace / Nnamdi",
        location: "Enugu",
      },
    ],
  },
  {
    id: "pos_surge",
    title: "Horizon POS Terminal Decline Spike",
    shortLabel: "POS Double Debits",
    incidentTargetId: "inc-payment-pos-settlement-horizon",
    category: "Payment · Emerging",
    description: "Retail merchants report customer debit alerts on declined POS transactions across Ikeja City Mall and Palms Mall.",
    expectedOutcome: "Threshold crossed into Emerging incident warning, money in flight jumps by +₦245,000.",
    complaints: [
      {
        channel: "contact_centre",
        customerRef: "SURGE-POS-01",
        customerName: "Tunde Bakare",
        text: "POS declined at Spar supermarket Ikeja City Mall, but my account was debited ₦48,500. Cashier refused to release goods. RRN POS9918204",
        amount: 48_500,
        rrn: "POS991820401",
        beneficiary: "Horizon / Spar Ikeja",
        location: "Ikeja",
      },
      {
        channel: "branch",
        customerRef: "SURGE-POS-02",
        customerName: "Ngozi Eze",
        text: "Walked into Palms Mall branch: POS card transaction declined twice for ₦32,000 each, but I received two debit alerts. Reverse ₦64,000 immediately.",
        amount: 64_000,
        rrn: "POS991820402",
        beneficiary: "Horizon / Palms Retail",
        location: "Lekki",
      },
      {
        channel: "social",
        customerRef: "SURGE-POS-03",
        customerName: "David Adeleke",
        text: "Bought fuel of ₦25,000 at Total filling station Ikeja, POS said issuer timeout but account was debited! RRN POS991820403",
        amount: 25_000,
        rrn: "POS991820403",
        beneficiary: "Horizon / Total Energy",
        location: "Ikeja",
      },
      {
        channel: "app",
        customerRef: "SURGE-POS-04",
        customerName: "Halima Sani",
        text: "Disputed transaction: Horizon POS decline at pharmacy for ₦18,200. Debited without receipt. RRN POS991820404",
        amount: 18_200,
        rrn: "POS991820404",
        beneficiary: "Horizon / MedPlus",
        location: "Victoria Island",
      },
      {
        channel: "contact_centre",
        customerRef: "SURGE-POS-05",
        customerName: "Emeka Umeh",
        text: "Customer calling from restaurant in Ikeja: ₦89,000 dinner bill charged to Zenith debit card on POS terminal, declined slip printed, debit alert arrived.",
        amount: 89_000,
        rrn: "POS991820405",
        beneficiary: "Horizon / Ocean Basket",
        location: "Ikeja",
      },
    ],
  },
  {
    id: "auth_surge",
    title: "Mobile App Biometric Sign-in Lockout",
    shortLabel: "App Biometric Lockout",
    incidentTargetId: "inc-service-authentication-cannot-sign-in",
    category: "Service · Access",
    description: "App update v4.8.2 causes biometric tokens to expire abruptly, locking customers out across nationwide digital channels.",
    expectedOutcome: "Customer cases spike; TRACE identifies non-payment nature (₦0 monetary exposure, high customer distress).",
    complaints: [
      {
        channel: "social",
        customerRef: "SURGE-AUTH-01",
        customerName: "Dami Ojo",
        text: "@ZenithBank since updating your mobile app 30 mins ago, FaceID keeps throwing 'Session Expired - Error 401'. Cannot log in at all!",
        amount: null,
        rrn: null,
        beneficiary: null,
        location: "Lagos",
      },
      {
        channel: "contact_centre",
        customerRef: "SURGE-AUTH-02",
        customerName: "Kemi Balogun",
        text: "Customer cannot sign into mobile banking app. App closes immediately after fingerprint authentication. Password reset link not arriving.",
        amount: null,
        rrn: null,
        beneficiary: null,
        location: "Abuja",
      },
      {
        channel: "app",
        customerRef: "SURGE-AUTH-03",
        customerName: "Umar Farouk",
        text: "Cannot sign in to mobile banking. Getting network timeout error on biometric login screen after latest iOS update.",
        amount: null,
        rrn: null,
        beneficiary: null,
        location: "Kaduna",
      },
      {
        channel: "branch",
        customerRef: "SURGE-AUTH-04",
        customerName: "Blessing Okon",
        text: "Customer in branch with phone: mobile app says account locked due to multiple biometric failures. Customer needs urgent balance check.",
        amount: null,
        rrn: null,
        beneficiary: null,
        location: "Calabar",
      },
      {
        channel: "social",
        customerRef: "SURGE-AUTH-05",
        customerName: "Chinedu Obi",
        text: "Is Zenith mobile app down today? Both fingerprint and token sign-in not working on Android 14. Keep getting session invalid error.",
        amount: null,
        rrn: null,
        beneficiary: null,
        location: "Port Harcourt",
      },
    ],
  },
  {
    id: "distress_surge",
    title: "Emergency Distress & Duress Freeze ('One Chance' Robbery)",
    shortLabel: "One Chance Distress Alarm",
    incidentTargetId: "inc-service-fraud-distress-emergency-freeze-distress-881",
    category: "Critical · Distress Alarm",
    description: "Customer abducted in a 'one chance' commercial vehicle at gunpoint. Sends desperate distress message via USSD/SMS demanding immediate account freeze.",
    expectedOutcome: "Immediate Urgency 100/100, flashes persistent Red Alert Distress Alarm, and offers 1-click Post-No-Debit (PND) freeze to protect customer funds in seconds.",
    complaints: [
      {
        channel: "ussd",
        customerRef: "DISTRESS-881",
        customerName: "Tunde Bakare (Victim under Duress)",
        text: "HELP! I just entered one chance in Ikeja, they took my phone and card and have a gun to my head, BLOCK MY ACCOUNT NOW before they drain everything!",
        amount: null,
        rrn: null,
        beneficiary: null,
        location: "Ikeja, Lagos",
      },
    ],
  },
];
