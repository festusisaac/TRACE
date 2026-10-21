import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { openBook } from "@/lib/desk";
import { channelMeaning } from "@/lib/explain.ts";
import { channelName } from "@/lib/format.ts";
import { channels } from "@/lib/engine/types.ts";

export const metadata = { title: "Channels · TRACE" };

async function Channels() {
  await connection();
  const book = await openBook();
  const repeated = book.cases
    .map((item) => {
      const messages = book.interactions.filter((interaction) => item.interactionIds.includes(interaction.id));
      return { item, messages };
    })
    .filter((row) => row.messages.length > 1)
    .sort((left, right) => right.messages.length - left.messages.length)[0];

  return (
    <>
      <header className="intro">
        <p className="eyebrow">Operations book / Channels</p>
        <div className="intro-row">
          <h1>Six doors. One complaints book.</h1>
          <Link className="button primary" href="/receive">
            Take a complaint +
          </Link>
        </div>
        <p className="deck">Customers may use more than one channel. A channel change does not split the same customer problem into a new case.</p>
      </header>

      <section className="panel-card" style={{ marginBottom: 28 }}>
        <div className="stat-row three" style={{ margin: 0 }}>
          <div className="stat">
            <strong>{book.interactions.length} messages</strong>
            <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 13 }}>Across the demonstration book</span>
          </div>
          <div className="stat">
            <strong>{book.cases.length} cases</strong>
            <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 13 }}>Repeated contacts stay one case</span>
          </div>
          <div className="stat">
            <span style={{ fontWeight: 400 }}>All six intake channels use the same door. A missing reference never drops the complaint.</span>
          </div>
        </div>
      </section>

      <div className="section-head">
        <h2>Channel coverage</h2>
        <p>Every door uses the same intake</p>
      </div>
      <div className="card-grid three">
        {channels.map((channel) => (
            <article className="panel-card" key={channel}>
              <h3>{channelName(channel)}</h3>
              <p style={{ marginTop: 10 }}>{channelMeaning(channel)}</p>
              <p style={{ marginTop: 14 }}>
                <Link className="quiet-link" href="/receive">
                  Use shared intake →
                </Link>
              </p>
            </article>
        ))}
      </div>

      {repeated ? (
        <section>
          <div className="section-head">
            <h2>{repeated.item.customerRef} came through more than one door</h2>
            <p>Known cross-channel journey</p>
          </div>
          <div className="card-grid three">
            {repeated.messages.map((message, index) => (
              <article key={message.id}>
                <p className="aside-label">
                  {String(index + 1).padStart(2, "0")} / {channelName(message.channel)}
                </p>
                <p style={{ marginTop: 8, color: "var(--ink)" }}>{message.text}</p>
              </article>
            ))}
          </div>
          <div className="banner">
            <div>
              <strong>
                {repeated.item.customerRef} / one case
              </strong>
              <p>
                {repeated.messages.length} messages · one customer problem
              </p>
            </div>
            <Link href={`/cases/${repeated.item.id}`}>Open the case →</Link>
          </div>
        </section>
      ) : null}

      <section className="note" style={{ marginTop: 22 }}>
        <strong>One contract for every source</strong>
        <p>Required: channel, received time, customer reference, message text and source reference. Reusing a source reference returns the original receipt, without duplicating the message.</p>
      </section>
    </>
  );
}

export default function ChannelsPage() {
  return (
    <Suspense fallback={<p className="deck">Opening channels…</p>}>
      <Channels />
    </Suspense>
  );
}
