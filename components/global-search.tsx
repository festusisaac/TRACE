"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon, XCloseIcon } from "@/components/icons";
import type { SearchResultItem } from "@/app/api/search/route";

export function GlobalSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Global Ctrl+K / Cmd+K / Slash key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      fetchResults("");
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced fetch
  const fetchResults = async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setSelectedIndex(0);
      }
    } catch {
      // Ignore network errors in search
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    fetchResults(val);
  };

  const handleSelect = (item: SearchResultItem) => {
    setIsOpen(false);
    router.push(item.url);
  };

  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  const categoryBadgeColor = (category: SearchResultItem["category"]) => {
    switch (category) {
      case "incident":
        return { bg: "var(--systemic-bg)", text: "var(--systemic)" };
      case "case":
        return { bg: "var(--isolated-bg)", text: "var(--isolated)" };
      case "regulation":
        return { bg: "var(--emerging-bg)", text: "var(--emerging)" };
      default:
        return { bg: "var(--band)", text: "var(--ink)" };
    }
  };

  return (
    <>
      {/* Topbar Search Button Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "rgba(255, 255, 255, 0.08)",
          border: "1px solid rgba(255, 255, 255, 0.16)",
          borderRadius: 6,
          padding: "6px 12px",
          color: "rgba(255, 255, 255, 0.75)",
          fontSize: 12,
          cursor: "pointer",
          transition: "all 0.15s ease",
          maxWidth: 260,
          width: "100%",
        }}
        title="Quick Search (Ctrl + K)"
      >
        <SearchIcon size={14} style={{ color: "#e2b340", flexShrink: 0 }} />
        <span style={{ flex: 1, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          Search cases, incidents, RRN…
        </span>
        <kbd
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 10,
            background: "rgba(255, 255, 255, 0.15)",
            padding: "2px 5px",
            borderRadius: 3,
            color: "#fff",
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          Ctrl K
        </kbd>
      </button>

      {/* Modal Dialog Backdrop & Command Palette */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Universal Search"
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(16, 40, 63, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: "12vh",
            paddingLeft: 16,
            paddingRight: 16,
            animation: "fadeIn 0.15s ease-out",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleModalKeyDown}
            style={{
              width: 580,
              maxWidth: "100%",
              background: "#ffffff",
              borderRadius: 8,
              boxShadow: "0 24px 64px rgba(16, 40, 63, 0.35), 0 0 0 1px rgba(16, 40, 63, 0.1)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Input Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 16px",
                borderBottom: "1px solid var(--line)",
                background: "#fafafa",
              }}
            >
              <div style={{ color: "var(--header)", display: "flex", alignItems: "center" }}>
                <SearchIcon size={18} />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                placeholder="Type customer name, RRN, incident title, or CBN SLA..."
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  fontSize: 14,
                  background: "transparent",
                  color: "var(--ink)",
                  fontFamily: "inherit",
                }}
              />
              {loading && (
                <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Searching…
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <XCloseIcon size={18} />
              </button>
            </div>

            {/* Results List */}
            <div style={{ maxHeight: "55vh", overflowY: "auto", padding: "8px 0" }}>
              {results.length === 0 ? (
                <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--muted)" }}>
                  <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 500 }}>
                    {query ? `No matches for "${query}"` : "Start typing to search"}
                  </p>
                  <p style={{ margin: 0, fontSize: 12 }}>
                    Try customer names, account masks, RRN numbers, or regulation keywords
                  </p>
                </div>
              ) : (
                results.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  const badgeStyle = categoryBadgeColor(item.category);
                  return (
                    <div
                      key={item.id}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      style={{
                        padding: "10px 16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        background: isSelected ? "var(--band)" : "transparent",
                        borderLeft: isSelected ? "3px solid #b82424" : "3px solid transparent",
                        transition: "background 0.1s ease",
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1, paddingRight: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <span
                            style={{
                              fontSize: 10,
                              textTransform: "uppercase",
                              fontWeight: 700,
                              padding: "2px 5px",
                              borderRadius: 3,
                              background: badgeStyle.bg,
                              color: badgeStyle.text,
                              letterSpacing: "0.06em",
                            }}
                          >
                            {item.category}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                            {item.title}
                          </span>
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
                            color: "var(--muted)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.subtitle}
                        </p>
                      </div>

                      {item.badge && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--ink)",
                            background: "var(--white)",
                            border: "1px solid var(--line)",
                            padding: "2px 7px",
                            borderRadius: 4,
                            flexShrink: 0,
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Keyboard Guide Footer */}
            <div
              style={{
                borderTop: "1px solid var(--line)",
                padding: "8px 16px",
                background: "#fafafa",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 11,
                color: "var(--muted)",
              }}
            >
              <span>Navigation Shortcuts</span>
              <div style={{ display: "flex", gap: 12 }}>
                <span>
                  <kbd style={{ fontFamily: "monospace", padding: "1px 4px", border: "1px solid var(--line)", borderRadius: 3, background: "#fff" }}>↑</kbd>{" "}
                  <kbd style={{ fontFamily: "monospace", padding: "1px 4px", border: "1px solid var(--line)", borderRadius: 3, background: "#fff" }}>↓</kbd> Navigate
                </span>
                <span>
                  <kbd style={{ fontFamily: "monospace", padding: "1px 4px", border: "1px solid var(--line)", borderRadius: 3, background: "#fff" }}>↵</kbd> Select
                </span>
                <span>
                  <kbd style={{ fontFamily: "monospace", padding: "1px 4px", border: "1px solid var(--line)", borderRadius: 3, background: "#fff" }}>Esc</kbd> Close
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
