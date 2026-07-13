"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { chatApi, ticketsApi, Ticket, fmtDateTime, fmtRelative } from "@/lib/api";

interface ChatMessage {
  role: "user" | "agent";
  content: string;
  routing?: string;
  ts: string;
}

const QUICK_REPLIES = [
  "How do I reset my password?",
  "I need to speak to a human agent",
  "Book an appointment for me",
  "What is your refund policy?",
];

const PRIORITY_OPTIONS = ["low", "medium", "high"] as const;
const CATEGORY_OPTIONS = [
  "Account & Billing",
  "Technical Issue",
  "General Question",
  "Appointment",
  "Other",
];

/* ── Routing badge ───────────────────────────────────────── */
function RoutingBadge({ routing }: { routing?: string }) {
  if (!routing) return null;
  const map: Record<string, { label: string; bg: string; color: string }> = {
    rag:      { label: "Knowledge Base",  bg: "rgba(201,212,176,0.3)",  color: "var(--accent-fg)" },
    escalate: { label: "Ticket Created",  bg: "rgba(92,138,130,0.15)", color: "var(--secondary)"  },
    general:  { label: "AI Response",     bg: "rgba(27,75,74,0.08)",   color: "var(--primary)"    },
  };
  const b = map[routing];
  if (!b) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.3rem",
      background: b.bg, color: b.color,
      borderRadius: 999, padding: "0.15rem 0.6rem",
      fontSize: "0.68rem", fontWeight: 600, marginTop: "0.3rem",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: b.color, display: "inline-block" }} />
      {b.label}
    </span>
  );
}

