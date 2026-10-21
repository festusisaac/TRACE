import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { Mark } from "@/components/mark";
import { openBook } from "@/lib/desk";
import { linkName, naira } from "@/lib/format.ts";

export const metadata = { title: "Customer cases · TRACE" };

async function CaseList() {
  await connection();
  const book = await openBook();
  const rows = book.cases.map((item) => {
    const messages = book.interactions.filter((interaction) => item.interactionIds.includes(interaction.id));
    const first = messages[0];
    const incident = book.incidents.find((entry) => entry.caseIds.includes(item.id));
    const amount = messages.find((message) => message.amount)?.amount;
    return { item, messages, first, incident, amount };
  });

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

      <div className="section-head">
        <h2>Customer case register</h2>
        <p>
          {rows.length} shown · {rows.length} in the book
        </p>
      </div>
      <div className="ledger-wrap">
        <table className="ledger">
          <thead>
            <tr>
              <th>Problem group</th>
              <th>Customer</th>
              <th>Contacts</th>
              <th>Payment / service evidence</th>
              <th>Case reading</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.item.id}>
                <td>{row.incident ? <Link href={`/incidents/${row.incident.id}`}>{row.incident.title}</Link> : "—"}</td>
                <td>
                  <Link href={`/cases/${row.item.id}`}>{row.item.customerRef}</Link>
                </td>
                <td>{row.messages.length}</td>
                <td>
                  {row.first ? linkName(row.first.link.status) : "—"}
                  <span className="cell-note">
                    {row.first?.rrn ?? ""}
                    {row.amount ? ` ${naira(row.amount)}` : ""}
                  </span>
                </td>
                <td>{row.incident ? <Mark label={row.incident.label} /> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
