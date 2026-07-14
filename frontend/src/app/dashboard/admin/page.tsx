"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { kbApi, ticketsApi, usersApi, Ticket, KBStatus, User, KBDocument, fmtDateTime, fmtRelative } from "@/lib/api";

type AdminTab = "overview" | "users" | "kb";

/* ── Simple bar chart ─────────────────────────────────────── */
function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
      <div style={{ width: 90, fontSize: "0.8rem", color: "var(--fg-3)", flexShrink: 0, textAlign: "right" }}>{label}</div>
      <div style={{ flex: 1, background: "var(--surface-2)", borderRadius: 999, height: 8, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999, transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
      </div>
      <div style={{ width: 36, fontSize: "0.8rem", color: "var(--fg-2)", fontWeight: 700, textAlign: "right" }}>{value}</div>
    </div>
  );
}

/* ── Role badge ───────────────────────────────────────────── */
function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { color: string; bg: string }> = {
    admin:    { color: "var(--primary)",   bg: "rgba(27,75,74,0.1)" },
    agent:    { color: "var(--secondary)", bg: "rgba(92,138,130,0.12)" },
    customer: { color: "var(--fg-3)",      bg: "var(--surface-2)" },
  };
  const s = map[role] ?? map.customer;
  return (
    <span style={{
      display: "inline-block", padding: "0.15rem 0.6rem",
      borderRadius: 999, fontSize: "0.7rem", fontWeight: 700,
      background: s.bg, color: s.color, textTransform: "capitalize",
    }}>{role}</span>
  );
}