/* ── Status timeline ─────────────────────────────────────── */
function StatusTimeline({ ticket }: { ticket: Ticket }) {
  const steps = [
    { key: "open",     label: "Opened" },
    { key: "assigned", label: "Assigned" },
    { key: "resolved", label: "Resolved" },
  ];
  const currentIdx = steps.findIndex((s) => s.key === ticket.status);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginTop: "0.75rem" }}>
      {steps.map((step, i) => {
        const done = i <= currentIdx;
        return (
          <div key={step.key} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "initial" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem" }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%",
                background: done ? "var(--primary)" : "var(--surface-2)",
                border: `2px solid ${done ? "var(--primary)" : "var(--border)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                {done && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="2,6 5,9 10,3" />
                  </svg>
                )}
              </div>
              <span style={{ fontSize: "0.62rem", color: done ? "var(--primary)" : "var(--fg-4)", fontWeight: done ? 600 : 400, whiteSpace: "nowrap" }}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < currentIdx ? "var(--primary)" : "var(--border)", margin: "0 4px", marginBottom: "1.1rem" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────── */
export default function CustomerDashboardPage() {
  const [activeTab, setActiveTab] = useState<"chat" | "tickets" | "new-ticket">("chat");

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: "agent",
    content: "Hello! I'm your AI support assistant. I can answer questions from your company's knowledge base, book appointments, or escalate to a human agent. How can I help you today?",
    ts: new Date().toISOString(),
  }]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // WebSocket state
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Tickets
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  // New ticket form
  const [subject, setSubject]     = useState("");
  const [desc, setDesc]           = useState("");
  const [priority, setPriority]   = useState<"low" | "medium" | "high">("medium");
  const [category, setCategory]   = useState(CATEGORY_OPTIONS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  // Connect to chat WebSocket on mount
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connectWS = () => {
      const apiUrL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const wsUrl = apiUrL.replace(/^http/, "ws").replace("localhost", "127.0.0.1") + "/api/v1/chat/ws";
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("Customer WebSocket connected. Authenticating...");
        const token = localStorage.getItem("access_token");
        if (token) {
          ws.send(JSON.stringify({ token }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "auth_ok") {
            setWsConnected(true);
            setSocket(ws);
            console.log("Customer WebSocket authenticated successfully.");
          } else if (data.type === "chat_response") {
            setMessages((m) => [
              ...m,
              {
                role: "agent",
                content: data.response,
                routing: data.routing_target,
                ts: new Date().toISOString(),
              },
            ]);
            setChatLoading(false);
          } else if (data.type === "error") {
            console.error("Customer WebSocket authentication/server error:", data.message);
          }
        } catch (e) {
          console.error("Failed to parse WebSocket frame:", e);
        }
      };

      ws.onclose = (event) => {
        console.log(`Customer WebSocket disconnected (Code: ${event.code}).`);
        setWsConnected(false);
        setSocket(null);
        if (event.code === 1008) {
          console.error("Customer WebSocket authentication failed. Reconnection stopped. Please log out and log back in.");
          return;
        }
        reconnectTimeout = setTimeout(connectWS, 3000);
      };

      ws.onerror = (err) => {
        console.error("Customer WebSocket encountered error:", err);
      };
    };

    connectWS();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
    };
  }, []);

  useEffect(() => {
    if (activeTab === "tickets") loadTickets();
  }, [activeTab]);

  const loadTickets = async () => {
    setTicketsLoading(true);
    try { setTickets(await ticketsApi.list()); }
    finally { setTicketsLoading(false); }
  };

  const sendMessage = async (text?: string) => {
    const content = text ?? chatInput;
    if (!content.trim()) return;
    const userMsg: ChatMessage = { role: "user", content, ts: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setChatInput("");
    setChatLoading(true);

    if (socket && wsConnected) {
      socket.send(JSON.stringify({ type: "chat_message", message: content }));
    } else {
      // Robust fallback to original HTTP/POST chat API
      try {
        const res = await chatApi.sendMessage(content);
        setMessages((m) => [
          ...m,
          {
            role: "agent",
            content: res.response,
            routing: res.routing_target,
            ts: new Date().toISOString(),
          },
        ]);
      } catch {
        setMessages((m) => [
          ...m,
          {
            role: "agent",
            content: "Sorry, I'm having trouble connecting. Please try again in a moment.",
            ts: new Date().toISOString(),
          },
        ]);
      } finally {
        setChatLoading(false);
      }
    }
  };

  const submitTicket = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await ticketsApi.create(`[${category}] ${subject}`, desc, priority);
      setSubmitDone(true);
      setSubject(""); setDesc(""); setPriority("medium"); setCategory(CATEGORY_OPTIONS[0]);
      setTimeout(() => { setSubmitDone(false); setActiveTab("tickets"); }, 1800);
    } finally {
      setSubmitting(false);
    }
  };

  const tabs = [
    { id: "chat",       label: "AI Chat" },
    { id: "tickets",    label: "My Tickets" },
    { id: "new-ticket", label: "New Ticket" },
  ] as const;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* Tab bar */}
      <div className="pill-tabs">
        {tabs.map((t) => (
          <button key={t.id} id={`tab-${t.id}`}
            className={`pill-tab ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
            {t.id === "tickets" && tickets.length > 0 && (
              <span style={{ marginLeft: "0.3rem", background: "var(--primary)", color: "white", borderRadius: 999, fontSize: "0.6rem", padding: "0.05rem 0.4rem", fontWeight: 700 }}>
                {tickets.filter(t => t.status !== "resolved").length || ""}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══ CHAT TAB ══════════════════════════════════════════ */}
      {activeTab === "chat" && (
        <div className="card" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 230px)" }}>
          {/* Header */}
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", flexShrink: 0, display: "flex", alignItems: "center", gap: "0.875rem" }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "linear-gradient(135deg, var(--primary), var(--secondary))",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>
                <path d="M12 8v4l3 3"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--fg)" }}>ConversaHub AI Agent</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.72rem", color: "var(--fg-3)" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                Online · Powered by LangGraph
              </div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--fg-4)" }}>
              {messages.length - 1} message{messages.length !== 2 ? "s" : ""}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}
                className="anim-fade-in">
                <div style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "75%" }}>
                  <div className={msg.role === "user" ? "chat-bubble-user" : "chat-bubble-agent"}>
                    {msg.content}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.2rem" }}>
                    {msg.role === "agent" && <RoutingBadge routing={msg.routing} />}
                    <span style={{ fontSize: "0.62rem", color: "var(--fg-4)" }}>{fmtRelative(msg.ts)}</span>
                  </div>
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }} className="anim-fade-in">
                <div className="chat-bubble-agent" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0.75rem 1rem" }}>
                  <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick replies */}
          {messages.length === 1 && (
            <div style={{ padding: "0.625rem 1.25rem", borderTop: "1px solid var(--border)", display: "flex", flexWrap: "wrap", gap: "0.5rem", flexShrink: 0 }}>
              {QUICK_REPLIES.map((q) => (
                <button key={q} onClick={() => sendMessage(q)}
                  style={{
                    padding: "0.35rem 0.875rem", borderRadius: 999,
                    background: "var(--surface-2)", border: "1px solid var(--border)",
                    color: "var(--fg-2)", fontSize: "0.78rem", cursor: "pointer",
                    fontFamily: "inherit", fontWeight: 500,
                    transition: "all 0.15s",
                  }}
                  onMouseOver={e => (e.currentTarget.style.borderColor = "var(--primary)")}
                  onMouseOut={e => (e.currentTarget.style.borderColor = "var(--border)")}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
            style={{ padding: "1rem 1.25rem", borderTop: "1px solid var(--border)", flexShrink: 0, display: "flex", gap: "0.75rem" }}>
            <input id="chat-input" type="text" className="input"
              placeholder="Type your message…" value={chatInput}
              onChange={(e) => setChatInput(e.target.value)} disabled={chatLoading}
              style={{ flex: 1 }} />
            <button id="chat-send" type="submit" className="btn btn-primary"
              disabled={chatLoading || !chatInput.trim()}
              style={{ flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/>
              </svg>
              Send
            </button>
          </form>
        </div>
      )}

      {/* ══ TICKETS TAB ══════════════════════════════════════ */}
      {activeTab === "tickets" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {ticketsLoading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--fg-3)" }}>
              <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginBottom: "0.75rem" }}>
                <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
              </div>
              Loading tickets…
            </div>
          ) : tickets.length === 0 ? (
            <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🎉</div>
              <div style={{ fontWeight: 600, color: "var(--fg)", marginBottom: "0.5rem" }}>No tickets yet</div>
              <p style={{ color: "var(--fg-3)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
                The AI resolved everything — or you haven't submitted one yet.
              </p>
              <button className="btn btn-primary" onClick={() => setActiveTab("new-ticket")}>
                Submit a Ticket
              </button>
            </div>
          ) : (
            tickets.map((ticket) => (
              <div key={ticket.id} className="card" style={{ padding: "1.25rem 1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.375rem" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--fg-4)" }}>#{ticket.id}</span>
                      <span className={`badge badge-${ticket.status}`}>{ticket.status}</span>
                      <span className={`badge badge-${ticket.priority}`}>{ticket.priority}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--fg)", marginBottom: "0.375rem" }}>{ticket.subject}</div>
                    <div style={{ color: "var(--fg-3)", fontSize: "0.82rem", lineHeight: 1.55 }}>
                      {ticket.description.slice(0, 140)}{ticket.description.length > 140 ? "…" : ""}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: "right" }}>
                    <div style={{ fontSize: "0.72rem", color: "var(--fg-4)" }}>Opened</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--fg-3)", fontWeight: 500 }}>{fmtDateTime(ticket.created_at)}</div>
                    {ticket.updated_at !== ticket.created_at && (
                      <>
                        <div style={{ fontSize: "0.72rem", color: "var(--fg-4)", marginTop: "0.25rem" }}>Updated</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--fg-3)", fontWeight: 500 }}>{fmtRelative(ticket.updated_at)}</div>
                      </>
                    )}
                  </div>
                </div>
                <StatusTimeline ticket={ticket} />
              </div>
            ))
          )}
        </div>
      )}

      {/* ══ NEW TICKET TAB ═══════════════════════════════════ */}
      {activeTab === "new-ticket" && (
        <div className="card" style={{ padding: "2rem" }}>
          <h2 style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--fg)", marginBottom: "0.375rem", letterSpacing: "-0.02em" }}>
            Submit a Support Ticket
          </h2>
          <p style={{ color: "var(--fg-3)", fontSize: "0.875rem", marginBottom: "1.75rem" }}>
            Our team will respond within a few hours. For urgent issues, try the AI chat first.
          </p>

          {submitDone && (
            <div className="alert alert-success" style={{ marginBottom: "1.25rem" }}>
              <svg width="16" height="16" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
                <polyline points="2,6 5,9 10,3"/>
              </svg>
              Ticket submitted! Redirecting to your tickets…
            </div>
          )}

          <form onSubmit={submitTicket} style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label htmlFor="ticket-category" className="label">Category</label>
                <select id="ticket-category" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="ticket-priority" className="label">Priority</label>
                <select id="ticket-priority" className="input" value={priority}
                  onChange={(e) => setPriority(e.target.value as typeof priority)}>
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="ticket-subject" className="label">Subject</label>
              <input id="ticket-subject" type="text" className="input"
                placeholder="Brief summary of your issue"
                value={subject} onChange={(e) => setSubject(e.target.value)} required />
            </div>

            <div className="form-group">
              <label htmlFor="ticket-desc" className="label">Description</label>
              <textarea id="ticket-desc" className="input" rows={5}
                placeholder="Describe your issue in detail. Include any error messages or steps to reproduce…"
                value={desc} onChange={(e) => setDesc(e.target.value)} required />
            </div>

            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <button id="ticket-submit" type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit Ticket"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setActiveTab("chat")}>
                Try AI Chat instead
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
