import { readyDatabase, db } from "@/db/client";
import { cases, interactions, transactions } from "@/db/schema";
import { openBook } from "@/lib/desk";
import { channelName, naira } from "@/lib/format.ts";

export type SearchResultItem = {
  id: string;
  category: "case" | "incident" | "regulation" | "navigation";
  title: string;
  subtitle: string;
  badge?: string;
  url: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  await readyDatabase();
  const book = await openBook();

  const results: SearchResultItem[] = [];

  // Quick navigation items
  const navItems: SearchResultItem[] = [
    {
      id: "nav-overview",
      category: "navigation",
      title: "Overview Dashboard",
      subtitle: "Executive health, portfolio counts, and live metrics",
      url: "/",
    },
    {
      id: "nav-intake",
      category: "navigation",
      title: "Take a Complaint (Intake Desk)",
      subtitle: "Log new customer complaints across 6 omni-channels",
      url: "/receive",
    },
    {
      id: "nav-incidents",
      category: "navigation",
      title: "Incidents Matrix",
      subtitle: "Systemic and emerging cluster investigations",
      url: "/incidents",
    },
    {
      id: "nav-cases",
      category: "navigation",
      title: "Customer Cases Register",
      subtitle: "Individual customer journeys and problem groupings",
      url: "/cases",
    },
    {
      id: "nav-queue",
      category: "navigation",
      title: "Work To Do (Priority Queue)",
      subtitle: "Triage isolated complaints and accepted problem groups",
      url: "/queue",
    },
    {
      id: "nav-advisories",
      category: "navigation",
      title: "Customer Advisories",
      subtitle: "In-app mobile banking notices and deflection rules",
      url: "/advisories",
    },
    {
      id: "nav-channels",
      category: "navigation",
      title: "Channels Analysis",
      subtitle: "Traffic distribution across App, USSD, POS, Branch",
      url: "/channels",
    },
    {
      id: "nav-guide",
      category: "navigation",
      title: "System Guide & Status Key",
      subtitle: "Definitions for Systemic, Emerging, and Isolated signals",
      url: "/guide",
    },
  ];

  // Regulatory reference items
  const regItems: SearchResultItem[] = [
    {
      id: "reg-nip",
      category: "regulation",
      title: "CBN 24h SLA — Instant (NIP) Electronic Funds Transfers",
      subtitle: "Max 24 hours resolution for failed transfers · ₦10,000 daily fine per breach",
      badge: "24h SLA",
      url: "/incidents/inc-payment-failed-nip-nip",
    },
    {
      id: "reg-pos",
      category: "regulation",
      title: "CBN 48h SLA — POS Settlement & Card Processing",
      subtitle: "Max 48 hours resolution for card debits and failed POS transactions",
      badge: "48h SLA",
      url: "/incidents/inc-payment-pos-settlement-pos",
    },
    {
      id: "reg-service",
      category: "regulation",
      title: "CBN 72h SLA — Consumer Protection Non-Financial Grievances",
      subtitle: "General branch, onboarding, and app service grievances resolution timeline",
      badge: "72h SLA",
      url: "/incidents",
    },
  ];

  if (!q) {
    // Return recent cases, active incidents, and navigation
    const topIncidents = book.incidents.slice(0, 3).map((inc) => ({
      id: inc.id,
      category: "incident" as const,
      title: inc.title,
      subtitle: `${inc.customers} customers · ${inc.owner} · ${inc.label.toUpperCase()}`,
      badge: inc.label,
      url: `/incidents/${inc.id}`,
    }));

    const topCases = book.cases.slice(0, 4).map((c) => {
      const msgs = book.interactions.filter((i) => c.interactionIds.includes(i.id));
      const first = msgs[0];
      return {
        id: c.id,
        category: "case" as const,
        title: `Customer ${c.customerRef}`,
        subtitle: `${msgs.length} contact(s) · ${first ? channelName(first.channel) : "direct"}${first?.amount ? ` · ${naira(first.amount)}` : ""}`,
        badge: c.status,
        url: `/cases/${c.id}`,
      };
    });

    return Response.json(
      {
        query: "",
        results: [...topIncidents, ...topCases, ...navItems.slice(0, 3), ...regItems.slice(0, 2)],
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  }

  // Filter navigation
  for (const item of navItems) {
    if (item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q)) {
      results.push(item);
    }
  }

  // Filter regulations
  for (const item of regItems) {
    if (
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      q.includes("cbn") ||
      q.includes("sla") ||
      q.includes("fine")
    ) {
      results.push(item);
    }
  }

  // Filter incidents
  for (const inc of book.incidents) {
    if (
      inc.title.toLowerCase().includes(q) ||
      inc.id.toLowerCase().includes(q) ||
      inc.owner.toLowerCase().includes(q) ||
      inc.label.toLowerCase().includes(q) ||
      inc.evidence.some((e) => e.toLowerCase().includes(q))
    ) {
      results.push({
        id: inc.id,
        category: "incident",
        title: inc.title,
        subtitle: `${inc.customers} customers · ${inc.owner} · ${inc.label.toUpperCase()}`,
        badge: inc.label,
        url: `/incidents/${inc.id}`,
      });
    }
  }

  // Filter cases & interactions
  for (const c of book.cases) {
    const msgs = book.interactions.filter((i) => c.interactionIds.includes(i.id));
    const first = msgs[0];
    const customerMatch = c.customerRef.toLowerCase().includes(q);
    const caseIdMatch = c.id.toLowerCase().includes(q);
    const rrnMatch = msgs.some((m) => m.rrn?.toLowerCase().includes(q));
    const amountMatch = msgs.some(
      (m) => m.amount && (String(m.amount).includes(q) || naira(m.amount).toLowerCase().includes(q)),
    );
    const textMatch = msgs.some((m) => m.text.toLowerCase().includes(q));

    if (customerMatch || caseIdMatch || rrnMatch || amountMatch || textMatch) {
      const matchingSnippet = msgs.find((m) => m.text.toLowerCase().includes(q))?.text ?? msgs[0]?.text ?? "";
      results.push({
        id: c.id,
        category: "case",
        title: `Customer ${c.customerRef}`,
        subtitle: `“${matchingSnippet.slice(0, 90)}${matchingSnippet.length > 90 ? "…" : ""}”`,
        badge: first?.amount ? naira(first.amount) : "Case",
        url: `/cases/${c.id}`,
      });
    }
  }

  return Response.json(
    { query: q, results: results.slice(0, 15) },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
