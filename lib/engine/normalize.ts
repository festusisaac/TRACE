import type { NormalizedComplaint } from "./types.ts";

function parseAmount(raw: string) {
  const value = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(value)) return null;
  return Math.round(value);
}

function amountFromText(text: string) {
  const symbol = text.match(
    /(?:₦|ngn)\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)(?:\.\d{1,2})?/i,
  );
  if (symbol?.[1]) return parseAmount(symbol[1]);
  const word = text.match(
    /\b([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)\s*naira\b/i,
  );
  if (word?.[1]) return parseAmount(word[1]);
  return null;
}

function rrnFromText(text: string) {
  const labeled = text.match(/\brrn[:\s#-]*(\d{12})\b/i);
  if (labeled?.[1]) return labeled[1];
  const bare = text.match(/\b(\d{12})\b/);
  return bare?.[1] ?? null;
}

function maskFromText(text: string) {
  const masked = text.match(/\b(?:\*{2,}|x{2,})(\d{4})\b/i);
  if (masked?.[1]) return `******${masked[1]}`;
  const account = text.match(/\baccount\s+(\d{10})\b/i);
  if (account?.[1]) return `******${account[1].slice(-4)}`;
  return null;
}

function beneficiaryFromText(text: string) {
  const match = text.match(/\bto\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/);
  return match?.[1] ?? null;
}

function locationFromText(text: string) {
  const match = text.match(/\bat\s+(?:the\s+)?([A-Za-z][A-Za-z\s]{1,40}?)\s+branch\b/);
  return match?.[1]?.trim() ?? null;
}

function vendorFromText(text: string) {
  const match = text.match(/\bvendor\s+([A-Za-z][A-Za-z0-9-]*)/);
  return match?.[1]?.toLowerCase() ?? null;
}

export function normalizeComplaint(input: {
  text: string;
  amount: number | null;
  rrn: string | null;
  accountMask: string | null;
  beneficiary: string | null;
  location: string | null;
}): NormalizedComplaint {
  return {
    amount: input.amount ?? amountFromText(input.text),
    rrn: input.rrn ?? rrnFromText(input.text),
    accountMask: input.accountMask ?? maskFromText(input.text),
    beneficiary: input.beneficiary ?? beneficiaryFromText(input.text),
    location: input.location ?? locationFromText(input.text),
    vendor: vendorFromText(input.text),
  };
}
