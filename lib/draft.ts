import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";

import { briefFacts, draftRespectsFacts, type BriefFacts } from "./brief-facts.ts";
import { customerReply, operatorBrief } from "./brief.ts";
import type { IncidentResult } from "./engine/types.ts";

export type IncidentDraft = {
  operatorNote: string;
  subject: string;
  body: string;
  source: "gemini" | "template";
  facts: BriefFacts;
};

const cache = new Map<string, IncidentDraft>();

const draftSchema = z.object({
  operatorNote: z.string().describe("Two to four sentences for the operations team. Use only the figures in the facts."),
  subject: z.string().describe("A short subject line for the customer."),
  body: z.string().describe("What the customer can be told. Do not say money has already been returned."),
});

function fromTemplate(incident: IncidentResult, facts: BriefFacts): IncidentDraft {
  const reply = customerReply(incident);
  return {
    operatorNote: operatorBrief(incident),
    subject: reply.subject,
    body: reply.body,
    source: "template",
    facts,
  };
}

export async function draftIncident(incident: IncidentResult): Promise<IncidentDraft> {
  const facts = briefFacts(incident);
  const fallback = fromTemplate(incident, facts);
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return fallback;

  const cacheKey = JSON.stringify(facts);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const google = createGoogleGenerativeAI({ apiKey });
    const result = await generateText({
      model: google("gemini-3.8-flash"),
      temperature: 0.2,
      maxRetries: 0,
      timeout: 25_000,
      output: Output.object({ schema: draftSchema, name: "IncidentDraft" }),
      system: [
        "You draft two texts for a bank complaints desk in Nigeria.",
        "The facts are already decided by a deterministic engine. You write. You do not decide.",
        "Use only customers, messages, amounts, response codes, places, teams, and labels that appear in the facts.",
        "Do not add a deadline. Do not say a payment has been reversed, refunded, or recovered.",
        "When outstanding is \"Not a payment\", do not invent an amount.",
        "Tell a customer in a Systemic or Emerging problem that they do not need to send the complaint again.",
      ].join(" "),
      prompt: `Facts:\n${JSON.stringify(facts, null, 2)}`,
    });
    const output = result.output;
    if (!output) return fallback;
    const operatorNote = output.operatorNote.trim();
    const subject = output.subject.trim();
    const body = output.body.trim();
    if (![operatorNote, subject, body].every((part) => draftRespectsFacts(part, facts))) {
      console.error("Gemini draft fell back because it changed a figure or promised an outcome.");
      return fallback;
    }
    const draft: IncidentDraft = { operatorNote, subject, body, source: "gemini", facts };
    cache.set(cacheKey, draft);
    return draft;
  } catch (error) {
    const name = error instanceof Error ? error.name : "Error";
    const status = error && typeof error === "object" && "statusCode" in error ? (error as { statusCode?: number }).statusCode : undefined;
    console.error(`Gemini draft fell back (${name}${status ? ` ${status}` : ""}).`);
    return fallback;
  }
}