/* ── Main page ────────────────────────────────────────────── */
function AdminDashboardContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as AdminTab;
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  useEffect(() => {
    if (tabParam && ["overview", "users", "kb"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Data
  const [tickets,  setTickets]  = useState<Ticket[]>([]);
  const [users,    setUsers]    = useState<User[]>([]);
  const [kbStatus, setKbStatus] = useState<KBStatus | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // KB upload
  const [kbTitle,   setKbTitle]   = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // KB Document Library management state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [kbDocs, setKbDocs] = useState<KBDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [deleteDocLoading, setDeleteDocLoading] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const loadKbDocs = async () => {
    setLoadingDocs(true);
    try {
      const docs = await kbApi.listDocuments();
      setKbDocs(docs);
    } catch (err) {
      console.warn("Failed to load KB docs:", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (activeTab === "kb") {
      loadKbDocs();
    }
  }, [activeTab]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "docx", "txt", "md"].includes(ext)) {
      setUploadMsg({ text: "Error: Only .pdf, .docx, .txt, and .md files are supported.", ok: false });
      return;
    }
    setSelectedFile(file);
    setKbTitle(file.name.replace(/\.[^/.]+$/, ""));
    setUploadMsg(null);
  };

  const deleteDoc = async (docId: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete document "${title}"? All its vector chunks will be deleted.`)) return;
    setDeleteDocLoading(docId);
    try {
      await kbApi.deleteDocument(docId);
      setUploadMsg({ text: `✓ Document "${title}" deleted successfully.`, ok: true });
      await loadKbDocs();
      const kb = await kbApi.status(); setKbStatus(kb);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleteDocLoading(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case "pdf":
        return { emoji: "📕", label: "PDF", color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" };
      case "docx":
        return { emoji: "📘", label: "DOCX", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" };
      case "md":
        return { emoji: "📗", label: "MD", color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" };
      default:
        return { emoji: "📝", label: "TXT", color: "#6b7280", bg: "rgba(107, 114, 128, 0.1)" };
    }
  };

  // User management
  const [roleLoading,          setRoleLoading]          = useState<number | null>(null);
  const [activeLoading,        setActiveLoading]        = useState<number | null>(null);
  const [deleteLoading,        setDeleteLoading]        = useState<number | null>(null);
  const [ticketActionLoading,  setTicketActionLoading]  = useState<number | null>(null);
  const [userSearch,    setUserSearch]    = useState("");
  const [roleFilter,    setRoleFilter]    = useState<string>("all");
  const [statusFilter,  setStatusFilter]  = useState<string>("all");

  useEffect(() => {
    loadAll();

    // Connect to WebSocket for real-time updates in admin dashboard
    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connectWS = () => {
      const apiUrL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const wsUrl = apiUrL.replace(/^http/, "ws").replace("localhost", "127.0.0.1") + "/api/v1/chat/ws";
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("Admin WebSocket connected. Authenticating...");
        const token = localStorage.getItem("access_token");
        if (token) {
          ws.send(JSON.stringify({ token }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "new_ticket_alert") {
            console.log("Admin Dashboard: Real-time ticket alert received. Refreshing statistics...");
            loadAll();
          }
        } catch (e) {
          console.error("Failed to parse WebSocket alert:", e);
        }
      };

      ws.onclose = (event) => {
        console.log(`Admin WebSocket disconnected (Code: ${event.code}).`);
        if (event.code === 1008) {
          console.warn("Admin WebSocket authentication failed. Reconnection stopped. Please log out and log back in.");
          return;
        }
        reconnectTimeout = setTimeout(connectWS, 5000);
      };

      ws.onerror = (err) => {
        console.warn("Admin WebSocket encountered error:", err);
      };
    };

    connectWS();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
    };
  }, []);

  const loadAll = async () => {
    try {
      const [t, u, kb] = await Promise.all([ticketsApi.list(), usersApi.list(), kbApi.status()]);
      setTickets(t); setUsers(u); setKbStatus(kb);
    } catch (err) {
      console.warn("Failed to load admin data:", err);
    } finally { setLoadingData(false); }
  };

  // ── Computed stats ──────────────────────────────────────
  const open     = tickets.filter((t) => t.status === "open").length;
  const assigned = tickets.filter((t) => t.status === "assigned").length;
  const resolved = tickets.filter((t) => t.status === "resolved").length;
  const total    = tickets.length;
  const resoRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
  const admins   = users.filter((u) => u.role === "admin").length;
  const agents   = users.filter((u) => u.role === "agent").length;
  const customers = users.filter((u) => u.role === "customer").length;
  const staffUsers = users.filter((u) => u.role === "agent");

  // ── KB upload ───────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "docx", "txt", "md"].includes(ext)) {
      setUploadMsg({ text: "Error: Only .pdf, .docx, .txt, and .md files are supported.", ok: false });
      return;
    }
    setSelectedFile(file);
    setKbTitle(file.name.replace(/\.[^/.]+$/, ""));
    setUploadMsg(null);
  };

  const uploadDoc = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadMsg({ text: "Error: Please select or drop a file first.", ok: false });
      return;
    }
    setUploading(true); setUploadMsg(null);
    try {
      const res = await kbApi.upload(kbTitle, selectedFile);
      setUploadMsg({ text: res.message || `✓ "${res.title}" ingested — ${res.chunks} chunk(s) stored.`, ok: true });
      setKbTitle("");
      setSelectedFile(null);
      const fileInput = document.getElementById("kb-file-upload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      const kb = await kbApi.status(); setKbStatus(kb);
      await loadKbDocs();
    } catch (err: unknown) {
      setUploadMsg({ text: err instanceof Error ? err.message : "Upload failed", ok: false });
    } finally { setUploading(false); }
  };

  const clearKb = async () => {
    if (!confirm("Clear the entire knowledge base? This cannot be undone.")) return;
    await kbApi.clear();
    setUploadMsg({ text: "✓ Knowledge base cleared.", ok: true });
    const kb = await kbApi.status(); setKbStatus(kb);
    setKbDocs([]);
  };

  // ── User management ─────────────────────────────────────
  const changeRole = async (user: User, role: string) => {
    setRoleLoading(user.id);
    try { const updated = await usersApi.setRole(user.id, role); setUsers((u) => u.map((x) => x.id === updated.id ? updated : x)); }
    finally { setRoleLoading(null); }
  };

  const toggleActive = async (user: User) => {
    setActiveLoading(user.id);
    try { const updated = await usersApi.setActive(user.id, !user.is_active); setUsers((u) => u.map((x) => x.id === updated.id ? updated : x)); }
    finally { setActiveLoading(null); }
  };

  const removeUser = async (user: User) => {
    if (!confirm(`Are you sure you want to permanently delete user "${user.email}"? This cannot be undone.`)) return;
    setDeleteLoading(user.id);
    try {
      await usersApi.delete(user.id);
      setUsers((u) => u.filter((x) => x.id !== user.id));
      setUploadMsg({ text: `✓ User "${user.email}" deleted successfully.`, ok: true });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleUnassignTicket = async (ticketId: number) => {
    setTicketActionLoading(ticketId);
    try {
      await ticketsApi.unassign(ticketId);
      const updated = await ticketsApi.list();
      setTickets(updated);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Unassign failed");
    } finally {
      setTicketActionLoading(null);
    }
  };

  const handleAssignTicket = async (ticketId: number, agentId: number) => {
    setTicketActionLoading(ticketId);
    try {
      await ticketsApi.updateStatus(ticketId, "assigned", agentId);
      const updated = await ticketsApi.list();
      setTickets(updated);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Assignment failed");
    } finally {
      setTicketActionLoading(null);
    }
  };

  const handleDeleteTicket = async (ticketId: number, subject: string) => {
    if (!confirm(`Are you sure you want to permanently delete ticket "${subject}"? This cannot be undone.`)) return;
    setTicketActionLoading(ticketId);
    try {
      await ticketsApi.delete(ticketId);
      const updated = await ticketsApi.list();
      setTickets(updated);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setTicketActionLoading(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = !userSearch || u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesStatus = statusFilter === "all" 
      ? true 
      : statusFilter === "active" 
        ? u.is_active 
        : !u.is_active;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const TABS: { key: AdminTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "users",    label: `Users (${users.length})` },
    { key: "kb",       label: "Knowledge Base" },
  ];

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* ── Top stat cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }} className="stagger">
        {[
          { label: "Total Users",     value: users.length,  color: "var(--primary)" },
          { label: "Total Tickets",   value: total,         color: "var(--fg)" },
          { label: "Open Tickets",    value: open,          color: "#ef4444" },
          { label: "Resolution Rate", value: `${resoRate}%`, color: "var(--success)" },
        ].map((s) => (
          <div key={s.label} className="stat-card anim-fade-up">
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tab bar ── */}
      <div className="pill-tabs">
        {TABS.map((t) => (
          <button key={t.key} id={`admin-tab-${t.key}`}
            className={`pill-tab ${activeTab === t.key ? "active" : ""}`}
            onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ════ OVERVIEW TAB ════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
          {/* Ticket breakdown */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontWeight: 700, color: "var(--fg)", marginBottom: "1.25rem", fontSize: "0.95rem" }}>Ticket Breakdown</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              <StatBar label="Open"     value={open}     max={total || 1} color="#ef4444" />
              <StatBar label="Assigned" value={assigned} max={total || 1} color="var(--secondary)" />
              <StatBar label="Resolved" value={resolved} max={total || 1} color="var(--success)" />
            </div>
            <div style={{ marginTop: "1.25rem", padding: "0.875rem", background: "var(--surface-2)", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--fg-3)" }}>Resolution rate</span>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--success)" }}>{resoRate}%</span>
            </div>
          </div>

          {/* User breakdown */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontWeight: 700, color: "var(--fg)", marginBottom: "1.25rem", fontSize: "0.95rem" }}>User Breakdown</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              <StatBar label="Customers" value={customers} max={users.length || 1} color="var(--fg-3)" />
              <StatBar label="Agents"    value={agents}    max={users.length || 1} color="var(--secondary)" />
              <StatBar label="Admins"    value={admins}    max={users.length || 1} color="var(--primary)" />
            </div>
            <div style={{ marginTop: "1.25rem", padding: "0.875rem", background: "var(--surface-2)", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--fg-3)" }}>Total registered</span>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--primary)" }}>{users.length} users</span>
            </div>
          </div>

          {/* KB status */}
          <div className="card" style={{ padding: "1.5rem", gridColumn: "1 / -1" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h3 style={{ fontWeight: 700, color: "var(--fg)", marginBottom: "0.25rem", fontSize: "0.95rem" }}>AI Knowledge Base</h3>
                <p style={{ color: "var(--fg-3)", fontSize: "0.82rem" }}>
                  {kbStatus ? `${kbStatus.count} document chunk(s) indexed in "${kbStatus.collection}"` : "Loading…"}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.625rem", alignItems: "center" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "0.375rem",
                  padding: "0.3rem 0.875rem", borderRadius: 999,
                  background: kbStatus && kbStatus.count > 0 ? "var(--success-bg)" : "var(--surface-2)",
                  border: `1px solid ${kbStatus && kbStatus.count > 0 ? "var(--success-border)" : "var(--border)"}`,
                  fontSize: "0.75rem", fontWeight: 700,
                  color: kbStatus && kbStatus.count > 0 ? "var(--success)" : "var(--fg-4)",
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
                  {kbStatus && kbStatus.count > 0 ? "Active" : "Empty"}
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setActiveTab("kb")}>
                  Upload Docs
                </button>
              </div>
            </div>
          </div>

          {/* Recent tickets */}
          <div className="card" style={{ padding: "1.5rem", gridColumn: "1 / -1" }}>
            <h3 style={{ fontWeight: 700, color: "var(--fg)", marginBottom: "1rem", fontSize: "0.95rem" }}>
              Recent Tickets
            </h3>
            {tickets.length === 0 ? (
              <p style={{ color: "var(--fg-4)", fontSize: "0.875rem", padding: "1rem 0" }}>No tickets yet.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["ID", "Subject", "User", "Priority", "Status", "Created", "Actions"].map((h) => (
                        <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", fontSize: "0.7rem", fontWeight: 700, color: "var(--fg-4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.slice(0, 10).map((t) => (
                      <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "0.625rem 0.75rem", fontFamily: "monospace", color: "var(--fg-4)", fontWeight: 700 }}>#{t.id}</td>
                        <td style={{ padding: "0.625rem 0.75rem", color: "var(--fg)", fontWeight: 500, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject}</td>
                        <td style={{ padding: "0.625rem 0.75rem", color: "var(--fg-3)" }}>{t.user_id}</td>
                        <td style={{ padding: "0.625rem 0.75rem" }}><span className={`badge badge-${t.priority}`}>{t.priority}</span></td>
                        <td style={{ padding: "0.625rem 0.75rem" }}><span className={`badge badge-${t.status}`}>{t.status}</span></td>
                        <td style={{ padding: "0.625rem 0.75rem", color: "var(--fg-4)", fontSize: "0.78rem" }}>{fmtRelative(t.created_at)}</td>
                        <td style={{ padding: "0.625rem 0.75rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          {t.status === "assigned" && (
                            <button
                              id={`admin-unassign-${t.id}`}
                              onClick={() => handleUnassignTicket(t.id)}
                              disabled={ticketActionLoading === t.id}
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: "0.72rem", color: "var(--fg-3)", border: "1px solid var(--border)", padding: "0.2rem 0.6rem" }}>
                              {ticketActionLoading === t.id ? "…" : "Unassign"}
                            </button>
                          )}
                          {t.status === "open" && (
                            <div style={{ display: "flex", gap: "0.375rem", alignItems: "center" }}>
                              <select
                                id={`assign-select-${t.id}`}
                                defaultValue=""
                                style={{
                                  background: "var(--surface-2)", border: "1px solid var(--border)",
                                  borderRadius: "var(--radius-xs)", padding: "0.2rem 0.4rem",
                                  color: "var(--fg)", fontSize: "0.75rem", cursor: "pointer",
                                  maxWidth: "150px"
                                }}
                              >
                                <option value="" disabled>Select Agent...</option>
                                {staffUsers.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.email}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={async () => {
                                  const selectEl = document.getElementById(`assign-select-${t.id}`) as HTMLSelectElement;
                                  const agentIdVal = selectEl?.value;
                                  if (!agentIdVal) {
                                    alert("Please select a staff member first.");
                                    return;
                                  }
                                  await handleAssignTicket(t.id, parseInt(agentIdVal));
                                }}
                                disabled={ticketActionLoading === t.id}
                                className="btn btn-primary btn-sm"
                                style={{ fontSize: "0.72rem", padding: "0.2rem 0.6rem" }}
                              >
                                {ticketActionLoading === t.id ? "…" : "Assign"}
                              </button>
                            </div>
                          )}
                          <button
                            onClick={() => handleDeleteTicket(t.id, t.subject)}
                            disabled={ticketActionLoading === t.id}
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: "0.72rem", color: "var(--danger)", border: "1px solid var(--border)", padding: "0.2rem 0.6rem", marginLeft: "auto" }}>
                            {ticketActionLoading === t.id ? "…" : "Delete"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════ USERS TAB ═══════════════════════════════════════ */}
      {activeTab === "users" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Search and Filters Bar */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fg-4)" strokeWidth="2" strokeLinecap="round"
                style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" className="input" placeholder="Search by email…"
                value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                style={{ paddingLeft: "2.25rem" }} />
            </div>
            
            {/* Filter by Role */}
            <select 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                background: "var(--surface-2)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-xs)", padding: "0.5rem 0.75rem",
                color: "var(--fg)", fontSize: "0.85rem", cursor: "pointer",
                width: "auto", minWidth: 130
              }}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins Only</option>
              <option value="agent">Agents Only</option>
              <option value="customer">Customers Only</option>
            </select>
            
            {/* Filter by Status */}
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                background: "var(--surface-2)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-xs)", padding: "0.5rem 0.75rem",
                color: "var(--fg)", fontSize: "0.85rem", cursor: "pointer",
                width: "auto", minWidth: 140
              }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* User table */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                    {["#", "Email", "Role", "Status", "Joined", "Actions"].map((h) => (
                      <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.7rem", fontWeight: 700, color: "var(--fg-4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} style={{ borderBottom: "1px solid var(--border)", opacity: user.is_active ? 1 : 0.5 }}>
                      <td style={{ padding: "0.875rem 1rem", fontFamily: "monospace", color: "var(--fg-4)", fontWeight: 700, fontSize: "0.78rem" }}>
                        {user.id}
                      </td>
                      <td style={{ padding: "0.875rem 1rem", color: "var(--fg)", fontWeight: 500 }}>{user.email}</td>
                      <td style={{ padding: "0.875rem 1rem" }}>
                        {roleLoading === user.id ? (
                          <span style={{ fontSize: "0.75rem", color: "var(--fg-4)" }}>Updating…</span>
                        ) : (
                          <select value={user.role}
                            onChange={(e) => changeRole(user, e.target.value)}
                            style={{
                              background: "var(--surface-2)", border: "1px solid var(--border)",
                              borderRadius: "var(--radius-xs)", padding: "0.25rem 0.5rem",
                              color: "var(--fg)", fontSize: "0.8rem", fontFamily: "inherit", cursor: "pointer",
                            }}>
                            <option value="customer">Customer</option>
                            <option value="agent">Agent</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </td>
                      <td style={{ padding: "0.875rem 1rem" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: "0.3rem",
                          fontSize: "0.72rem", fontWeight: 700,
                          color: user.is_active ? "var(--success)" : "var(--fg-4)",
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ padding: "0.875rem 1rem", color: "var(--fg-4)", fontSize: "0.78rem" }}>
                        {fmtDateTime(user.created_at)}
                      </td>
                      <td style={{ padding: "0.875rem 1rem", display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => toggleActive(user)}
                          className={`btn btn-sm ${user.is_active ? "btn-danger" : "btn-ghost"}`}
                          disabled={activeLoading === user.id || deleteLoading === user.id}
                          style={{ fontSize: "0.75rem" }}>
                          {activeLoading === user.id ? "…" : user.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => removeUser(user)}
                          className="btn btn-sm btn-ghost"
                          disabled={activeLoading === user.id || deleteLoading === user.id}
                          style={{ fontSize: "0.75rem", color: "var(--danger)" }}>
                          {deleteLoading === user.id ? "…" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--fg-4)", textAlign: "center" }}>
            Showing {filteredUsers.length} of {users.length} users · Role changes take effect on next login
          </p>
        </div>
      )}

      {/* ════ KB TAB ══════════════════════════════════════════ */}
      {activeTab === "kb" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Upload card */}
          <div className="card" style={{ padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h3 style={{ fontWeight: 800, color: "var(--fg)", marginBottom: "0.25rem", fontSize: "1.05rem", letterSpacing: "-0.02em" }}>Upload Document</h3>
                <p style={{ color: "var(--fg-3)", fontSize: "0.85rem" }}>
                  Upload PDF, DOCX, TXT, or MD FAQ & help articles. Extracted text is split and stored in ChromaDB.
                </p>
              </div>
              <button id="kb-clear" type="button" className="btn btn-danger btn-sm" onClick={clearKb}>
                Wipe Knowledge Base
              </button>
            </div>

            {uploadMsg && (
              <div className={`alert ${uploadMsg.ok ? "alert-success" : "alert-error"}`} style={{ marginBottom: "1.25rem" }}>
                {uploadMsg.text}
              </div>
            )}

            <form onSubmit={uploadDoc} style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{ 
                  border: `2px dashed ${isDragging ? "var(--primary)" : "var(--border)"}`, 
                  borderRadius: "0.5rem", 
                  padding: "2rem", 
                  textAlign: "center", 
                  backgroundColor: isDragging ? "var(--surface-3)" : "var(--bg-2)", 
                  cursor: "pointer", 
                  transition: "all 0.2s ease-in-out" 
                }}
              >
                <label htmlFor="kb-file-upload" style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "2rem" }}>📁</span>
                  {selectedFile ? (
                    <>
                      <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--fg)" }}>
                        Selected: {selectedFile.name}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--fg-4)" }}>
                        Size: {formatSize(selectedFile.size)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--primary)" }}>
                        Drag & drop a file here, or click to browse
                      </span>
                      <span style={{ fontSize: "0.72rem", color: "var(--fg-4)" }}>
                        Supported formats: PDF, DOCX, TXT, MD
                      </span>
                    </>
                  )}
                </label>
                <input id="kb-file-upload" type="file" accept=".pdf,.docx,.txt,.md" onChange={handleFileChange} style={{ display: "none" }} />
              </div>

              {selectedFile && (
                <div className="form-group anim-fade-in">
                  <label htmlFor="kb-title" className="label">Document Title</label>
                  <input id="kb-title" type="text" className="input"
                    placeholder="e.g. Password Reset Guide"
                    value={kbTitle} onChange={(e) => setKbTitle(e.target.value)} required />
                </div>
              )}

              {selectedFile && (
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button id="kb-upload" type="submit" className="btn btn-primary" disabled={uploading}>
                    {uploading ? "Uploading & indexing…" : "Ingest Document"}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => { setSelectedFile(null); setKbTitle(""); }} disabled={uploading}>
                    Cancel
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Document library card */}
          <div className="card" style={{ padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ fontWeight: 800, color: "var(--fg)", fontSize: "1.05rem", letterSpacing: "-0.02em" }}>
                Document Library
              </h3>
              <div style={{ fontSize: "0.8rem", color: "var(--fg-3)", display: "flex", gap: "1rem" }}>
                <span>Total Documents: <strong>{kbDocs.length}</strong></span>
                <span>Total Chunks: <strong>{kbStatus?.count ?? 0}</strong></span>
              </div>
            </div>

            {loadingDocs ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--fg-3)" }}>
                <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginBottom: "0.5rem" }}>
                  <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                </div>
                Loading document library…
              </div>
            ) : kbDocs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem", border: "1px dashed var(--border)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🗄️</div>
                <div style={{ fontWeight: 700, color: "var(--fg)" }}>No documents indexed</div>
                <p style={{ color: "var(--fg-3)", fontSize: "0.82rem", marginTop: "0.25rem" }}>
                  Upload support articles or rules above to activate the AI Knowledge Base.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                      {["Type", "Title", "Filename", "Chunks", "Uploaded By", "Date", "Actions"].map((h) => (
                        <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.7rem", fontWeight: 700, color: "var(--fg-4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {kbDocs.map((doc) => {
                      const iconInfo = getFileIcon(doc.file_type);
                      return (
                        <tr key={doc.doc_id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "0.875rem 1rem" }}>
                            <span 
                              title={iconInfo.label}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 28,
                                height: 28,
                                borderRadius: "6px",
                                background: iconInfo.bg,
                                fontSize: "1rem"
                              }}
                            >
                              {iconInfo.emoji}
                            </span>
                          </td>
                          <td style={{ padding: "0.875rem 1rem", color: "var(--fg)", fontWeight: 600 }}>{doc.title}</td>
                          <td style={{ padding: "0.875rem 1rem", color: "var(--fg-3)" }}>{doc.filename}</td>
                          <td style={{ padding: "0.875rem 1rem", fontWeight: 700, color: "var(--primary)" }}>{doc.chunks} chunks</td>
                          <td style={{ padding: "0.875rem 1rem", color: "var(--fg-3)" }}>{doc.uploaded_by}</td>
                          <td style={{ padding: "0.875rem 1rem", color: "var(--fg-4)", fontSize: "0.78rem" }}>
                            {fmtDateTime(doc.uploaded_at)}
                          </td>
                          <td style={{ padding: "0.875rem 1rem" }}>
                            <button
                              onClick={() => deleteDoc(doc.doc_id, doc.title)}
                              disabled={deleteDocLoading === doc.doc_id}
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: "0.75rem", color: "var(--danger)", padding: "0.2rem 0.6rem" }}
                            >
                              {deleteDocLoading === doc.doc_id ? "Deleting…" : "Delete"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
        <div style={{ fontSize: "0.85rem", color: "var(--fg-4)" }}>Loading dashboard...</div>
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}
