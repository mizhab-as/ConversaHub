"use client";

import { useEffect, useState } from "react";
import { ticketsApi, Ticket } from "@/lib/api";

const statusOrder = ["open", "assigned", "resolved"];

export default function AgentDashboardPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "assigned">("all");

  const loadTickets = async () => {
    try {
      const data = await ticketsApi.list();
      setTickets(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadTickets, 30000);
    return () => clearInterval(interval);
  }, []);

  const assignTicket = async (ticketId: number) => {
    setActionLoading(ticketId);
    try {
      await ticketsApi.assign(ticketId);
      await loadTickets();
    } finally {
      setActionLoading(null);
    }
  };

  const resolveTicket = async (ticketId: number) => {
    setActionLoading(ticketId);
    try {
      await ticketsApi.updateStatus(ticketId, "resolved");
      await loadTickets();
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = tickets.filter((t) => {
    if (filter === "all") return true;
    return t.status === filter;
  });

  const counts = {
    open: tickets.filter((t) => t.status === "open").length,
    assigned: tickets.filter((t) => t.status === "assigned").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto animate-fade-in">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="stat-value" style={{ color: "#c05030" }}>{counts.open}</div>
          <div className="stat-label">Open Tickets</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--secondary)" }}>{counts.assigned}</div>
          <div className="stat-label">Assigned</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{counts.resolved}</div>
          <div className="stat-label">Resolved Today</div>
        </div>
      </div>

      {/* Ticket queue */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h2 className="font-bold" style={{ color: "var(--primary)", fontSize: "1.15rem" }}>
            Support Ticket Queue
          </h2>
          {/* Filter buttons */}
          <div className="flex gap-1 p-1" style={{ background: "var(--muted)", borderRadius: "var(--radius-sm)" }}>
            {(["all", "open", "assigned"] as const).map((f) => (
              <button
                key={f}
                id={`filter-${f}`}
                onClick={() => setFilter(f)}
                className="btn btn-sm"
                style={{
                  background: filter === f ? "var(--primary)" : "transparent",
                  color: filter === f ? "white" : "var(--muted-fg)",
                  border: "none",
                  boxShadow: "none",
                  textTransform: "capitalize",
                }}
              >
                {f} {f !== "all" && <span style={{ opacity: 0.7 }}>({counts[f]})</span>}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="flex gap-2 justify-center mb-3">
              <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
            </div>
            <span style={{ color: "var(--muted-fg)", fontSize: "0.85rem" }}>Loading ticket queue…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12" style={{ color: "var(--muted-fg)" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🎉</div>
            <p className="font-medium">Queue is clear — great work!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((ticket) => (
              <div
                key={ticket.id}
                className="p-4 animate-slide-in"
                style={{
                  background: ticket.status === "open" ? "rgba(220,80,60,0.04)" : "var(--muted)",
                  borderRadius: "var(--radius-sm)",
                  border: `1px solid ${ticket.status === "open" ? "rgba(220,80,60,0.15)" : "var(--border)"}`,
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-sm" style={{ color: "var(--primary)" }}>
                        Ticket #{ticket.id}
                      </span>
                      <span className={`badge badge-${ticket.status}`}>{ticket.status}</span>
                      <span className={`badge badge-${ticket.priority}`}>{ticket.priority}</span>
                    </div>
                    <p className="font-medium mb-1 text-sm truncate" style={{ color: "var(--foreground)" }}>
                      {ticket.subject}
                    </p>
                    <p style={{ color: "var(--muted-fg)", fontSize: "0.8rem", lineHeight: 1.5 }}>
                      {ticket.description.slice(0, 160)}{ticket.description.length > 160 ? "…" : ""}
                    </p>
                    <p style={{ color: "var(--muted-fg)", fontSize: "0.72rem", marginTop: "0.5rem" }}>
                      Created: {new Date(ticket.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {ticket.status === "open" && (
                      <button
                        id={`assign-${ticket.id}`}
                        onClick={() => assignTicket(ticket.id)}
                        className="btn btn-secondary btn-sm"
                        disabled={actionLoading === ticket.id}
                      >
                        {actionLoading === ticket.id ? "…" : "Assign to Me"}
                      </button>
                    )}
                    {ticket.status === "assigned" && (
                      <button
                        id={`resolve-${ticket.id}`}
                        onClick={() => resolveTicket(ticket.id)}
                        className="btn btn-primary btn-sm"
                        disabled={actionLoading === ticket.id}
                      >
                        {actionLoading === ticket.id ? "…" : "Mark Resolved"}
                      </button>
                    )}
                    {ticket.status === "resolved" && (
                      <span style={{ fontSize: "0.8rem", color: "var(--secondary)", fontWeight: 600 }}>✓ Done</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
