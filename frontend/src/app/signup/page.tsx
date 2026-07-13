"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";

const features = [
  { label: "AI Customer Support Chat", desc: "Instant responses via stateful LangGraph agent and ChromaDB RAG." },
  { label: "Intelligent Ticket Routing", desc: "Automatic high-priority escalation to human support agents when requested." },
  { label: "Secure Multi-Tenant Isolation", desc: "Role-Based Access Control protecting customer, agent, and admin spaces." },
];

export default function SignupPage() {
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
      await authApi.signup(email, password);
      await authApi.login(email, password);
      router.push("/dashboard/customer");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed. Please try again.");
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
        id="signup-brand-panel"
      >
        <style>{`@media(min-width:900px){#signup-brand-panel{display:flex}}`}</style>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            width: 44, height: 44, background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.25)", borderRadius: 12,
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

        <div>
          <h1 style={{ color: "white", fontWeight: 800, fontSize: "2.5rem", letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: "1.25rem" }}>
            Join the future of customer support
          </h1>
          <p style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.7, fontSize: "0.95rem" }}>
            Get instant AI-powered answers, smart ticket escalation, and seamless human handoff — all in one platform.
          </p>

          {/* Feature cards preview */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "2.5rem" }}>
            {features.map((f, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: "0.875rem",
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "var(--radius-sm)", padding: "0.875rem 1rem",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: "rgba(255,255,255,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="white" strokeWidth="2" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <div style={{ color: "white", fontWeight: 600, fontSize: "0.875rem" }}>{f.label}</div>
                  <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.75rem" }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.78rem" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
        </div>
      </div>

      {/* ── Right form ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        {/* Dark mode toggle */}
        <div style={{ position: "absolute", top: "1.25rem", right: "1.25rem" }}>
          <button onClick={toggle} className="theme-toggle" id="signup-theme-toggle">
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

        <div className="card anim-fade-up" style={{ width: "100%", maxWidth: 440, padding: "2.5rem" }}>
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
            Create your account
          </h2>
          <p style={{ color: "var(--fg-3)", fontSize: "0.875rem", marginBottom: "2rem" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
          </p>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: "1.25rem" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
            <div className="form-group">
              <label htmlFor="signup-email" className="label">Email Address</label>
              <input id="signup-email" type="email" className="input" placeholder="you@company.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="signup-password" className="label">Password</label>
              <input id="signup-password" type="password" className="input" placeholder="Minimum 8 characters"
                value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
            </div>

            <button type="submit" id="signup-submit" className="btn btn-primary btn-full"
              style={{ marginTop: "0.5rem", padding: "0.75rem", fontSize: "0.9rem" }} disabled={loading}>
              {loading ? "Creating account…" : "Create Account →"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.72rem", color: "var(--fg-4)" }}>
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
