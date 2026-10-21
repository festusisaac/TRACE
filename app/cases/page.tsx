import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { CaseRegister, type SerializedCaseRow } from "@/components/case-register";
import { Mark } from "@/components/mark";
import { openBook } from "@/lib/desk";
import { linkName, naira } from "@/lib/format.ts";

export const metadata = { title: "Customer cases · TRACE" };

async function CaseList() {
  await connection();
  const book = await openBook();
  const rows = book.cases.map((item) => {
    const messages = book.interactions
      .filter((interaction) => item.interactionIds.includes(interaction.id))
      .sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt));
    const latest = messages[0];
    const incident = book.incidents.find((entry) => entry.caseIds.includes(item.id));
    const amount = messages.find((message) => message.amount)?.amount;
    return { item, messages, first: latest, incident, amount };
  });

  rows.sort((a, b) => {
    const aTime = Math.max(
      ...a.messages.map((m) => Date.parse(m.receivedAt) || 0),
      Date.parse(a.item.openedAt) || 0,
    );
    const bTime = Math.max(
      ...b.messages.map((m) => Date.parse(m.receivedAt) || 0),
      Date.parse(b.item.openedAt) || 0,
    );
    return bTime - aTime;
  });

  const serializedRows: SerializedCaseRow[] = rows.map((row) => ({
    id: row.item.id,
    customerRef: row.item.customerRef,
    openedAt: row.item.openedAt,
    status: row.item.status,
    contactCount: row.messages.length,
    channels: [...new Set(row.messages.map((m) => m.channel))],
    amount: row.amount ?? null,
    rrn: row.first?.rrn ?? null,
    linkStatus: row.first?.link.status ?? "not_applicable",
    incident: row.incident
      ? {
          id: row.incident.id,
          title: row.incident.title,
          label: row.incident.label,
        }
      : null,
    snippets: row.messages.map((m) => m.text),
  }));

  return (
    <>
      <header className="intro">
        <p className="eyebrow">Operations book / Customer cases</p>
        <div className="intro-row">
          <h1>Customer cases</h1>
          <Link className="button primary" href="/receive">
            Take a complaint +
          </Link>
        </div>
        <p className="deck">One customer and one problem is one case. A new contact adds evidence to the case, not another customer or another payment.</p>
      </header>

      <section className="stat-row three">
        <div className="stat">
          <strong>{book.cases.length}</strong>
          <span>Customer cases</span>
          <em>Grouped under the problems on the book</em>
        </div>
        <div className="stat">
          <strong>{book.interactions.length}</strong>
          <span>Complaint messages</span>
          <em>Contacts retained with their original channels</em>
        </div>
        <div className="stat">
          <strong>{rows.filter((row) => row.messages.length > 1).length}</strong>
          <span>Cases with more than one contact</span>
          <em>Repeated messages stay one case</em>
        </div>
      </section>

      <div className="section-head">
        <h2>Cases by problem</h2>
        <p>Full book</p>
      </div>
      <div className="count-pills">
        {book.incidents.map((incident) => (
          <Link key={incident.id} href={`/incidents/${incident.id}`}>
            <strong>{incident.customers}</strong>
            <span>{incident.title}</span>
          </Link>
        ))}
      </div>

      <CaseRegister rows={serializedRows} />

      <p className="deck" style={{ marginTop: 16 }}>
        “Not a payment” is a service complaint. “No reference” is a payment complaint without a matching transaction. The customer is still kept.
      </p>
    </>
  );
}

export default function CasesPage() {
  return (
    <Suspense fallback={<p className="deck">Opening customer cases…</p>}>
      <CaseList />
    </Suspense>
  );
}
