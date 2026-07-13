"use client";

import { useEffect, useState } from "react";
import { ticketsApi, Ticket, fmtDateTime, fmtRelative } from "@/lib/api";

type FilterType = "all" | "open" | "assigned" | "resolved";

/* ── Priority sort weight ────────────────────────────────── */
const PRIORITY_WEIGHT: Record<string, number> = { high: 3, medium: 2, low: 1 };

/* ── Expandable ticket row ───────────────────────────────── */
function TicketRow({
  ticket,
  onAssign,
  onResolve,
  actionLoading,
}: {
  ticket: Ticket;
  onAssign: (id: number) => void;
  onResolve: (id: number) => void;
  actionLoading: number | null;
}) {
  const [expanded, setExpanded] = useState(false);

  const isLoading = actionLoading === ticket.id;

  return (
    <div className="card" style={{
      borderLeft: `3px solid ${
        ticket.status === "open"     ? "#ef4444" :
        ticket.status === "assigned" ? "var(--secondary)" : "var(--border)"
      }`,
      overflow: "hidden",
      transition: "box-shadow 0.15s",
    }}>
      {/* ── Summary row ── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: "1rem 1.25rem", textAlign: "left", display: "flex",
          alignItems: "center", gap: "0.875rem",
        }}
      >
        {/* Chevron */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="var(--fg-4)" strokeWidth="2.5" strokeLinecap="round"
          style={{ flexShrink: 0, transition: "transform 0.2s", transform: expanded ? "rotate(90deg)" : "rotate(0)" }}>
          <polyline points="9,18 15,12 9,6" />
        </svg>

        {/* ID + badges */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
          <span style={{ fontFamily: "monospace", fontSize: "0.78rem", fontWeight: 700, color: "var(--fg-4)" }}>#{ticket.id}</span>
          <span className={`badge badge-${ticket.status}`}>{ticket.status}</span>
          <span className={`badge badge-${ticket.priority}`}>{ticket.priority}</span>
        </div>

        {/* Subject */}
        <span style={{ flex: 1, fontWeight: 600, fontSize: "0.875rem", color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {ticket.subject}
        </span>

        {/* Time */}
        <span style={{ fontSize: "0.72rem", color: "var(--fg-4)", flexShrink: 0 }}>{fmtRelative(ticket.created_at)}</span>
      </button>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div style={{ padding: "0 1.25rem 1.25rem", borderTop: "1px solid var(--border)" }} className="anim-fade-in">
          {/* Description */}
          <div style={{ padding: "0.875rem 0", color: "var(--fg-2)", fontSize: "0.875rem", lineHeight: 1.65, borderBottom: "1px solid var(--border)" }}>
            {ticket.description}
          </div>

          {/* Meta row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", padding: "0.875rem 0", borderBottom: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--fg-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.2rem" }}>Opened</div>
              <div style={{ fontSize: "0.8rem", color: "var(--fg-2)" }}>{fmtDateTime(ticket.created_at)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--fg-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.2rem" }}>Last Updated</div>
              <div style={{ fontSize: "0.8rem", color: "var(--fg-2)" }}>{fmtRelative(ticket.updated_at)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--fg-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.2rem" }}>Assigned Agent</div>
              <div style={{ fontSize: "0.8rem", color: "var(--fg-2)" }}>
                {ticket.assigned_agent_id ? `Agent #${ticket.assigned_agent_id}` : "Unassigned"}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "0.625rem", paddingTop: "0.875rem", alignItems: "center" }}>
            {ticket.status === "open" && (
              <button id={`assign-${ticket.id}`} onClick={() => onAssign(ticket.id)}
                className="btn btn-secondary btn-sm" disabled={isLoading}>
                {isLoading ? "Assigning…" : "Assign to Me"}
              </button>
            )}
            {ticket.status === "assigned" && (
              <button id={`resolve-${ticket.id}`} onClick={() => onResolve(ticket.id)}
                className="btn btn-primary btn-sm" disabled={isLoading}>
                {isLoading ? "Resolving…" : "Mark Resolved"}
              </button>
            )}
            {ticket.status === "resolved" && (
              <span style={{ fontSize: "0.82rem", color: "var(--success)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="2,6 5,9 10,3"/>
                </svg>
                Resolved
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────── */
export default function AgentDashboardPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterType>("open");
  const [search, setSearch] = useState("");

  const loadTickets = async () => {
    try { setTickets(await ticketsApi.list()); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadTickets();
    const interval = setInterval(loadTickets, 30000);

    // Real-time WebSocket ticket queue listener
    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connectWS = () => {
      const apiUrL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const wsUrl = apiUrL.replace(/^http/, "ws") + "/api/v1/chat/ws";
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("Agent WebSocket connected. Authenticating...");
        const token = localStorage.getItem("access_token");
        if (token) {
          ws.send(JSON.stringify({ token }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "new_ticket_alert") {
            console.log("Agent Dashboard: New ticket alert received in real-time. Reloading...");
            loadTickets();
          }
        } catch (e) {
          console.error("Failed to parse WebSocket alert:", e);
        }
      };

      ws.onclose = () => {
        console.log("Agent WebSocket disconnected. Reconnecting in 5s...");
        reconnectTimeout = setTimeout(connectWS, 5000);
      };

      ws.onerror = (err) => {
        console.error("Agent WebSocket encountered error:", err);
      };
    };

    connectWS();

    return () => {
      clearInterval(interval);
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
    };
  }, []);

  const handleAssign = async (id: number) => {
    setActionLoading(id);
    try { await ticketsApi.assign(id); await loadTickets(); }
    finally { setActionLoading(null); }
  };

  const handleResolve = async (id: number) => {
    setActionLoading(id);
    try { await ticketsApi.updateStatus(id, "resolved"); await loadTickets(); }
    finally { setActionLoading(null); }
  };

  // Counts for filter tabs
  const counts = {
    all:      tickets.length,
    open:     tickets.filter((t) => t.status === "open").length,
    assigned: tickets.filter((t) => t.status === "assigned").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };

  // Filter + search + sort by priority then date
  const visible = tickets
    .filter((t) => filter === "all" || t.status === filter)
    .filter((t) => !search || t.subject.toLowerCase().includes(search.toLowerCase()) || String(t.id).includes(search))
    .sort((a, b) => (PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]) || (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: "open",     label: "Open" },
    { key: "assigned", label: "Assigned" },
    { key: "resolved", label: "Resolved" },
    { key: "all",      label: "All" },
  ];

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }} className="stagger">
        {[
          { label: "Open",     value: counts.open,     color: "#ef4444" },
          { label: "Assigned", value: counts.assigned, color: "var(--secondary)" },
          { label: "Resolved", value: counts.resolved, color: "var(--success)" },
          { label: "Total",    value: counts.all,      color: "var(--primary)" },
        ].map((s) => (
          <div key={s.label} className="stat-card anim-fade-up">
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label} Tickets</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: "0.875rem", alignItems: "center", flexWrap: "wrap" }}>
        {/* Filter pills */}
        <div className="pill-tabs">
          {FILTERS.map((f) => (
            <button key={f.key} id={`filter-${f.key}`}
              className={`pill-tab ${filter === f.key ? "active" : ""}`}
              onClick={() => setFilter(f.key)}>
              {f.label}
              <span style={{
                marginLeft: "0.25rem", fontSize: "0.65rem", fontWeight: 700,
                color: filter === f.key ? "var(--primary)" : "var(--fg-4)",
              }}>
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ flex: 1, position: "relative", minWidth: 200 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fg-4)"
            strokeWidth="2" strokeLinecap="round"
            style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" className="input" placeholder="Search by subject or ticket ID…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: "2.25rem" }} />
        </div>

        {/* Refresh */}
        <button onClick={() => { setLoading(true); loadTickets(); }}
          className="btn btn-ghost btn-sm" title="Refresh">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Ticket list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--fg-3)" }}>
          <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginBottom: "0.75rem" }}>
            <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
          </div>
          Loading ticket queue…
        </div>
      ) : visible.length === 0 ? (
        <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🎉</div>
          <div style={{ fontWeight: 700, color: "var(--fg)", marginBottom: "0.5rem" }}>
            {search ? "No tickets match your search" : `No ${filter === "all" ? "" : filter + " "}tickets`}
          </div>
          <p style={{ color: "var(--fg-3)", fontSize: "0.875rem" }}>
            {filter === "open" ? "Great — the queue is clear!" : "Try a different filter."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }} className="stagger">
          {visible.map((t) => (
            <TicketRow key={t.id} ticket={t}
              onAssign={handleAssign} onResolve={handleResolve}
              actionLoading={actionLoading} />
          ))}
        </div>
      )}
    </div>
  );
}
