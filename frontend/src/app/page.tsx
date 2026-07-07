"use client";

import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>
        <path d="M12 8v4l3 3"/>
        <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.15"/>
      </svg>
    ),
    title: "LangGraph AI Agent",
    desc: "Stateful cyclic AI workflow that intelligently routes queries — from RAG retrieval to human handoff.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        <line x1="9" y1="9" x2="15" y2="9"/>
        <line x1="9" y1="13" x2="13" y2="13"/>
      </svg>
    ),
    title: "RAG Knowledge Base",
    desc: "Upload help docs; ChromaDB powers semantic search so the AI gives grounded, accurate answers.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3"/>
        <path d="M9 12h6M12 9v6"/>
      </svg>
    ),
    title: "Smart Ticketing",
    desc: "When AI can't resolve an issue it automatically creates a prioritised SQL ticket for your human agents.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    title: "Role-Based Access",
    desc: "Customer, Support Agent, and Admin roles with isolated data views and JWT refresh token rotation.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
      </svg>
    ),
    title: "Appointment Booking",
    desc: "Customers book appointments directly through the AI chat — no external integrations needed.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M3 5v6c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
        <path d="M3 11v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6"/>
      </svg>
    ),
    title: "Multi-Tenant Architecture",
    desc: "Each customer's data is strictly isolated. Agents see their queue; Admins control everything.",
  },
];

const steps = [
  { num: "01", title: "Sign Up", desc: "Create your account and choose your role — Customer, Agent, or Admin." },
  { num: "02", title: "Ask the AI", desc: "Chat with a LangGraph-powered agent that knows your company's docs." },
  { num: "03", title: "Get Resolved", desc: "Issues are resolved instantly or escalated to a human agent seamlessly." },
];

