"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { kbApi, ticketsApi, usersApi, Ticket, KBStatus, User, fmtDateTime, fmtRelative } from "@/lib/api";

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
  const [kbContent, setKbContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // User management
  const [roleLoading,   setRoleLoading]   = useState<number | null>(null);
  const [activeLoading, setActiveLoading] = useState<number | null>(null);
  const [userSearch,    setUserSearch]    = useState("");

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
          console.error("Admin WebSocket authentication failed. Reconnection stopped. Please log out and log back in.");
          return;
        }
        reconnectTimeout = setTimeout(connectWS, 5000);
      };

      ws.onerror = (err) => {
        console.error("Admin WebSocket encountered error:", err);
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

  // ── KB upload ───────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".txt")) {
      setUploadMsg({ text: "Error: Only .txt files are supported.", ok: false });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setKbContent(text);
      setKbTitle(file.name.replace(/\.txt$/, ""));
    };
    reader.readAsText(file);
  };

  const uploadDoc = async (e: FormEvent) => {
    e.preventDefault();
    setUploading(true); setUploadMsg(null);
    try {
      const res = await kbApi.upload(kbTitle, kbContent);
      setUploadMsg({ text: `✓ "${res.title}" ingested — ${res.chunks} chunk(s) stored.`, ok: true });
      setKbTitle(""); setKbContent("");
      const kb = await kbApi.status(); setKbStatus(kb);
    } catch (err: unknown) {
      setUploadMsg({ text: err instanceof Error ? err.message : "Upload failed", ok: false });
    } finally { setUploading(false); }
  };

  const clearKb = async () => {
    if (!confirm("Clear the entire knowledge base? This cannot be undone.")) return;
    await kbApi.clear();
    setUploadMsg({ text: "✓ Knowledge base cleared.", ok: true });
    const kb = await kbApi.status(); setKbStatus(kb);
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

  const filteredUsers = users.filter((u) =>
    !userSearch || u.email.toLowerCase().includes(userSearch.toLowerCase()) || u.role.includes(userSearch.toLowerCase())
  );

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
                      {["ID", "Subject", "User", "Priority", "Status", "Created"].map((h) => (
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
          {/* Search */}
          <div style={{ position: "relative" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fg-4)" strokeWidth="2" strokeLinecap="round"
              style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" className="input" placeholder="Search by email or role…"
              value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
              style={{ paddingLeft: "2.25rem" }} />
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
                      <td style={{ padding: "0.875rem 1rem" }}>
                        <button
                          onClick={() => toggleActive(user)}
                          className={`btn btn-sm ${user.is_active ? "btn-danger" : "btn-ghost"}`}
                          disabled={activeLoading === user.id}
                          style={{ fontSize: "0.75rem" }}>
                          {activeLoading === user.id ? "…" : user.is_active ? "Deactivate" : "Activate"}
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
        <div className="card" style={{ padding: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h3 style={{ fontWeight: 800, color: "var(--fg)", marginBottom: "0.25rem", fontSize: "1.05rem", letterSpacing: "-0.02em" }}>Upload to Knowledge Base</h3>
              <p style={{ color: "var(--fg-3)", fontSize: "0.85rem" }}>
                Paste help articles or FAQs. They are chunked and indexed in ChromaDB — the AI uses them automatically.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.65rem", color: "var(--fg-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Indexed chunks</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--primary)", lineHeight: 1 }}>{kbStatus?.count ?? "—"}</div>
              </div>
            </div>
          </div>

          {uploadMsg && (
            <div className={`alert ${uploadMsg.ok ? "alert-success" : "alert-error"}`} style={{ marginBottom: "1.25rem" }}>
              {uploadMsg.text}
            </div>
          )}

          <form onSubmit={uploadDoc} style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
            <div className="form-group" style={{ border: "1px dashed var(--border)", borderRadius: "0.5rem", padding: "1.25rem", textAlign: "center", backgroundColor: "var(--bg-2)", cursor: "pointer", transition: "border-color 0.2s" }}>
              <label htmlFor="kb-file-upload" style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem" }}>
                <span style={{ fontSize: "1.25rem" }}>📁</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--primary)" }}>Upload a .txt document instead</span>
                <span style={{ fontSize: "0.72rem", color: "var(--fg-4)" }}>Select your comprehensive_policies.txt file</span>
              </label>
              <input id="kb-file-upload" type="file" accept=".txt" onChange={handleFileChange} style={{ display: "none" }} />
            </div>

            <div className="form-group">
              <label htmlFor="kb-title" className="label">Document Title</label>
              <input id="kb-title" type="text" className="input"
                placeholder="e.g. Password Reset Guide"
                value={kbTitle} onChange={(e) => setKbTitle(e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="kb-content" className="label">Document Content</label>
              <textarea id="kb-content" className="input" rows={10}
                placeholder="Paste your help article, FAQ, or support documentation here…"
                value={kbContent} onChange={(e) => setKbContent(e.target.value)} required />
              <span style={{ fontSize: "0.72rem", color: "var(--fg-4)" }}>{kbContent.length} characters</span>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button id="kb-upload" type="submit" className="btn btn-primary" disabled={uploading}>
                {uploading ? "Uploading & indexing…" : "Upload to Knowledge Base"}
              </button>
              <button id="kb-clear" type="button" className="btn btn-danger" onClick={clearKb}>
                Clear All Documents
              </button>
            </div>
          </form>
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
