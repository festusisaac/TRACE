"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { demoComplaints, type DemoComplaint } from "@/lib/demo-intake.ts";
import { channels, type Channel } from "@/lib/engine/types.ts";
import { channelName, complaintName, dispositionName, linkName, naira } from "@/lib/format.ts";
import type { IntakeReceipt } from "@/lib/intake";

type Filed = IntakeReceipt & { error?: string };

type FormState = {
  channel: Channel;
  customerRef: string;
  sourceRef: string;
  text: string;
  amount: string;
  rrn: string;
  accountMask: string;
  beneficiary: string;
  location: string;
};

const emptyForm: FormState = {
  channel: "contact_centre",
  customerRef: "",
  sourceRef: "",
  text: "",
  amount: "",
  rrn: "",
  accountMask: "",
  beneficiary: "",
  location: "",
};

function matchingExample(form: FormState) {
  return demoComplaints.find(
    (complaint) =>
      complaint.channel === form.channel &&
      complaint.customerRef === form.customerRef.trim() &&
      complaint.text === form.text.trim() &&
      (complaint.amount ? String(complaint.amount) === form.amount.trim() : form.amount.trim() === "") &&
      (complaint.rrn ?? "") === form.rrn.trim() &&
      (complaint.location ?? "") === form.location.trim(),
  );
}

export function IntakeDesk() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slip, setSlip] = useState<Filed | null>(null);

  function fill(complaint: DemoComplaint) {
    setForm({
      channel: complaint.channel,
      customerRef: complaint.customerRef,
      sourceRef: complaint.sourceRef,
      text: complaint.text,
      amount: complaint.amount ? String(complaint.amount) : "",
      rrn: complaint.rrn ?? "",
      accountMask: "",
      beneficiary: "",
      location: complaint.location ?? "",
    });
    setError(null);
    setSlip(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const example = matchingExample(form);
    const amount = form.amount.trim() === "" ? null : Number(form.amount);
    try {
      const response = await fetch("/api/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channel: form.channel,
          customerRef: form.customerRef.trim(),
          text: form.text.trim(),
          sourceRef: example?.sourceRef ?? (form.sourceRef.trim() || `desk-${crypto.randomUUID()}`),
          amount,
          rrn: form.rrn.trim() || null,
          accountMask: form.accountMask.trim() || null,
          beneficiary: form.beneficiary.trim() || null,
          location: form.location.trim() || null,
          receivedAt: new Date().toISOString(),
        }),
      });
      const filed = (await response.json()) as Filed;
      if (!response.ok) {
        setError(filed.error ?? "Intake did not accept the complaint.");
        return;
      }
      setSlip(filed);
      router.refresh();
    } catch {
      setError("Intake could not be reached.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="split">
      <form onSubmit={submit}>
        <div className="form-grid">
          <label className="field-label">
            Channel
            <select className="field" value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value as Channel })}>
              {channels.map((channel) => (
                <option key={channel} value={channel}>
                  {channelName(channel)}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Customer reference
            <input className="field" value={form.customerRef} onChange={(event) => setForm({ ...form, customerRef: event.target.value })} required />
          </label>
          <label className="field-label">
            Source reference
            <input className="field" value={form.sourceRef} onChange={(event) => setForm({ ...form, sourceRef: event.target.value })} placeholder="Generated if left blank" />
          </label>
          <label className="field-label">
            Amount in naira
            <input className="field" inputMode="numeric" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
          </label>
          <label className="field-label span-2">
            Message
            <textarea className="field" value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} required />
          </label>
          <label className="field-label">
            Retrieval reference
            <input className="field" value={form.rrn} onChange={(event) => setForm({ ...form, rrn: event.target.value })} />
          </label>
          <label className="field-label">
            Location
            <input className="field" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
          </label>
          <label className="field-label">
            Account mask
            <input className="field" value={form.accountMask} onChange={(event) => setForm({ ...form, accountMask: event.target.value })} />
          </label>
          <label className="field-label">
            Beneficiary
            <input className="field" value={form.beneficiary} onChange={(event) => setForm({ ...form, beneficiary: event.target.value })} />
          </label>
        </div>
        <div className="card-foot">
          <button className="button primary" type="submit" disabled={pending}>
            {pending ? "Filing…" : "Submit complaint"}
          </button>
          <button
            className="button"
            type="button"
            onClick={() => {
              setForm(emptyForm);
              setSlip(null);
              setError(null);
            }}
          >
            Clear form
          </button>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
      </form>

      <aside className="side-stack">
        {slip && !slip.error ? (
          <article className="side-card slip">
            <p className="aside-label">{slip.duplicate ? "Already on the book" : "Receipt"}</p>
            <h3 style={{ marginTop: 8, fontSize: 20 }}>{slip.duplicate ? "This source reference was already filed" : "What TRACE did with it"}</h3>
            <dl>
              <div>
                <dt>Result</dt>
                <dd>{dispositionName(slip.disposition)}</dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd>{linkName(slip.linkStatus)}</dd>
              </div>
              <div>
                <dt>Read as</dt>
                <dd>
                  {slip.domain === "payment" ? "A payment" : "A service"} · {complaintName(slip.complaintType)}
                </dd>
              </div>
            </dl>
            <p className="slip-links">
              <Link className="quiet-link" href={`/cases/${slip.caseId}`}>
                Open case
              </Link>
              {slip.incidentId ? (
                <Link className="quiet-link" href={`/incidents/${slip.incidentId}`}>
                  Open incident
                </Link>
              ) : (
                <span>Left on the individual list</span>
              )}
            </p>
          </article>
        ) : (
          <article className="side-card">
            <p className="aside-label">Example receipt</p>
            <h3 style={{ marginTop: 8, fontSize: 20 }}>Before you file</h3>
            <p>A filed message returns a receipt: payment or service, whether a payment was found, the case, and the incident or the individual list.</p>
            <p style={{ marginTop: 10 }}>Chioma’s call, for example, stays her existing case and finds payment 441200883311.</p>
          </article>
        )}
        <article className="note">
          <strong>Same source reference, same message</strong>
          <p>Filing an example twice returns the original receipt. A missing payment reference does not drop the complaint.</p>
        </article>
      </aside>

      <section className="span-2" style={{ gridColumn: "1 / -1" }}>
        <div className="section-head">
          <h2>Load a prepared message</h2>
          <p>Six examples</p>
        </div>
        <div className="example-grid">
          {demoComplaints.map((complaint) => (
            <article className="example" key={complaint.id}>
              <p className="aside-label">
                {complaint.step} · {channelName(complaint.channel)}
              </p>
              <h3>{complaint.title}</h3>
              <p style={{ marginTop: 8 }}>{complaint.text}</p>
              <p className="cell-note" style={{ marginTop: 8 }}>
                {complaint.customerRef}
                {complaint.location ? ` · ${complaint.location}` : ""}
                {complaint.amount ? ` · ${naira(complaint.amount)}` : ""}
                {complaint.rrn ? ` · ${complaint.rrn}` : ""}
              </p>
              <p className="cell-note">{complaint.expect}</p>
              <p style={{ marginTop: 12 }}>
                <button className="quiet-link" type="button" onClick={() => fill(complaint)} style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }}>
                  Use example →
                </button>
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
