# TRACE

TRACE is Triage and Root-cause Analysis of Customer Engagements. It is an operations desk for a bank’s complaints, payments, and service teams.

A complaint can arrive at a branch, by phone, by email, on social media, in the mobile app, or by USSD. TRACE reads every message the same way. It decides whether the complaint is about money or about a service, looks for a payment when one should exist, keeps repeated messages from the same customer as one case, and separates a wide problem from a single customer.

The figures on the screen are counts from the book. A language model does not invent them.

This build is the demonstration for Zenith Bank Zecathon 6.0, track “AI-Powered Transaction Investigation and Resolution” (live sprint 20–22 October 2026). The data is synthetic Nigerian banking data. TRACE does not connect to a core-banking system and does not copy Zenith’s logo or trademark styling.

## What has been built

| Piece | Where it lives | State |
| --- | --- | --- |
| Next.js application, TypeScript, Tailwind | `app/`, `package.json` | Done |
| SQLite book, Drizzle schema, local file `data/trace.db` | `db/` | Done |
| Investigation engine: normalise, classify, link, cluster, emergence, urgency | `lib/engine/` | Done, tested |
| Intake door and acknowledgement | `lib/intake.ts`, `app/api/` | Done |
| Demonstration book | `lib/seed/` | Done |
| Operations desk | `app/page.tsx` and the pages under `app/` | Done |
| Plain-language explanations | `lib/explain.ts`, `app/guide/page.tsx` | Done |
| Template operator note and customer reply | `lib/brief.ts` | Done |
| Gemini draft, with template fallback | `lib/draft.ts`, `POST /api/brief` | Done |

## Run the desk

