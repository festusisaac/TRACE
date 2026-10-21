import type { Classification } from "./types.ts";

type Rule = Classification & {
  test: (text: string) => boolean;
};

const rules: Rule[] = [
  {
    domain: "service",
    complaintType: "branch_conduct",
    journey: "branch_service",
    failureMode: "staff_conduct",
    evidence: "The complaint describes staff conduct.",
    test: (text) => /rude|insulted|shouted|unprofessional/.test(text),
  },
  {
    domain: "service",
    complaintType: "wrong_information",
    journey: "branch_service",
    failureMode: "wrong_information",
    evidence: "The complaint is about information the branch gave, not a payment event.",
    test: (text) =>
      /nobody(?:\s+[a-z]+){0,6}\s+will explain|told me the wrong|misinformed|wrong information|told me (?:the |it was |it had been )?(?:already )?revers/.test(
        text,
      ),
  },
  {
    domain: "service",
    complaintType: "login_or_otp",
    journey: "authentication",
    failureMode: "cannot_sign_in",
    evidence: "The customer cannot sign in.",
    test: (text) =>
      /cannot log ?in|can't log ?in|cant log ?in|biometric|unable to (?:log|sign) in|password (?:reset )?fail/.test(
        text,
      ),
  },
  {
    domain: "service",
    complaintType: "login_or_otp",
    journey: "authentication",
    failureMode: "cannot_sign_in",
    evidence: "An OTP failed for sign-in, and no completed payment is described.",
    test: (text) => /otp/.test(text) && /log ?in|sign in|app/.test(text) && !/not credited/.test(text),
  },
  {
    domain: "service",
    complaintType: "channel_downtime",
    journey: "channel",
    failureMode: "unavailable",
    evidence: "A digital channel is unavailable.",
    test: (text) => /app is down|ussd|session (?:drop|timed out)|service unavailable/.test(text),
  },
  {
    domain: "service",
    complaintType: "account_opening",
    journey: "onboarding",
    failureMode: "stalled",
    evidence: "Account opening has stalled.",
    test: (text) => /account opening|bvn (?:is )?pending|onboarding/.test(text),
  },
  {
    domain: "service",
    complaintType: "card_delivery",
    journey: "card_fulfilment",
    failureMode: "not_delivered",
    evidence: "A card has not been delivered.",
    test: (text) => /not been delivered|has not arrived|card delivery|waiting for (?:my )?card/.test(text),
  },
  {
    domain: "service",
    complaintType: "loan_silence",
    journey: "credit",
    failureMode: "no_decision",
    evidence: "A loan decision has not come back.",
    test: (text) => /loan (?:decision|pending|application)|no (?:decision|update) on (?:my )?loan/.test(text),
  },
  {
    domain: "payment",
    complaintType: "wrong_beneficiary",
    journey: null,
    failureMode: null,
    evidence: "The customer sent funds to the wrong beneficiary.",
    test: (text) => /wrong beneficiary|wrong account|sent to the wrong/.test(text),
  },
  {
    domain: "payment",
    complaintType: "duplicate_debit",
    journey: null,
    failureMode: null,
    evidence: "The customer was debited more than once.",
    test: (text) => /debited twice|double debit|duplicate debit|charged twice/.test(text),
  },
  {
    domain: "payment",
    complaintType: "pos_settlement",
    journey: null,
    failureMode: null,
    evidence: "A POS settlement has not reflected.",
    test: (text) => /pos settlement|terminal settlement|settlement (?:has )?not reflect/.test(text),
  },
  {
    domain: "payment",
    complaintType: "card_decline",
    journey: null,
    failureMode: null,
    evidence: "A card payment was declined.",
    test: (text) => /card (?:was )?declined|declined at/.test(text),
  },
  {
    domain: "payment",
    complaintType: "delayed_reversal",
    journey: null,
    failureMode: null,
    evidence: "A reversal has not landed.",
    test: (text) => /not reversed|reversal (?:is )?delayed|still waiting for (?:a )?reversal/.test(text),
  },
  {
    domain: "payment",
    complaintType: "charge_dispute",
    journey: null,
    failureMode: null,
    evidence: "The customer disputes a charge.",
    test: (text) => /unauthorized|did not authori[sz]e|dispute (?:this|the) charge/.test(text),
  },
  {
    domain: "payment",
    complaintType: "failed_nip",
    journey: null,
    failureMode: null,
    evidence: "A transfer was debited or sent, and the beneficiary was not credited.",
    test: (text) =>
      /not credited|nip\b|timed out|timeout|pending credit|beneficiary (?:has )?not receiv|\btransfer\b/.test(
        text,
      ),
  },
];

export function classifyComplaint(text: string): Classification {
  const normalized = text.toLowerCase();
  const match = rules.find((rule) => rule.test(normalized));
  if (match) {
    return {
      domain: match.domain,
      complaintType: match.complaintType,
      journey: match.journey,
      failureMode: match.failureMode,
      evidence: match.evidence,
    };
  }
  if (/debit|naira|₦|charge/.test(text)) {
    return {
      domain: "payment",
      complaintType: "failed_nip",
      journey: null,
      failureMode: null,
      evidence: "The text mentions money and no more specific service failure.",
    };
  }
  return {
    domain: "service",
    complaintType: "wrong_information",
    journey: "branch_service",
    failureMode: "wrong_information",
    evidence: "No payment event is described.",
  };
}
