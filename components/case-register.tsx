"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Mark } from "@/components/mark";
import { SearchIcon, XCloseIcon } from "@/components/icons";
import { channelName, linkName, naira } from "@/lib/format.ts";
import type { EmergenceLabel } from "@/lib/engine/types.ts";

export type SerializedCaseRow = {
  id: string;
  customerRef: string;
  openedAt: string;
  status: string;
  contactCount: number;
  channels: string[];
  amount: number | null;
  rrn: string | null;
  linkStatus: string;
  incident: {
    id: string;
    title: string;
    label: EmergenceLabel;
  } | null;
  snippets: string[];
};

export function CaseRegister({ rows }: { rows: SerializedCaseRow[] }) {
  const [query, setQuery] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [selectedLabel, setSelectedLabel] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      // Channel filter
      if (selectedChannel !== "all" && !row.channels.includes(selectedChannel)) {
        return false;
      }
      // Label filter
      if (selectedLabel !== "all") {
        if (!row.incident || row.incident.label !== selectedLabel) {
          return false;
        }
      }
      // Text / keyword search
      if (!q) return true;

      const customerMatch = row.customerRef.toLowerCase().includes(q);
      const caseIdMatch = row.id.toLowerCase().includes(q);
      const rrnMatch = row.rrn ? row.rrn.toLowerCase().includes(q) : false;
      const incidentMatch = row.incident ? row.incident.title.toLowerCase().includes(q) : false;
      const amountMatch = row.amount ? String(row.amount).includes(q) || naira(row.amount).toLowerCase().includes(q) : false;
      const snippetMatch = row.snippets.some((s) => s.toLowerCase().includes(q));

      return customerMatch || caseIdMatch || rrnMatch || incidentMatch || amountMatch || snippetMatch;
    });
  }, [rows, query, selectedChannel, selectedLabel]);

  const hasActiveFilters = query.trim() !== "" || selectedChannel !== "all" || selectedLabel !== "all";

  const clearAllFilters = () => {
    setQuery("");
    setSelectedChannel("all");
    setSelectedLabel("all");
  };

  return (
    <div>
      {/* Search & Filter Toolbar */}
      <div
        style={{
          background: "var(--white)",
          border: "1px solid var(--line)",
          borderRadius: 6,
          padding: "12px 14px",
          marginBottom: 16,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 320px", position: "relative" }}>
          <div style={{ color: "var(--muted)", display: "flex", alignItems: "center", position: "absolute", left: 10 }}>
            <SearchIcon size={16} />
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by customer (e.g. CRM-010), RRN, amount, incident, or message words..."
            style={{
              width: "100%",
              padding: "7px 32px 7px 34px",
              fontSize: 13,
              borderRadius: 4,
              border: "1px solid var(--line)",
              outline: "none",
              background: "var(--band)",
              color: "var(--ink)",
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              style={{
                position: "absolute",
                right: 8,
                background: "transparent",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                padding: 4,
                display: "flex",
                alignItems: "center",
              }}
              title="Clear search"
            >
              <XCloseIcon size={14} />
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Channel dropdown */}
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            style={{
              padding: "6px 10px",
              fontSize: 12,
              borderRadius: 4,
              border: "1px solid var(--line)",
              background: "var(--white)",
              color: "var(--ink)",
              cursor: "pointer",
            }}
          >
            <option value="all">All Channels</option>
            <option value="app">Mobile App</option>
            <option value="ussd">USSD</option>
            <option value="contact_centre">Contact Centre</option>
            <option value="branch">Branch</option>
            <option value="social">Social Media</option>
            <option value="email">Email</option>
          </select>

          {/* Classification dropdown */}
          <select
            value={selectedLabel}
            onChange={(e) => setSelectedLabel(e.target.value)}
            style={{
              padding: "6px 10px",
              fontSize: 12,
              borderRadius: 4,
              border: "1px solid var(--line)",
              background: "var(--white)",
              color: "var(--ink)",
              cursor: "pointer",
            }}
          >
            <option value="all">All Classifications</option>
            <option value="systemic">Systemic</option>
            <option value="emerging">Emerging</option>
            <option value="isolated">Isolated</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className="quiet-link"
              onClick={clearAllFilters}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                color: "var(--systemic)",
                fontWeight: 600,
                padding: "4px 8px",
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="section-head" style={{ marginBottom: 10 }}>
        <h2>Customer case register</h2>
        <p>
          {filtered.length} shown {filtered.length !== rows.length ? `(filtered from ${rows.length})` : `· ${rows.length} in the book`}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            background: "var(--white)",
            border: "1px solid var(--line)",
            borderRadius: 6,
            padding: "36px 20px",
            textAlign: "center",
          }}
        >
          <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>
            No customer cases matched your search
          </p>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--muted)" }}>
            Try adjusting your search terms or clearing the active filters.
          </p>
          <button type="button" className="button" onClick={clearAllFilters}>
            Clear all filters
          </button>
        </div>
      ) : (
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
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.incident ? (
                      <Link href={`/incidents/${row.incident.id}`}>{row.incident.title}</Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <Link href={`/cases/${row.id}`} style={{ fontWeight: 600 }}>
                      {row.customerRef}
                    </Link>
                  </td>
                  <td>
                    <span>{row.contactCount}</span>
                    {row.channels.length > 0 && (
                      <span className="cell-note" style={{ display: "block" }}>
                        {row.channels.map((c) => channelName(c as any)).join(", ")}
                      </span>
                    )}
                  </td>
                  <td>
                    {linkName(row.linkStatus as any)}
                    <span className="cell-note">
                      {row.rrn ? `RRN: ${row.rrn} ` : ""}
                      {row.amount ? `· ${naira(row.amount)}` : ""}
                    </span>
                  </td>
                  <td>
                    {row.incident ? <Mark label={row.incident.label} /> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
