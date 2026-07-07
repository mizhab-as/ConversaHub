"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authApi, clearToken, User } from "@/lib/api";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles: string[];
}

const navItems: NavItem[] = [
  { href: "/dashboard/customer", label: "AI Support Chat",   icon: "💬", roles: ["customer"] },
  { href: "/dashboard/customer", label: "My Tickets",        icon: "🎫", roles: ["customer"] },
  { href: "/dashboard/agent",    label: "Ticket Queue",      icon: "📋", roles: ["agent"] },
  { href: "/dashboard/admin",    label: "Knowledge Base",    icon: "📚", roles: ["admin"] },
  { href: "/dashboard/admin",    label: "Admin Overview",    icon: "⚙️",  roles: ["admin"] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.me()
      .then(setUser)
      .catch(() => {
        clearToken();
        router.push("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = () => {
    clearToken();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-2">
            <div className="typing-dot" />
            <div className="typing-dot" />
            <div className="typing-dot" />
          </div>
          <span style={{ color: "var(--muted-fg)", fontSize: "0.85rem" }}>Loading workspace…</span>
        </div>
      </div>
    );
  }

  const userNav = navItems.filter((n) => n.roles.includes(user?.role ?? "customer"));
  const roleLabel = user?.role === "admin" ? "Admin" : user?.role === "agent" ? "Support Agent" : "Customer";

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="sidebar flex-shrink-0 overflow-y-auto">
        {/* Brand */}
        <div className="p-5 pb-2">
          <Link href="/" className="flex items-center gap-3 mb-6">
            <div
              style={{ background: "var(--accent)", borderRadius: "8px" }}
              className="w-9 h-9 flex items-center justify-center font-bold"
            >
              <span style={{ color: "var(--accent-fg)", fontSize: "1rem" }}>C</span>
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-tight">ConversaHub</div>
              <div style={{ color: "rgba(250,250,250,0.55)", fontSize: "0.68rem" }}>AI Support Platform</div>
            </div>
          </Link>

          {/* Role chip */}
          <div
            style={{
              background: "rgba(201, 212, 176, 0.15)",
              border: "1px solid rgba(201, 212, 176, 0.25)",
              borderRadius: "var(--radius-sm)",
              padding: "0.5rem 0.75rem",
              marginBottom: "1.25rem",
            }}
          >
            <div style={{ color: "var(--accent)", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>
              {roleLabel}
            </div>
            <div className="text-white text-xs truncate">{user?.email}</div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 px-1 flex-1">
          <p style={{ color: "rgba(250,250,250,0.4)", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "0.5rem 1.25rem 0.25rem" }}>
            Navigation
          </p>
          {userNav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Bottom: logout */}
        <div className="p-4 mt-auto border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <button
            id="sidebar-logout"
            onClick={handleLogout}
            className="sidebar-link w-full"
            style={{ background: "rgba(220, 80, 60, 0.12)", color: "rgba(255, 130, 110, 0.9)", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer" }}
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <header
          style={{
            background: "var(--card)",
            borderBottom: "1px solid var(--border)",
            padding: "0 2rem",
            height: "60px",
            flexShrink: 0,
          }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="font-semibold text-sm" style={{ color: "var(--primary)" }}>
              {pathname.includes("customer") && "Customer Support Chat"}
              {pathname.includes("agent")    && "Support Agent Dashboard"}
              {pathname.includes("admin")    && "Admin Control Panel"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div
              style={{
                width: "32px",
                height: "32px",
                background: "var(--primary)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "0.8rem",
                fontWeight: 700,
              }}
            >
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <span style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 500 }}>
              {user?.email}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto" style={{ background: "var(--background)", padding: "2rem" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
