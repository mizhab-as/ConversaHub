"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";

export default function LoginPage() {
  const router = useRouter();
  const { dark, toggle } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authApi.login(email, password);
      const me = await authApi.me();
      if (me.role === "admin") router.push("/dashboard/admin");
      else if (me.role === "agent") router.push("/dashboard/agent");
      else router.push("/dashboard/customer");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)" }}>
      {/* ── Left brand panel ── */}
      <div
        className="hero-gradient"
        style={{ width: 460, flexShrink: 0, display: "none", flexDirection: "column", justifyContent: "space-between", padding: "3rem" }}
        id="login-brand-panel"
      >
        <style>{`@media(min-width:900px){#login-brand-panel{display:flex}}`}</style>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            width: 44, height: 44,
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div>
            <div style={{ color: "white", fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-0.02em" }}>ConversaHub</div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.7rem" }}>Enterprise AI Platform</div>
          </div>
        </div>

        {/* Middle content */}
        <div>
          <h1 style={{ color: "white", fontWeight: 800, fontSize: "2.5rem", letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: "1.25rem" }}>
            Welcome back
          </h1>
          <p style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.7, fontSize: "0.95rem" }}>
            Your AI support workspace is ready. Manage conversations, tickets, and your knowledge base from a single dashboard.
          </p>

          {/* Feature list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem", marginTop: "2.5rem" }}>
            {[
              "LangGraph AI agent with real-time RAG retrieval",
              "Smart ticket routing with priority escalation",
              "Role-based access — Customer, Agent, Admin",
            ].map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: "rgba(201,212,176,0.25)",
                  border: "1px solid rgba(201,212,176,0.4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, marginTop: "1px",
                }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
                    <polyline points="2,6 5,9 10,3"/>
                  </svg>
                </div>
                <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.875rem", lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div style={{
          background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "var(--radius)", padding: "1.25rem",
        }}>
          <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.875rem", lineHeight: 1.65, marginBottom: "0.75rem" }}>
            "ConversaHub reduced our resolution time by 60%. The AI handles most requests instantly."
          </p>
          <div style={{ color: "var(--accent)", fontSize: "0.78rem", fontWeight: 600 }}>— Enterprise SaaS Customer</div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        {/* Top bar */}
        <div style={{ position: "absolute", top: "1.25rem", right: "1.25rem", display: "flex", gap: "0.5rem" }}>
          <button onClick={toggle} className="theme-toggle" id="login-theme-toggle">
            {dark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </div>

        <div className="card anim-fade-up" style={{ width: "100%", maxWidth: 420, padding: "2.5rem" }}>
          {/* Mobile logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "2rem" }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, var(--primary), var(--secondary))",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--fg)", letterSpacing: "-0.02em" }}>ConversaHub</span>
          </div>

          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.03em", marginBottom: "0.375rem" }}>
            Sign in to your account
          </h2>
          <p style={{ color: "var(--fg-3)", fontSize: "0.875rem", marginBottom: "2rem" }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
              Sign up free
            </Link>
          </p>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: "1.25rem" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: "1px" }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
            <div className="form-group">
              <label htmlFor="login-email" className="label">Email Address</label>
              <input id="login-email" type="email" className="input" placeholder="you@company.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="login-password" className="label">Password</label>
              <input id="login-password" type="password" className="input" placeholder="Your password"
                value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit" id="login-submit" className="btn btn-primary btn-full"
              style={{ marginTop: "0.25rem", padding: "0.75rem", fontSize: "0.9rem" }} disabled={loading}>
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>

          {/* Demo credentials */}
          <div style={{
            marginTop: "1.5rem", padding: "1rem",
            background: "var(--surface-2)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
          }}>
            <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--fg-4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.625rem" }}>
              Demo Credentials
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              {[
                { role: "Admin", email: "admin@demo.com" },
                { role: "Agent", email: "agent@demo.com" },
                { role: "Customer", email: "customer@demo.com" },
              ].map((d) => (
                <button key={d.role} type="button"
                  onClick={() => { setEmail(d.email); setPassword("password123"); }}
                  style={{
                    textAlign: "left", background: "none", border: "none", cursor: "pointer",
                    color: "var(--primary)", fontSize: "0.8rem", fontWeight: 500, padding: "0.15rem 0",
                    display: "flex", alignItems: "center", gap: "0.375rem",
                  }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--primary)", flexShrink: 0 }}/>
                  {d.role}: {d.email}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
