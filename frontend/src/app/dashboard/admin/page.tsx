"use client";

import { useState, useEffect, FormEvent } from "react";
import { kbApi, ticketsApi, Ticket, KBStatus } from "@/lib/api";

export default function AdminDashboardPage() {
  const [kbStatus, setKbStatus] = useState<KBStatus | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [kbTitle, setKbTitle] = useState("");
  const [kbContent, setKbContent] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [clearLoading, setClearLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"kb" | "overview">("overview");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [status, tix] = await Promise.all([kbApi.status(), ticketsApi.list()]);
      setKbStatus(status);
      setTickets(tix);
    } catch {}
  };

  const uploadDoc = async (e: FormEvent) => {
    e.preventDefault();
    setUploadLoading(true);
    setUploadResult(null);
    try {
      const res = await kbApi.upload(kbTitle, kbContent);
      setUploadResult(`✓ Ingested "${res.title}" — ${res.chunks} chunk(s) stored in ChromaDB.`);
      setKbTitle("");
      setKbContent("");
      await loadData();
    } catch (err: unknown) {
      setUploadResult(`⚠ ${err instanceof Error ? err.message : "Upload failed"}`);
    } finally {
      setUploadLoading(false);
    }
  };

  const clearKb = async () => {
    if (!confirm("Are you sure you want to clear the entire knowledge base? This cannot be undone.")) return;
    setClearLoading(true);
    try {
      await kbApi.clear();
      setUploadResult("✓ Knowledge base cleared successfully.");
      await loadData();
    } finally {
      setClearLoading(false);
    }
  };

  const totalTickets = tickets.length;
  const openCount = tickets.filter((t) => t.status === "open").length;
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length;
  const resolutionRate = totalTickets > 0 ? Math.round((resolvedCount / totalTickets) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-value">{totalTickets}</div>
          <div className="stat-label">Total Tickets</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "#c05030" }}>{openCount}</div>
          <div className="stat-label">Open Tickets</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{resolvedCount}</div>
          <div className="stat-label">Resolved</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--secondary)" }}>{resolutionRate}%</div>
          <div className="stat-label">Resolution Rate</div>
        </div>
      </div>

      {/* KB status banner */}
      <div
        className="flex items-center justify-between p-4"
        style={{
          background: "linear-gradient(90deg, var(--primary), var(--secondary))",
          borderRadius: "var(--radius)",
          color: "white",
        }}
      >
        <div className="flex items-center gap-3">
          <span style={{ fontSize: "1.5rem" }}>📚</span>
          <div>
            <div className="font-semibold text-sm">Knowledge Base Status</div>
            <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>
              {kbStatus ? `${kbStatus.count} document chunk(s) indexed in ${kbStatus.collection}` : "Loading…"}
            </div>
          </div>
        </div>
        <div
          style={{
            background: kbStatus && kbStatus.count > 0 ? "rgba(201,212,176,0.3)" : "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "999px",
            padding: "0.3rem 0.9rem",
            fontSize: "0.78rem",
            fontWeight: 600,
          }}
        >
          {kbStatus && kbStatus.count > 0 ? "● Active" : "○ Empty"}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1" style={{ background: "var(--muted)", borderRadius: "var(--radius-sm)", width: "fit-content" }}>
        {(["overview", "kb"] as const).map((tab) => (
          <button
            key={tab}
            id={`admin-tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            className="btn btn-sm"
            style={{
              background: activeTab === tab ? "var(--primary)" : "transparent",
              color: activeTab === tab ? "white" : "var(--muted-fg)",
              border: "none",
              boxShadow: "none",
            }}
          >
            {tab === "overview" ? "📊 System Overview" : "📚 Upload Documents"}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div className="card p-6">
          <h2 className="font-bold mb-4" style={{ color: "var(--primary)", fontSize: "1.1rem" }}>
            All Tickets ({totalTickets})
          </h2>
          {tickets.length === 0 ? (
            <div className="text-center py-10" style={{ color: "var(--muted-fg)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📭</div>
              <p>No tickets in the system yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Table header */}
              <div
                className="grid gap-4 px-3 py-2 text-xs font-semibold"
                style={{
                  color: "var(--muted-fg)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  gridTemplateColumns: "60px 1fr 100px 90px 90px",
                }}
              >
                <span>ID</span>
                <span>Subject</span>
                <span>User ID</span>
                <span>Status</span>
                <span>Priority</span>
              </div>
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="grid gap-4 items-center px-3 py-3 animate-slide-in"
                  style={{
                    gridTemplateColumns: "60px 1fr 100px 90px 90px",
                    background: "var(--muted)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    fontSize: "0.85rem",
                  }}
                >
                  <span className="font-mono font-bold" style={{ color: "var(--primary)" }}>#{ticket.id}</span>
                  <span className="truncate font-medium">{ticket.subject}</span>
                  <span style={{ color: "var(--muted-fg)" }}>{ticket.user_id}</span>
                  <span><span className={`badge badge-${ticket.status}`}>{ticket.status}</span></span>
                  <span><span className={`badge badge-${ticket.priority}`}>{ticket.priority}</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── KB UPLOAD TAB ── */}
      {activeTab === "kb" && (
        <div className="card p-6">
          <h2 className="font-bold mb-2" style={{ color: "var(--primary)", fontSize: "1.1rem" }}>
            Upload Knowledge Base Document
          </h2>
          <p className="mb-5" style={{ color: "var(--muted-fg)", fontSize: "0.85rem" }}>
            Paste any help article, FAQ, or support documentation. It will be chunked and indexed into ChromaDB, then referenced automatically by the AI agent during customer conversations.
          </p>

          {uploadResult && (
            <div
              style={{
                background: uploadResult.startsWith("✓") ? "rgba(201,212,176,0.3)" : "rgba(220,80,60,0.08)",
                border: `1px solid ${uploadResult.startsWith("✓") ? "var(--accent)" : "rgba(220,80,60,0.25)"}`,
                borderRadius: "var(--radius-sm)",
                padding: "0.75rem 1rem",
                color: uploadResult.startsWith("✓") ? "var(--accent-fg)" : "#b03020",
                fontSize: "0.85rem",
                marginBottom: "1.25rem",
              }}
            >
              {uploadResult}
            </div>
          )}

          <form onSubmit={uploadDoc} className="flex flex-col gap-4">
            <div>
              <label htmlFor="kb-title" className="input-label">Document Title</label>
              <input
                id="kb-title"
                type="text"
                className="input"
                placeholder="e.g. Password Reset Guide"
                value={kbTitle}
                onChange={(e) => setKbTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="kb-content" className="input-label">Document Content</label>
              <textarea
                id="kb-content"
                className="input"
                placeholder="Paste your help article text here…"
                rows={10}
                value={kbContent}
                onChange={(e) => setKbContent(e.target.value)}
                required
                style={{ resize: "vertical", fontFamily: "inherit", fontSize: "0.85rem", lineHeight: 1.6 }}
              />
            </div>
            <div className="flex gap-3">
              <button
                id="kb-upload"
                type="submit"
                className="btn btn-primary"
                disabled={uploadLoading}
              >
                {uploadLoading ? "Uploading & Chunking…" : "Upload to Knowledge Base"}
              </button>
              <button
                id="kb-clear"
                type="button"
                className="btn btn-ghost"
                style={{ color: "#c05030", borderColor: "rgba(220,80,60,0.3)" }}
                onClick={clearKb}
                disabled={clearLoading}
              >
                {clearLoading ? "Clearing…" : "Clear All Documents"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