export default function LandingPage() {
  const { dark, toggle } = useTheme();

  return (
    <div style={{ background: "var(--bg)", color: "var(--fg)", minHeight: "100vh" }}>
      {/* ── Navbar ── */}
      <nav
        style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 1.5rem", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <div style={{
              width: 36, height: 36,
              background: "linear-gradient(135deg, var(--primary), var(--secondary))",
              borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(27,75,74,0.3)",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--fg)", letterSpacing: "-0.02em" }}>ConversaHub</div>
              <div style={{ fontSize: "0.65rem", color: "var(--fg-4)", marginTop: "-1px" }}>Enterprise AI Platform</div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <button onClick={toggle} className="theme-toggle" title="Toggle dark mode" id="theme-toggle">
              {dark ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
            <Link href="/login" className="btn btn-ghost btn-sm">Sign In</Link>
            <Link href="/signup" className="btn btn-primary btn-sm">Get Started →</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        className="hero-gradient"
        style={{ padding: "6rem 1.5rem 5rem", textAlign: "center" }}
      >
        <div style={{ maxWidth: 760, margin: "0 auto" }} className="anim-fade-up">
          {/* Eyebrow */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            background: "rgba(201,212,176,0.18)", border: "1px solid rgba(201,212,176,0.35)",
            borderRadius: 999, padding: "0.35rem 1rem",
            fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
            color: "var(--accent)", marginBottom: "2rem",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }}/>
            Enterprise Conversational AI
          </div>

          <h1 style={{
            fontSize: "clamp(2.8rem, 7vw, 5rem)", fontWeight: 900,
            color: "white", lineHeight: 1.05, letterSpacing: "-0.04em",
            marginBottom: "1.5rem",
          }}>
            Customer Support,<br/>
            <span style={{ color: "var(--accent)" }}>Supercharged</span> by AI
          </h1>

          <p style={{
            fontSize: "clamp(1rem, 2vw, 1.2rem)", color: "rgba(255,255,255,0.75)",
            maxWidth: 580, margin: "0 auto 2.5rem", lineHeight: 1.7,
          }}>
            A stateful LangGraph AI agent with RAG knowledge retrieval, smart ticket escalation,
            and multi-tenant role-based access — production-grade from day one.
          </p>

          <div style={{ display: "flex", gap: "0.875rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/signup" className="btn btn-accent btn-lg">Start Free →</Link>
            <Link href="/login" className="btn btn-lg" style={{
              background: "rgba(255,255,255,0.1)", color: "white",
              border: "1.5px solid rgba(255,255,255,0.25)", backdropFilter: "blur(8px)",
            }}>Sign In</Link>
          </div>

          {/* Stats row */}
          <div style={{
            display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", marginTop: "4rem",
          }} className="stagger">
            {[
              { val: "16", label: "Tests Passing" },
              { val: "7", label: "Phases Complete" },
              { val: "3", label: "User Roles" },
              { val: "∞", label: "AI Conversations" },
            ].map((m) => (
              <div key={m.label} className="anim-fade-up" style={{
                background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "var(--radius)", padding: "1.125rem 1.5rem", minWidth: 120,
              }}>
                <div style={{ color: "white", fontWeight: 800, fontSize: "1.75rem", letterSpacing: "-0.03em" }}>{m.val}</div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", marginTop: "0.2rem" }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: "6rem 1.5rem", background: "var(--bg-2)" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--secondary)", marginBottom: "0.75rem" }}>
              Platform Features
            </p>
            <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.75rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--fg)", marginBottom: "1rem" }}>
              Everything your support team needs
            </h2>
            <p style={{ color: "var(--fg-3)", maxWidth: 500, margin: "0 auto", fontSize: "1rem", lineHeight: 1.7 }}>
              Built on production-grade technology. No shortcuts, no demos — real working software.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }} className="stagger">
            {features.map((f) => (
              <div key={f.title} className="card card-hover anim-fade-up" style={{ padding: "1.75rem" }}>
                <div style={{
                  width: 48, height: 48,
                  background: "linear-gradient(135deg, rgba(27,75,74,0.1), rgba(92,138,130,0.08))",
                  border: "1px solid rgba(27,75,74,0.12)",
                  borderRadius: "var(--radius-sm)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--primary)",
                  marginBottom: "1.125rem",
                }}>
                  <div style={{ width: 22, height: 22 }}>{f.icon}</div>
                </div>
                <h3 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--fg)", marginBottom: "0.5rem", letterSpacing: "-0.01em" }}>
                  {f.title}
                </h3>
                <p style={{ color: "var(--fg-3)", fontSize: "0.875rem", lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ padding: "6rem 1.5rem", background: "var(--bg)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--secondary)", marginBottom: "0.75rem" }}>
            How It Works
          </p>
          <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--fg)", marginBottom: "3.5rem" }}>
            From signup to resolution in minutes
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2rem" }}>
            {steps.map((s, i) => (
              <div key={s.num} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                <div style={{
                  width: 56, height: 56,
                  background: i === 1 ? "var(--primary)" : "var(--surface)",
                  border: `2px solid ${i === 1 ? "var(--primary)" : "var(--border)"}`,
                  borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: "0.9rem",
                  color: i === 1 ? "white" : "var(--primary)",
                  boxShadow: i === 1 ? "0 8px 24px rgba(27,75,74,0.3)" : "none",
                }}>
                  {s.num}
                </div>
                <h3 style={{ fontWeight: 700, color: "var(--fg)", fontSize: "1rem" }}>{s.title}</h3>
                <p style={{ color: "var(--fg-3)", fontSize: "0.875rem", lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="hero-gradient" style={{ padding: "5rem 1.5rem", textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.75rem)", fontWeight: 800, color: "white", marginBottom: "1rem", letterSpacing: "-0.03em" }}>
            Ready to transform your support?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: "2.5rem", fontSize: "1rem" }}>
            Join the future of AI-powered enterprise customer support.
          </p>
          <Link href="/signup" className="btn btn-accent btn-lg">Create Free Account →</Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", padding: "1.5rem" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: "linear-gradient(135deg, var(--primary), var(--secondary))",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--fg-2)" }}>ConversaHub</span>
          </div>
          <span style={{ color: "var(--fg-4)", fontSize: "0.78rem" }}>© 2025 · Enterprise Conversational AI Platform</span>
        </div>
      </footer>
    </div>
  );
}