Requirements: Node.js 24 and npm. The project folder is `TRACE V1`. The npm package name is `trace`, because an npm name cannot contain spaces or capitals.

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm run db:push` creates the tables. `npm run db:seed` wipes the book and loads the demonstration story. The first time the desk opens an empty database, it loads that same story by itself.

Copy `.env.example` to `.env.local` if the file is missing:

```
DATABASE_URL=file:data/trace.db
GEMINI_API_KEY=
```

`.env.local` and the database file are gitignored.

Check the engine without starting the server:

```bash
npm run test:engine
```

Five tests cover classification, normalisation, the judge story, acknowledgement, and the seeded book.

## The demonstration, in about three minutes

The seeded book, as of a clean `npm run db:seed`, holds **39 complaints**, **12 transactions**, and **37 cases**. Chioma’s three messages are one case, which is why there are two fewer cases than messages.

Start on **Overview**.

1. Two systemic problems lead the book. **NIP credit timeout** is 13 customers and 15 messages, ₦8,130,000 still outstanding, reported from Lagos and Abuja, including two complaints that quoted no retrieval reference and still stayed in the group. **Mobile app sign-in failure** is 12 customers locked out, with no naira attached. Beside them: **Wrong information at Ikeja** (6 customers, a branch process) and **POS settlement mismatch** on vendor Horizon (4 merchants, ₦256,500, emerging). The individual work is one wrong-beneficiary transfer and one rude-teller complaint.
2. Open the NIP incident. The page shows customers against a normal level of 2, the complaints that had no matching payment, and response code 97 on the payments that did match. Several messages can point at one payment, so the complaint count and the payment count differ. Chioma (CHI-2041) appears three times.
3. Open Chioma’s case. App, contact centre, and social are one file, one retrieval reference (`441200883311`), and one drafted reply.
4. Open **Take a complaint** and file the six messages in order. Social with no reference joins the NIP incident. Chioma’s phone call stays her existing case and matches RRN `441200883311`. The app sign-in joins the lockout. Ikeja joins the branch incident. The USSD settlement joins Horizon. The rude-teller email stays with that one customer. Filing a message again returns the original receipt.
5. On the NIP incident, **Accept for payments ops** records the team. Urgency drops, the incident is marked accepted, and a refresh keeps that acceptance. New messages about the same problem are answered from the incident.

`npm run db:seed` restores the clean book and clears acceptances.

## Pages

| Page | Path | What a person uses it for |
| --- | --- | --- |
| Overview | `/` | What needs a team, the naira outstanding, and the people caught in a service problem |
| Take a complaint | `/receive` | File a live message from any of the six channels and show the receipt |
| Incidents | `/incidents` | Every problem, including the ones that belong to one customer |
| Incident | `/incidents/[id]` | Evidence, messages, matched payments, and Accept |
| Customer cases | `/cases` | One customer and one problem, grouped under the incident they belong to |
| Case | `/cases/[id]` | Every message from that customer, and the reply drafted for the group |
| Work to do | `/queue` | Wider problems first, then complaints that match nobody else |
| Channels | `/channels` | Where messages arrived, and customers who used more than one door |
| How it works | `/guide` | The desk explained without assuming a technical reader |

The menu explains the three readings on every page:

- **Systemic.** The same problem, many customers, well above the usual level. Answer them together.
- **Emerging.** More than usual, not yet a network alarm.
- **Isolated.** One customer. Handle that person alone.

Urgency is a rank from 0 to 100. Higher means pick it up sooner. Accepting a problem subtracts 50 points, capped at 0, so the next problem can move up. 100 is the ceiling.

## How a complaint moves

Every channel posts the same JSON to `POST /api/intake`.

Required: `channel`, `receivedAt` (ISO time), `customerRef`, `text`, `sourceRef`.

Optional: `amount` (whole naira), `rrn`, `accountMask`, `beneficiary`, `location`.

`channel` is one of `branch`, `contact_centre`, `email`, `social`, `app`, `ussd`.

The door then does this, in order:

1. **Accept.** An incomplete payload is rejected with 400. A `sourceRef` already on the book returns the original receipt with `duplicate: true` and does not insert a second row.
2. **Normalise.** The raw text is kept. Missing amount, retrieval reference, account mask, beneficiary, location, and vendor are read from the text when the payload did not supply them. A supplied field wins over the text. A missing reference never drops the complaint.
3. **Classify** the domain before any lookup. Money words do not turn a service complaint into a payment.
4. **Attach** the message to the open case for the same customer and the same problem. The case id is `case-{customer}-{domain-and-type}`, so it is stable.
5. **Link.** A payment complaint looks for a transaction. A service complaint looks for a service request. Login failures and a rude-teller complaint are `not_applicable`: there is nothing to find. `unlinked` is used only for payments.
6. **Join** an open systemic or emerging incident, or leave the complaint on the individual queue.
7. **Return a receipt:** domain, complaint type, link status, case id, incident id or queued, and the label.

Accepting an incident is `POST /api/incidents/{id}/acknowledge` with `{ "owner": "payments ops" }`. Unknown ids return 404. A missing owner returns 400. The action is stored in `incident_actions`. Because the incident id is derived from the signature, the acceptance survives a recompute and a refresh.

On intake, the new row is inserted with the incident id and the answer-from-incident flag the engine just computed. Other rows are updated so a newly systemic group is marked together.

## The engine

`investigate()` in `lib/engine/investigate.ts` is a pure function. It does not read the database and it does not call a model. Page loads recompute clusters from the rows. Scores are not stored.

For each message the engine annotates, groups by signature, counts distinct customers inside the time window, labels the group, scores it, builds cases, and builds the individual queue from isolated groups that have not been accepted.

If no message in a signature falls inside the window, the engine counts every message of that signature. That keeps a demonstration readable if the clock moves. `asOf` defaults to the latest `receivedAt`.

### Signatures

A signature is the stable identity of a problem. The incident id is `inc-` plus a slug of that signature.

| Situation | Signature | Scope |
| --- | --- | --- |
| NIP credit timeout | `payment\|failed_nip\|nip` | network |
| Sign-in failure | `service\|authentication\|cannot_sign_in` | network |
| POS settlement for a vendor | `payment\|pos_settlement\|{vendor}` | vendor |
| Wrong beneficiary | `payment\|wrong_beneficiary\|{customer}` | customer |
| Charge dispute | `payment\|charge_dispute\|{customer}` | customer |
| Rude teller | `service\|branch_service\|staff_conduct\|{customer}` | customer |
| Wrong explanation at a branch | `service\|branch_service\|wrong_information\|{location}` | location |
| Other service failures | `service\|{journey}\|{failure mode}` | network |

Channel is not part of the sign-in signature, so an app report and a contact-centre report of the same lockout stay one incident. Response code is evidence, not part of the key, so an unlinked NIP complaint still joins the NIP incident. A rude teller at Ikeja does not join the Ikeja “wrong information” incident and does not join the sign-in incident.

### Classification

Rules are ordered. The text is lowercased. The first match wins. Service rules run before payment rules, so “told me the wrong thing” is not swallowed by the word “transfer”, and “I was debited and nobody at the branch will explain” stays a service complaint.

Order: staff conduct, wrong information, sign-in, OTP-for-sign-in, channel down, account opening, card delivery, loan silence, then wrong beneficiary, duplicate debit, POS settlement, card decline, delayed reversal, charge dispute, failed NIP.

If nothing matches and the text mentions money, the fallback is `failed_nip`. Otherwise the fallback is `wrong_information`.

### Linking a payment

1. If the complaint has a retrieval reference (RRN), only a transaction with that RRN matches. If the book has no such RRN, the complaint is `unlinked`. It is not matched to a different payment.
2. Without an RRN, TRACE looks in the same scheme family (`nip`, `pos`, or `card`), inside a window from 72 hours before the complaint to 15 minutes after it, at the same amount. Beneficiary or the last four digits of the account narrows the candidates when they agree. The closest in time wins.

Amounts are whole naira. The same payment is counted once in “money outstanding”, even when three messages point at it. An unlinked payment complaint adds the amount the customer named.

A service-only group always has ₦0, even if the text mentions an amount. The seeded sign-in complaint that also says ₦20,000 is stuck still contributes nothing to naira exposure.

### Linking a service

Login, staff conduct, and wrong information have no service-request kind, so they are `not_applicable`. The seed contains no `service_requests` rows, which is deliberate: the sign-in incident stays “not a payment”.

Where a kind exists (card, onboarding, loan, channel incident), TRACE uses a reference quoted in the text, otherwise the customer’s latest request of that kind.

### Emergence

`observed` is distinct customers. `ratio` is `observed / max(baseline, 1)`.

| Scope | Systemic | Emerging | Otherwise |
| --- | --- | --- | --- |
| Customer, or observed ≤ 1 | — | — | Isolated |
| Location | observed ≥ 5 and ratio ≥ 2 | observed ≥ 3 and ratio ≥ 1.5 | Isolated |
| Network or vendor | observed ≥ 8 and ratio ≥ 2 | observed ≥ 3 and ratio ≥ 2 | Isolated |

The default baseline is 1 and the default window is 90 minutes. The seeded baselines use a 720-minute window so the story still holds on pitch day:

| Signature | Normal count |
| --- | --- |
| `payment\|failed_nip\|nip` | 2 |
| `service\|authentication\|cannot_sign_in` | 1 |
| `payment\|pos_settlement\|horizon` | 1 |
| `service\|branch_service\|wrong_information\|ikeja` | 1 |

### Urgency

The parts are added and then clamped to 0–100.

| Part | Points |
| --- | --- |
| Spread | Systemic 36, emerging 16, isolated 4 |
| Customers | Distinct customers, capped at 20, times 2 for a payment and times 3 for a service |
| Value in flight | Payments only: `min(25, round(log10(value + 1) × 6))` |
| Time blocked | Services only: minutes between first and latest report, divided by 15, capped at 20 |
| Repeat contacts | Services only: extra messages beyond one per customer, times 2, capped at 12 |
| Reputation | 8 if a payment is already on social, 10 if a service is |
| Channels | 6 when three or more channels are reporting it |
| Accepted | −50 once an owner has accepted the incident |

### Who owns the reply

| Complaint | Team |
| --- | --- |
| Failed NIP, delayed reversal, duplicate debit, POS settlement | payments ops |
| Card decline | cards |
| Wrong beneficiary | contact centre |
| Charge dispute | fraud |
| Sign-in or channel down | digital channels |
| Account opening | onboarding |
| Card delivery | card fulfilment |
| Loan silence | credit |
| Staff conduct, wrong information | branch service |

Anything else falls to the contact centre.

## The seeded story

`lib/seed/story.ts` builds the book relative to “now” when seeded from the command, and relative to a fixed clock in tests (`2026-10-21T09:00:00.000Z`).

| People | What they show |
| --- | --- |
| CHI-2041, three channels, RRN `441200883311`, ₦850,000, Lagos | One customer, one case, one payment, response 97 |
| NIP-1101 Abuja ₦475,000 and NIP-1102 Lagos ₦890,000 | No RRN, still inside the NIP incident |
| NIP-1001 to NIP-1010 | Ten linked NIP customers, Lagos and Abuja, mixed channels, response 97 |
| LOG-1 to LOG-12 | Cannot sign in. LOG-4 also mentions ₦20,000. Value stays 0. Link status is not a payment |
| MER-301 to MER-304, vendor Horizon | POS settlement, emerging, ₦42,000 + ₦68,000 + ₦110,000 + ₦36,500 |
| BEN-1180, RRN `441200883901`, ₦250,000 | Wrong beneficiary. The payment succeeded (response 00). Isolated, but linked |
| STF-3304, Ikeja | A rude teller. Isolated. Not the Ikeja information incident and not the sign-in incident |
| BR-1 to BR-6, Ikeja | “Told me the wrong thing.” Systemic at one branch, not a network fault |

## Data

SQLite, file `data/trace.db`, through Drizzle ORM and `@libsql/client`. `drizzle.config.ts` uses the Turso dialect with a `file:` URL, which is how Drizzle Kit talks to a local libSQL file on Windows without a native compile.

The tables are ordinary SQL. Moving later to Postgres is a driver change, not a redesign. The line for a pitch: these tables sit on Postgres when the desk is connected to bank feeds. Postgres was not used for the hall build because it needs a running server.

| Table | Holds |
| --- | --- |
| `interactions` | One message. Unique `source_ref`. Optional case, incident id, and answer-from-incident flag |
| `cases` | One customer and one problem |
| `transactions` | Payments the linker can match. Amounts are integers, in naira |
| `service_requests` | Card, onboarding, loan, or channel-incident requests. Empty in the seed |
| `baselines` | Normal customer count and window for a signature |
| `incident_actions` | `acknowledge`, with the owner and the time |

`readyDatabase()` turns foreign keys on once per process. `lib/seed/apply.ts` does not import `db/client.ts`, because that module is `server-only` and the seed script runs under plain Node. The script opens its own client.

## Language model

`POST /api/brief` takes an incident id, loads that incident from the book, and asks Gemini Flash to write the operator note and the customer reply. The request body cannot supply counts or amounts. The model sees only the fact packet: customers, messages, naira, response code, label, places, suggested team, and the engine’s evidence lines.

`lib/brief.ts` remains the fallback. A missing `GEMINI_API_KEY`, a failed call, or a draft that introduces a figure or says the money has already been returned is discarded. The screen then shows the template. The figures elsewhere on the page are still the engine’s figures. The incident and case pages call the same function, so the note the judge reads is the note the route returns.

## Repository map

```
app/                  pages and the two POST routes
components/           menu, status mark, incident card, receive, accept
db/schema.ts          tables
db/client.ts          server-only SQLite client
lib/engine/           pure investigation
lib/intake.ts         load, receive, acknowledge
lib/seed/             demonstration story and the reset
lib/brief.ts          template note and customer reply
lib/explain.ts        plain-language sentences for the desk
lib/format.ts         naira, Lagos time, names
scripts/seed.ts       npm run db:seed
```

`next.config.ts` sets `cacheComponents` and `partialPrefetching`, and marks `@libsql/client` as a server external. Pages that read the clock, the database, or the URL do that inside `<Suspense>`, which is what this version of Next.js requires so a route can still prerender a shell. Dynamic route `params` are a Promise and are awaited inside the suspended child.

The desk is a light operations book: navy header, paper background, IBM Plex Sans and IBM Plex Mono, hairline tables, and red, amber, and green only for Systemic, Emerging, and Isolated.

## What is deliberately out of scope

- No login, no roles, no audit beyond the acknowledgement row.
- No real customer data and no core-banking connection.
- No Zenith wordmark.
- `npm audit` reported high findings in the Next.js scaffold. They were left as-is. `audit fix --force` would be a breaking upgrade and was not run.
