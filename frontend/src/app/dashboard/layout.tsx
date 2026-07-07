"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authApi, clearToken, User } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";

/* ── SVG Icon helpers ─────────────────────────────── */
const IconChat = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="sidebar-icon">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconTicket = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="sidebar-icon">
    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3l-4 4-4-4"/>
    <line x1="9" y1="14" x2="15" y2="14"/>
  </svg>
);
const IconQueue = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="sidebar-icon">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);
const IconKB = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="sidebar-icon">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);
const IconSettings = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="sidebar-icon">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const IconLogout = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="sidebar-icon">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconSun = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const IconMoon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
}

const navItems: NavItem[] = [
  { href: "/dashboard/customer", label: "AI Support Chat",   icon: <IconChat />,     roles: ["customer"] },
  { href: "/dashboard/customer", label: "My Tickets",        icon: <IconTicket />,   roles: ["customer"] },
  { href: "/dashboard/agent",    label: "Ticket Queue",      icon: <IconQueue />,    roles: ["agent"] },
  { href: "/dashboard/admin",    label: "Knowledge Base",    icon: <IconKB />,       roles: ["admin"] },
  { href: "/dashboard/admin",    label: "System Overview",   icon: <IconSettings />, roles: ["admin"] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { dark, toggle } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.me()
      .then(setUser)
      .catch(() => { clearToken(); router.push("/login"); })
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = () => { clearToken(); router.push("/login"); };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg, var(--primary), var(--secondary))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <div className="typing-dot"/>
            <div className="typing-dot"/>
            <div className="typing-dot"/>
          </div>
        </div>
      </div>
    );
  }

  const userNav = navItems.filter((n) => n.roles.includes(user?.role ?? "customer"));
  const roleLabel = { admin: "Administrator", agent: "Support Agent", customer: "Customer" }[user?.role ?? "customer"] ?? "User";
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "?";

  const pageTitle = pathname.includes("customer") ? "Customer Portal"
    : pathname.includes("agent") ? "Support Agent Dashboard"
    : "Admin Control Panel";

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      {/* ══ SIDEBAR ══════════════════════════════════════════ */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="sidebar-logo-wrap">
          <Link href="/" className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--fg)", letterSpacing: "-0.02em" }}>ConversaHub</div>
              <div style={{ fontSize: "0.65rem", color: "var(--fg-4)", marginTop: "1px" }}>Enterprise AI Platform</div>
            </div>
          </Link>

          {/* User card */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.625rem",
            background: "var(--surface-2)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)", padding: "0.625rem 0.75rem",
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: "linear-gradient(135deg, var(--primary), var(--secondary))",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 700, fontSize: "0.78rem",
            }}>
              {initials}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{roleLabel}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--fg-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>
                {user?.email}
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <span className="nav-section-label">Navigation</span>
          {userNav.map((item) => (
            <Link key={item.label} href={item.href}
              className={`sidebar-link ${pathname === item.href ? "active" : ""}`}>
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Bottom actions */}
        <div style={{ padding: "0.75rem", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "4px" }}>
          <button onClick={toggle} className="sidebar-link" id="sidebar-theme-toggle">
            {dark ? <IconSun /> : <IconMoon />}
            <span>{dark ? "Light Mode" : "Dark Mode"}</span>
          </button>
          <button id="sidebar-logout" onClick={handleLogout} className="sidebar-link"
            style={{ color: "var(--danger)" }}>
            <IconLogout />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ══ MAIN ══════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <header style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          height: 58, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 1.75rem",
        }}>
          <div>
            <h1 style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--fg)", letterSpacing: "-0.01em" }}>{pageTitle}</h1>
            <div style={{ fontSize: "0.72rem", color: "var(--fg-4)", marginTop: "1px" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            {/* Status dot */}
            <div style={{
              display: "flex", alignItems: "center", gap: "0.375rem",
              background: "var(--surface-2)", border: "1px solid var(--border)",
              borderRadius: 999, padding: "0.3rem 0.75rem", fontSize: "0.72rem", color: "var(--fg-3)",
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }}/>
              System Online
            </div>

            {/* Avatar */}
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: "linear-gradient(135deg, var(--primary), var(--secondary))",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 700, fontSize: "0.78rem",
              cursor: "default",
            }}>
              {initials}
            </div>
          </div>
        </header>

        {/* Page */}
        <main style={{ flex: 1, overflowY: "auto", padding: "2rem", background: "var(--bg)" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
