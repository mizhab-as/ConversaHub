import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ConversaHub – Enterprise Conversational AI Platform",
  description:
    "ConversaHub helps enterprise teams deliver instant, intelligent customer support powered by LangGraph AI agents, semantic RAG search, and human escalation workflows.",
};

const features = [
  {
    icon: "🤖",
    title: "LangGraph AI Agent",
    desc: "A stateful, cyclic AI agent built on LangGraph that routes queries intelligently — from RAG retrieval to human handoff — in real time.",
  },
  {
    icon: "📚",
    title: "RAG Knowledge Base",
    desc: "Upload your company docs and let ChromaDB power semantic similarity search, giving the agent grounded, accurate answers.",
  },
  {
    icon: "🎫",
    title: "Smart Ticketing",
    desc: "When the AI can't resolve an issue, it automatically creates a prioritised support ticket for your human agents.",
  },
  {
    icon: "🔐",
    title: "Role-Based Access",
    desc: "Customer, Support Agent, and Admin roles with isolated data views, JWT sessions, and refresh token rotation.",
  },
  {
    icon: "📅",
    title: "Appointment Booking",
    desc: "Customers can book appointments directly through the AI chat interface without leaving the conversation.",
  },
  {
    icon: "📊",
    title: "Multi-Tenant Architecture",
    desc: "Each customer's data is strictly isolated. Agents see only their assigned queue. Admins control everything.",
  },
];

const steps = [
  { num: "01", title: "Sign Up", desc: "Create your account in seconds." },
  { num: "02", title: "Ask the AI", desc: "Chat with our intelligent support agent." },
  { num: "03", title: "Get Resolved", desc: "Issues are resolved instantly or escalated to human agents." },
];

export default function LandingPage() {
  return (
    <main className="flex flex-col min-h-screen" style={{ background: "var(--background)" }}>
      {/* ── Nav ── */}
      <nav
        style={{ background: "var(--primary)", boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}
        className="sticky top-0 z-50"
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              style={{ background: "var(--accent)", borderRadius: "8px" }}
              className="w-8 h-8 flex items-center justify-center text-sm font-bold"
            >
              <span style={{ color: "var(--accent-fg)" }}>C</span>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">ConversaHub</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn btn-ghost" style={{ color: "rgba(250,250,250,0.85)", borderColor: "rgba(250,250,250,0.25)" }}>
              Sign In
            </Link>
            <Link href="/signup" className="btn btn-accent">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        style={{
          background: "linear-gradient(135deg, var(--primary) 0%, #2d6b69 50%, var(--secondary) 100%)",
          minHeight: "88vh",
        }}
        className="flex items-center justify-center text-center px-6 py-24"
      >
        <div className="max-w-4xl animate-fade-in">
          <div
            style={{
              background: "rgba(201, 212, 176, 0.2)",
              border: "1px solid rgba(201, 212, 176, 0.4)",
              color: "var(--accent)",
              borderRadius: "999px",
              display: "inline-block",
              padding: "0.35rem 1rem",
              fontSize: "0.78rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              marginBottom: "1.5rem",
              textTransform: "uppercase",
            }}
          >
            ✦ Enterprise AI Support Platform
          </div>

          <h1
            className="text-white font-bold leading-tight"
            style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", marginBottom: "1.5rem" }}
          >
            Customer Support,{" "}
            <span style={{ color: "var(--accent)" }}>Supercharged</span>{" "}
            by AI
          </h1>

          <p
            style={{
              color: "rgba(250,250,250,0.82)",
              fontSize: "clamp(1rem, 2vw, 1.25rem)",
              maxWidth: "600px",
              margin: "0 auto 3rem",
              lineHeight: 1.7,
            }}
          >
            ConversaHub combines a stateful LangGraph AI agent, RAG knowledge retrieval,
            and smart human escalation to deliver instant, accurate support at enterprise scale.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/signup" className="btn btn-accent btn-lg">
              Start Free →
            </Link>
            <Link href="/login" className="btn btn-lg" style={{ background: "rgba(250,250,250,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.3)" }}>
              Sign In
            </Link>
          </div>

          {/* Hero metric chips */}
          <div className="flex flex-wrap gap-6 justify-center mt-16">
            {[
              { val: "16", label: "Passing Tests" },
              { val: "5", label: "API Phases Complete" },
              { val: "3", label: "User Roles" },
              { val: "∞", label: "AI Conversations" },
            ].map((m) => (
              <div
                key={m.label}
                style={{
                  background: "rgba(250,250,250,0.1)",
                  border: "1px solid rgba(250,250,250,0.2)",
                  borderRadius: "var(--radius)",
                  padding: "1rem 1.5rem",
                  minWidth: "110px",
                }}
              >
                <div className="text-white font-bold text-2xl">{m.val}</div>
                <div style={{ color: "rgba(250,250,250,0.65)", fontSize: "0.78rem" }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-6" style={{ background: "var(--muted)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="font-bold mb-4"
              style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", color: "var(--primary)" }}
            >
              Everything your support team needs
            </h2>
            <p style={{ color: "var(--muted-fg)", maxWidth: "520px", margin: "0 auto", fontSize: "1.05rem" }}>
              A complete enterprise support platform built on production-grade technology.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="card p-6 hover:shadow-lg transition-all duration-200 group">
                <div
                  style={{
                    fontSize: "2.2rem",
                    marginBottom: "1rem",
                    width: "56px",
                    height: "56px",
                    background: "var(--muted)",
                    borderRadius: "var(--radius-sm)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {f.icon}
                </div>
                <h3 className="font-semibold mb-2" style={{ color: "var(--primary)", fontSize: "1.05rem" }}>
                  {f.title}
                </h3>
                <p style={{ color: "var(--muted-fg)", fontSize: "0.88rem", lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-bold mb-14" style={{ fontSize: "clamp(1.8rem, 4vw, 2.4rem)", color: "var(--primary)" }}>
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.num} className="flex flex-col items-center gap-3">
                <div
                  className="w-14 h-14 flex items-center justify-center font-bold text-lg"
                  style={{
                    background: "var(--accent)",
                    color: "var(--accent-fg)",
                    borderRadius: "50%",
                    fontSize: "1.1rem",
                  }}
                >
                  {s.num}
                </div>
                <h3 className="font-bold" style={{ color: "var(--primary)" }}>{s.title}</h3>
                <p style={{ color: "var(--muted-fg)", fontSize: "0.88rem" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        style={{ background: "var(--primary)" }}
        className="py-20 px-6 text-center"
      >
        <div className="max-w-2xl mx-auto">
          <h2 className="font-bold mb-4 text-white" style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)" }}>
            Ready to transform your support?
          </h2>
          <p style={{ color: "rgba(250,250,250,0.75)", marginBottom: "2rem" }}>
            Join the future of AI-powered enterprise customer support.
          </p>
          <Link href="/signup" className="btn btn-accent btn-lg">
            Create Free Account →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: "var(--primary)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap gap-4 items-center justify-between">
          <span className="text-white font-semibold text-sm">© 2025 ConversaHub</span>
          <span style={{ color: "rgba(250,250,250,0.5)", fontSize: "0.8rem" }}>
            Enterprise Conversational AI Platform
          </span>
        </div>
      </footer>
    </main>
  );
}
