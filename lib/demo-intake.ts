import type { Channel } from "./engine/types.ts";

export type DemoComplaint = {
  id: string;
  step: string;
  channel: Channel;
  title: string;
  cue: string;
  expect: string;
  customerRef: string;
  text: string;
  sourceRef: string;
  amount?: number;
  rrn?: string;
  location?: string;
};

export const demoComplaints: DemoComplaint[] = [
  {
    id: "social-transfer",
    step: "1",
    channel: "social",
    title: "A public post, with no payment reference",
    cue: "Someone has posted that a transfer left their account and never arrived.",
    expect: "It joins the NIP credit timeout. No reference was quoted, and the message is still kept.",
    customerRef: "SOC-9091",
    text: "Transfer was not credited. I paid from Lagos and the beneficiary has not received it.",
    sourceRef: "pitch-social-nip",
    amount: 320000,
    location: "Lagos",
  },
  {
    id: "contact-again",
    step: "2",
    channel: "contact_centre",
    title: "The same customer calls about the same transfer",
    cue: "Chioma already wrote on the app and on social. She is now on the phone.",
    expect: "It stays her existing case, and TRACE finds payment 441200883311.",
    customerRef: "CHI-2041",
    text: "I called again about my transfer. It is still not credited. RRN 441200883311.",
    sourceRef: "pitch-contact-chioma",
    amount: 850000,
    rrn: "441200883311",
    location: "Lagos",
  },
  {
    id: "app-login",
    step: "3",
    channel: "app",
    title: "A customer cannot sign in",
    cue: "This is not a payment. The customer is locked out of the app.",
    expect: "It joins the sign-in failure. There is no transaction to find.",
    customerRef: "LOG-9910",
    text: "I cannot log in to the mobile app. The biometric keeps failing.",
    sourceRef: "pitch-app-login",
  },
  {
    id: "branch-ikeja",
    step: "4",
    channel: "branch",
    title: "Ikeja gave the wrong explanation",
    cue: "A customer at the Ikeja branch was told the wrong thing. This is not the transfer problem.",
    expect: "It joins the Ikeja branch incident, not the payment network.",
    customerRef: "BR-9911",
    text: "At the Ikeja branch they told me the wrong thing about my account.",
    sourceRef: "pitch-branch-ikeja",
    location: "Ikeja",
  },
  {
    id: "ussd-pos",
    step: "5",
    channel: "ussd",
    title: "A merchant reports a Horizon settlement",
    cue: "A short USSD session about a terminal that has not settled.",
    expect: "It joins the Horizon settlement incident, which is still emerging.",
    customerRef: "MER-9912",
    text: "POS settlement has not reflected for vendor Horizon.",
    sourceRef: "pitch-ussd-horizon",
    amount: 54000,
    location: "Lekki",
  },
  {
    id: "email-conduct",
    step: "6",
    channel: "email",
    title: "One rude teller, and nobody else",
    cue: "A strong email about one visit. It should not become a system failure.",
    expect: "It stays with this customer. It does not join Ikeja or the sign-in failure.",
    customerRef: "STF-9913",
    text: "The teller was rude and unprofessional when I visited the Yaba branch.",
    sourceRef: "pitch-email-conduct",
    location: "Yaba",
  },
];
