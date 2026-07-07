"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
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
    <div
      className="min-h-screen flex"
      style={{ background: "linear-gradient(135deg, var(--primary) 0%, #2d6b69 60%, var(--secondary) 100%)" }}
    >
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 w-[480px] flex-shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div
              style={{ background: "var(--accent)", borderRadius: "10px" }}
              className="w-10 h-10 flex items-center justify-center font-bold"
            >
              <span style={{ color: "var(--accent-fg)", fontSize: "1.1rem" }}>C</span>
            </div>
            <span className="text-white font-bold text-xl">ConversaHub</span>
          </div>
          <h1 className="text-white font-bold leading-tight mb-4" style={{ fontSize: "2.5rem" }}>
            Welcome back
          </h1>
          <p style={{ color: "rgba(250,250,250,0.72)", lineHeight: 1.7, fontSize: "1rem" }}>
            Your AI support dashboard is waiting. Sign in to manage conversations, tickets, and your knowledge base.
          </p>
        </div>

        {/* Feature list */}
        <div className="flex flex-col gap-4">
          {[
            { icon: "✦", text: "LangGraph AI agent with real-time RAG retrieval" },
            { icon: "✦", text: "Smart ticket routing with priority escalation" },
            { icon: "✦", text: "Role-based access — Customer, Agent, Admin" },
          ].map((item) => (
            <div key={item.text} className="flex items-start gap-3">
              <span style={{ color: "var(--accent)", marginTop: "2px", fontWeight: "bold" }}>{item.icon}</span>
              <span style={{ color: "rgba(250,250,250,0.8)", fontSize: "0.9rem", lineHeight: 1.5 }}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className="card w-full animate-fade-in"
          style={{ maxWidth: "420px", padding: "2.5rem" }}
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div
              style={{ background: "var(--primary)", borderRadius: "8px" }}
              className="w-8 h-8 flex items-center justify-center text-white font-bold text-sm"
            >
              C
            </div>
            <span className="font-bold" style={{ color: "var(--primary)" }}>ConversaHub</span>
          </div>

          <h2 className="font-bold mb-1" style={{ fontSize: "1.6rem", color: "var(--primary)" }}>
            Sign in to your account
          </h2>
          <p className="mb-7" style={{ color: "var(--muted-fg)", fontSize: "0.88rem" }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" style={{ color: "var(--secondary)", fontWeight: 600 }}>
              Sign up free
            </Link>
          </p>

          {error && (
            <div
              style={{
                background: "rgba(220, 80, 60, 0.08)",
                border: "1px solid rgba(220, 80, 60, 0.25)",
                borderRadius: "var(--radius-sm)",
                padding: "0.75rem 1rem",
                color: "#b03020",
                fontSize: "0.85rem",
                marginBottom: "1.25rem",
              }}
            >
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label htmlFor="login-email" className="input-label">Email Address</label>
              <input
                id="login-email"
                type="email"
                className="input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="login-password" className="input-label">Password</label>
              <input
                id="login-password"
                type="password"
                className="input"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              id="login-submit"
              className="btn btn-primary btn-full"
              style={{ marginTop: "0.25rem", padding: "0.75rem" }}
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>

          <div className="mt-6 p-4" style={{ background: "var(--muted)", borderRadius: "var(--radius-sm)" }}>
            <p className="text-center font-semibold mb-2" style={{ fontSize: "0.78rem", color: "var(--muted-fg)" }}>
              DEMO CREDENTIALS
            </p>
            <div className="flex flex-col gap-1">
              {[
                { role: "Admin", email: "admin@demo.com" },
                { role: "Agent", email: "agent@demo.com" },
                { role: "Customer", email: "customer@demo.com" },
              ].map((d) => (
                <button
                  key={d.role}
                  type="button"
                  onClick={() => { setEmail(d.email); setPassword("password123"); }}
                  className="text-left text-xs"
                  style={{ color: "var(--secondary)", background: "none", border: "none", cursor: "pointer", padding: "2px 0" }}
                >
                  → {d.role}: {d.email}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
