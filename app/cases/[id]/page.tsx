import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { Mark } from "@/components/mark";
import { db } from "@/db/client";
import { transactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { draftIncident } from "@/lib/draft";
import { openBook } from "@/lib/desk";
import { channelName, lagosTime, linkName, naira } from "@/lib/format.ts";

export const metadata = { title: "Case · TRACE" };

async function CaseFile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connection();
  const book = await openBook();
  const item = book.cases.find((entry) => entry.id === id);
  if (!item) notFound();

  const messages = book.interactions
    .filter((interaction) => item.interactionIds.includes(interaction.id))
    .sort((left, right) => Date.parse(left.receivedAt) - Date.parse(right.receivedAt));
  const first = messages[0];
  if (!first) notFound();
  const incident = book.incidents.find((entry) => entry.caseIds.includes(item.id));
  const draft = incident ? await draftIncident(incident) : null;
  const payment = first.link.targetId ? await db.select().from(transactions).where(eq(transactions.id, first.link.targetId)) : [];
  const linked = payment[0];

  return (
    <>
      <p className="crumb">
        <Link href="/cases">Customer cases</Link>
        {" / "}
        {item.customerRef}
      </p>
      <header className="intro">
        <div className="intro-row">
          <h1>
            {item.customerRef}
          </h1>
          {incident ? (
            <Link className="button primary" href={`/incidents/${incident.id}`}>
              Open incident →
            </Link>
          ) : null}
        </div>
        <p className="deck">
          {messages.length === 1
            ? "One contact about this problem."
            : `${messages.length} contacts about one problem. Preserve the journey without counting the same matter ${messages.length} times.`}
        </p>
      </header>

      <div className="card-top" style={{ marginBottom: 18 }}>
        <span>
          {incident ? <Mark label={incident.label} /> : null}{" "}
          <span className="meta">
            {first.location ?? "Location not given"}
            {incident ? ` · ${incident.title}` : ""}
          </span>
        </span>
        <span className="meta">{item.status === "answered" ? "Answer with the group" : "Case not yet accepted"}</span>
      </div>

      <section className="stat-row">
        <div className="stat">
          <strong>{messages.length}</strong>
          <span>Contacts</span>
          <em>{[...new Set(messages.map((message) => channelName(message.channel)))].join(" · ")}</em>
        </div>
        <div className="stat">
          <strong>1</strong>
          <span>Customer case</span>
          <em>Same customer · same problem</em>
        </div>
        <div className="stat">
          <strong>{linked ? 1 : 0}</strong>
          <span>Linked payment</span>
          <em>{linkName(first.link.status)}</em>
        </div>
        <div className="stat">
          <strong className="words">{first.amount ? naira(first.amount) : "None"}</strong>
          <span>Amount named</span>
          <em>{first.classification.domain === "payment" ? "What the customer said was moved" : "This case is not about money"}</em>
        </div>
      </section>

      <div className="split">
        <section>
          <div className="section-head">
            <h2>Contacts, in order</h2>
            <p>Original wording</p>
          </div>
          <ol className="timeline">
            {messages.map((message, index) => (
              <li key={message.id}>
                <div className="when">
                  {index === 0 ? "First contact" : index === messages.length - 1 && messages.length > 1 ? "Latest contact" : "Follow-up"}
                  <span className="channel">
                    {channelName(message.channel)} · {lagosTime(message.receivedAt)}
                  </span>
                </div>
                <div>
                  <blockquote className="quote">{message.text}</blockquote>
                  <p className="cell-note">{message.location ?? "Location not given"}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <aside className="side-stack">
          <article className="side-card">
            <p className="aside-label">Linked payment</p>
            <h3 style={{ marginTop: 8, fontSize: 18 }}>{first.rrn ?? "No reference quoted"}</h3>
            <p>
              {linked
                ? `${naira(linked.amount)} · response ${linked.responseCode ?? "—"} · ${linked.status}`
                : linkName(first.link.status)}
            </p>
          </article>
          {incident ? (
            <article className="side-card">
              <p className="aside-label">Part of a wider problem</p>
              <div style={{ marginTop: 10 }}>
                <Mark label={incident.label} />
              </div>
              <h3 style={{ marginTop: 10, fontSize: 20 }}>
                <Link href={`/incidents/${incident.id}`}>{incident.title}</Link>
              </h3>
              <p>
                {incident.customers} customers · {incident.interactionCount} messages · {incident.owner}
              </p>
            </article>
          ) : null}
          {draft ? (
            <article className="side-card">
              <p className="aside-label">Group response · draft</p>
              <h3 style={{ marginTop: 8, fontSize: 18 }}>{draft.subject}</h3>
              <p>{draft.body}</p>
              <p className="cell-note" style={{ marginTop: 10 }}>
                {draft.source === "gemini" ? "Gemini draft · figures stayed with the engine." : "Desk template."} No response sent.
              </p>
            </article>
          ) : null}
        </aside>
      </div>
    </>
  );
}

export default function CasePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="deck">Opening the case…</p>}>
      <CaseFile params={params} />
    </Suspense>
  );
}
