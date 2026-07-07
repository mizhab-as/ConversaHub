"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { chatApi, ticketsApi, Ticket } from "@/lib/api";

interface ChatMessage {
  role: "user" | "agent";
  content: string;
  routing?: string;
}

const priorityOptions = ["low", "medium", "high"];

export default function CustomerDashboardPage() {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "agent",
      content: "Hello! I'm your AI support agent. I can answer questions, book appointments, or connect you with a human agent. How can I help you today? 👋",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Ticket state
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDesc, setTicketDesc] = useState("");
  const [ticketPriority, setTicketPriority] = useState("medium");
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "tickets">("chat");

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  useEffect(() => {
    if (activeTab === "tickets") loadTickets();
  }, [activeTab]);

  const loadTickets = async () => {
    try {
      const data = await ticketsApi.list();
      setTickets(data);
    } catch {}
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = { role: "user", content: chatInput };
    setMessages((m) => [...m, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await chatApi.sendMessage(userMsg.content);
      setMessages((m) => [...m, { role: "agent", content: res.response, routing: res.routing_target }]);
    } catch (err: unknown) {
      setMessages((m) => [
        ...m,
        { role: "agent", content: "Sorry, I'm having trouble connecting right now. Please try again in a moment." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const createTicket = async (e: FormEvent) => {
    e.preventDefault();
    setTicketLoading(true);
    setTicketSuccess(null);
    try {
      await ticketsApi.create(ticketSubject, ticketDesc, ticketPriority);
      setTicketSubject("");
      setTicketDesc("");
      setTicketPriority("medium");
      setTicketSuccess("Ticket submitted! A support agent will review it shortly.");
      await loadTickets();
    } catch {}
    finally {
      setTicketLoading(false);
    }
  };

  const routingBadge = (routing?: string) => {
    if (!routing) return null;
    const map: Record<string, { label: string; color: string }> = {
      rag:      { label: "📚 Knowledge Base", color: "rgba(201,212,176,0.4)" },
      escalate: { label: "🎫 Ticket Created", color: "rgba(92,138,130,0.2)" },
      general:  { label: "💬 AI Response",    color: "rgba(27,75,74,0.08)"  },
    };
    const b = map[routing];
    if (!b) return null;
    return (
      <span
        style={{
          background: b.color,
          color: "var(--primary)",
          borderRadius: "999px",
          padding: "0.15rem 0.6rem",
          fontSize: "0.68rem",
          fontWeight: 600,
          display: "inline-block",
          marginTop: "0.4rem",
        }}
      >
        {b.label}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto animate-fade-in">
      {/* Tab switcher */}
      <div className="flex gap-1 p-1" style={{ background: "var(--muted)", borderRadius: "var(--radius-sm)", width: "fit-content" }}>
        {(["chat", "tickets"] as const).map((tab) => (
          <button
            key={tab}
            id={`tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            className="btn btn-sm"
            style={{
              background: activeTab === tab ? "var(--primary)" : "transparent",
              color: activeTab === tab ? "white" : "var(--muted-fg)",
              border: "none",
              boxShadow: "none",
            }}
          >
            {tab === "chat" ? "💬 AI Chat" : "🎫 My Tickets"}
          </button>
        ))}
      </div>

      {/* ── CHAT TAB ── */}
      {activeTab === "chat" && (
        <div className="card flex flex-col" style={{ height: "calc(100vh - 220px)" }}>
          {/* Chat header */}
          <div
            className="flex items-center gap-3 p-4"
            style={{ borderBottom: "1px solid var(--border)", flexShrink: 0 }}
          >
            <div
              style={{
                width: "38px", height: "38px",
                background: "var(--primary)",
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.1rem",
              }}
            >
              🤖
            </div>
            <div>
              <div className="font-semibold text-sm" style={{ color: "var(--primary)" }}>ConversaHub AI Agent</div>
              <div className="flex items-center gap-1.5" style={{ fontSize: "0.72rem", color: "var(--muted-fg)" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e" }} />
                Online · Powered by LangGraph + Gemini
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex flex-col gap-3 p-5 overflow-y-auto flex-1">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
                <div className="flex flex-col">
                  <div className={msg.role === "user" ? "chat-bubble-user" : "chat-bubble-agent"}>
                    {msg.content}
                  </div>
                  {msg.role === "agent" && routingBadge(msg.routing)}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="chat-bubble-agent flex items-center gap-1.5">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={sendMessage}
            className="flex gap-3 p-4"
            style={{ borderTop: "1px solid var(--border)", flexShrink: 0 }}
          >
            <input
              id="chat-input"
              type="text"
              className="input flex-1"
              placeholder="Type your message…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={chatLoading}
            />
            <button
              id="chat-send"
              type="submit"
              className="btn btn-primary"
              disabled={chatLoading || !chatInput.trim()}
            >
              Send →
            </button>
          </form>
        </div>
      )}

      {/* ── TICKETS TAB ── */}
      {activeTab === "tickets" && (
        <div className="flex flex-col gap-6">
          {/* New ticket form */}
          <div className="card p-6">
            <h2 className="font-bold mb-4" style={{ color: "var(--primary)", fontSize: "1.1rem" }}>
              Submit a New Support Ticket
            </h2>
            {ticketSuccess && (
              <div
                style={{
                  background: "rgba(201,212,176,0.3)",
                  border: "1px solid var(--accent)",
                  borderRadius: "var(--radius-sm)",
                  padding: "0.75rem 1rem",
                  color: "var(--accent-fg)",
                  fontSize: "0.85rem",
                  marginBottom: "1.25rem",
                }}
              >
                ✓ {ticketSuccess}
              </div>
            )}
            <form onSubmit={createTicket} className="flex flex-col gap-4">
              <div>
                <label htmlFor="ticket-subject" className="input-label">Subject</label>
                <input
                  id="ticket-subject"
                  type="text"
                  className="input"
                  placeholder="Brief summary of your issue"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="ticket-desc" className="input-label">Description</label>
                <textarea
                  id="ticket-desc"
                  className="input"
                  placeholder="Describe your issue in detail…"
                  rows={4}
                  value={ticketDesc}
                  onChange={(e) => setTicketDesc(e.target.value)}
                  required
                  style={{ resize: "vertical", fontFamily: "inherit" }}
                />
              </div>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label htmlFor="ticket-priority" className="input-label">Priority</label>
                  <select
                    id="ticket-priority"
                    className="input"
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value)}
                  >
                    {priorityOptions.map((p) => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <button
                  id="ticket-submit"
                  type="submit"
                  className="btn btn-primary"
                  disabled={ticketLoading}
                  style={{ flexShrink: 0 }}
                >
                  {ticketLoading ? "Submitting…" : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>

          {/* Ticket list */}
          <div className="card p-6">
            <h2 className="font-bold mb-4" style={{ color: "var(--primary)", fontSize: "1.1rem" }}>
              My Tickets ({tickets.length})
            </h2>
            {tickets.length === 0 ? (
              <div className="text-center py-10" style={{ color: "var(--muted-fg)" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🎉</div>
                <p>No open tickets — you&apos;re all good!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-start justify-between gap-4 p-4"
                    style={{
                      background: "var(--muted)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm mb-1 truncate" style={{ color: "var(--primary)" }}>
                        #{ticket.id} — {ticket.subject}
                      </div>
                      <div style={{ color: "var(--muted-fg)", fontSize: "0.8rem", lineHeight: 1.5 }}>
                        {ticket.description.slice(0, 120)}{ticket.description.length > 120 ? "…" : ""}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0 items-end">
                      <span className={`badge badge-${ticket.status}`}>{ticket.status}</span>
                      <span className={`badge badge-${ticket.priority}`}>{ticket.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
